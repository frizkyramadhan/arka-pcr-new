import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { permissionUpdateSchema } from '@/lib/validations/permission'
import { deletePermission, PermissionServiceError } from '@/lib/permissions/service'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = { params: { id: string } }

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'permissions.access')
  if (forbidden) return forbidden

  const idPermission = Number(params.id)
  if (Number.isNaN(idPermission)) {
    return NextResponse.json({ error: 'Invalid permission id' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = permissionUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.permission.findFirst({
    where: { idPermission, deletedAt: null }
  })
  if (!existing) {
    return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
  }

  if (parsed.data.code && parsed.data.code !== existing.code) {
    const duplicate = await prisma.permission.findFirst({
      where: { code: parsed.data.code, deletedAt: null }
    })
    if (duplicate) {
      return NextResponse.json({ error: 'Permission already exists' }, { status: 409 })
    }
  }

  const permission = await prisma.permission.update({
    where: { idPermission },
    data: {
      code: parsed.data.code,
      description: parsed.data.description,
      isActive: parsed.data.isActive
    }
  })

  if (parsed.data.roleIds) {
    const validRoles = await prisma.role.findMany({
      where: {
        idRole: { in: parsed.data.roleIds },
        deletedAt: null
      },
      select: { idRole: true }
    })

    await prisma.rolePermission.deleteMany({ where: { idPermission } })
    if (validRoles.length > 0) {
      await prisma.rolePermission.createMany({
        data: validRoles.map(item => ({
          idRole: item.idRole,
          idPermission
        })),
        skipDuplicates: true
      })
    }
  }

  const updated = await prisma.permission.findUniqueOrThrow({
    where: { idPermission: permission.idPermission },
    include: {
      rolePermissions: {
        where: { role: { deletedAt: null, isActive: true } },
        include: { role: true }
      }
    }
  })

  return NextResponse.json({
    idPermission: updated.idPermission,
    code: updated.code,
    description: updated.description,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    roleIds: updated.rolePermissions.map(item => item.idRole),
    roles: updated.rolePermissions.map(item => ({
      idRole: item.role.idRole,
      name: item.role.name
    }))
  })
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'permissions.access')
  if (forbidden) return forbidden

  const idPermission = Number(params.id)
  if (Number.isNaN(idPermission)) {
    return NextResponse.json({ error: 'Invalid permission id' }, { status: 400 })
  }

  const existing = await prisma.permission.findFirst({
    where: { idPermission, deletedAt: null }
  })
  if (!existing) {
    return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
  }

  try {
    await deletePermission(idPermission)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof PermissionServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    throw error
  }
}
