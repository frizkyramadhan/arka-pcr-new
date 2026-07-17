import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getUserRolesAndPermissions } from '@/lib/rbac/defaults'
import { getUserProjectCodes, normalizeProjectCodes, syncUserProjects } from '@/lib/rbac/user-projects'
import { isEmailTaken, normalizeEmailInput } from '@/lib/user-email'
import { sanitizeUser } from '@/lib/users/service'
import { userUpdateSchema } from '@/lib/validations/user'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = { params: { id: string } }

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'users.access')
  if (forbidden) return forbidden

  const idUser = Number(params.id)
  if (Number.isNaN(idUser)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { idUser },
    include: {
      userRoles: {
        where: { role: { deletedAt: null, isActive: true } },
        include: { role: { select: { idRole: true, name: true, description: true } } },
        orderBy: { role: { name: 'asc' } }
      }
    }
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const roleInfo = await getUserRolesAndPermissions(user.idUser)
  const projectCodes = await getUserProjectCodes(user.idUser)

  const roleDetails = user.userRoles.map(item => item.role)
  const roleNames = roleDetails.map(role => role.name)

  return NextResponse.json({
    ...sanitizeUser(user, projectCodes, roleNames),
    roleIds: roleDetails.map(role => role.idRole),
    roleDetails,
    permissions: roleInfo.permissions
  })
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'users.access')
  if (forbidden) return forbidden

  const idUser = Number(params.id)
  if (Number.isNaN(idUser)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = userUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { idUser } })
  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (parsed.data.username && parsed.data.username !== existing.username) {
    const duplicate = await prisma.user.findUnique({
      where: { username: parsed.data.username }
    })

    if (duplicate) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
    }
  }

  if (parsed.data.email !== undefined) {
    const email = normalizeEmailInput(parsed.data.email)

    if (email && (await isEmailTaken(email, idUser))) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }
  }

  const { password, projectCodes: projectCodesInput, roleIds, email: emailInput, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }

  if (emailInput !== undefined) {
    data.email = normalizeEmailInput(emailInput)
  }

  if (password) {
    data.password = await bcrypt.hash(password, 10)
  }

  if (projectCodesInput !== undefined) {
    await syncUserProjects(idUser, normalizeProjectCodes(projectCodesInput))
  }

  const user = await prisma.user.update({
    where: { idUser },
    data
  })

  if (roleIds) {
    const validRoles = await prisma.role.findMany({
      where: { idRole: { in: roleIds }, deletedAt: null },
      select: { idRole: true }
    })

    await prisma.userRole.deleteMany({ where: { idUser } })
    if (validRoles.length > 0) {
      await prisma.userRole.createMany({
        data: validRoles.map(role => ({
          idUser,
          idRole: role.idRole
        })),
        skipDuplicates: true
      })
    }
  }

  const roleInfo = await getUserRolesAndPermissions(user.idUser)
  const projectCodes = await getUserProjectCodes(user.idUser)

  const currentRoleIds =
    roleIds ??
    (
      await prisma.userRole.findMany({
        where: { idUser },
        select: { idRole: true }
      })
    ).map(row => row.idRole)

  return NextResponse.json({
    ...sanitizeUser(user, projectCodes, roleInfo.roleNames),
    roleIds: currentRoleIds,
    permissions: roleInfo.permissions
  })
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'users.access')
  if (forbidden) return forbidden

  const idUser = Number(params.id)
  if (Number.isNaN(idUser)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  }

  if (String(idUser) === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { idUser } })
  if (!existing) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { idUser } }),
    prisma.user.delete({ where: { idUser } })
  ])

  return NextResponse.json({ success: true })
}
