import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { roleUpdateSchema } from '@/lib/validations/role'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = { params: { id: string } }

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'roles.access')
  if (forbidden) return forbidden

  const idRole = Number(params.id)
  if (Number.isNaN(idRole)) {
    return NextResponse.json({ error: 'Invalid role id' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = roleUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.role.findFirst({ where: { idRole, deletedAt: null } })
  if (!existing) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const duplicate = await prisma.role.findFirst({
      where: { name: parsed.data.name, deletedAt: null }
    })
    if (duplicate) {
      return NextResponse.json({ error: 'Role already exists' }, { status: 409 })
    }
  }

  const role = await prisma.role.update({
    where: { idRole },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      isActive: parsed.data.isActive
    }
  })

  if (parsed.data.permissionIds) {
    const validPermissions = await prisma.permission.findMany({
      where: {
        idPermission: { in: parsed.data.permissionIds },
        deletedAt: null
      },
      select: { idPermission: true }
    })

    await prisma.rolePermission.deleteMany({ where: { idRole } })
    if (validPermissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: validPermissions.map(item => ({
          idRole,
          idPermission: item.idPermission
        })),
        skipDuplicates: true
      })
    }
  }

  const updated = await prisma.role.findUniqueOrThrow({
    where: { idRole: role.idRole },
    include: {
      rolePermissions: {
        where: { permission: { deletedAt: null } },
        include: { permission: true }
      }
    }
  })

  return NextResponse.json({
    idRole: updated.idRole,
    name: updated.name,
    description: updated.description,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    permissionIds: updated.rolePermissions.map(item => item.idPermission),
    permissions: updated.rolePermissions.map(item => ({
      idPermission: item.permission.idPermission,
      code: item.permission.code
    }))
  })
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'roles.access')
  if (forbidden) return forbidden

  const idRole = Number(params.id)
  if (Number.isNaN(idRole)) {
    return NextResponse.json({ error: 'Invalid role id' }, { status: 400 })
  }

  const existing = await prisma.role.findFirst({ where: { idRole, deletedAt: null } })
  if (!existing) {
    return NextResponse.json({ error: 'Role not found' }, { status: 404 })
  }

  const userCount = await prisma.userRole.count({ where: { idRole } })
  if (userCount > 0) {
    return NextResponse.json({ error: 'Role is still assigned to users' }, { status: 400 })
  }

  await prisma.role.update({
    where: { idRole },
    data: { deletedAt: new Date(), isActive: false }
  })

  return NextResponse.json({ success: true })
}
