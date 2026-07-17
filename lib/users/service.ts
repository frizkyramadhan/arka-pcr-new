/**
 * User CRUD + list helpers for /api/users.
 * Maps Prisma user rows to API payloads with RBAC (roles, permissions, project scope).
 */
import bcrypt from 'bcryptjs'
import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getUserRolesAndPermissions } from '@/lib/rbac/defaults'
import { getUserProjectCodes, normalizeProjectCodes, syncUserProjects } from '@/lib/rbac/user-projects'
import { isEmailTaken, normalizeEmailInput } from '@/lib/user-email'
import { paginateListIfRequested, parseOptionalPageFromSearchParams } from '@/lib/utils/list-pagination'
import type { UserCreateInput } from '@/lib/validations/user'

/** Fields exposed on user API responses (password never included). */
export type UserCore = {
  idUser: number
  username: string
  email: string | null
  fullName: string | null
  isActive: boolean
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
}

export type SanitizedUser = UserCore & {
  projectCodes: string[]
  roles: string[]
}

export type UserRoleDetail = {
  idRole: number
  name: string
  description: string | null
}

export type UserListItem = SanitizedUser & {
  roleIds: number[]
  roleDetails: UserRoleDetail[]
  permissions: string[]
}

export type UserListFilters = {
  q?: string
  role?: string
  project?: string
  status?: string
}

export type UserListQuery = UserListFilters & {
  sortField: 'username' | 'fullName' | 'email' | 'isActive'
  sortOrder: 'asc' | 'desc'
  pagination?: { page: number; pageSize: number }
}

const USER_SORT_FIELDS = ['username', 'fullName', 'email', 'isActive'] as const

const userWithRolesInclude = {
  userRoles: {
    where: { role: { deletedAt: null, isActive: true } },
    include: {
      role: {
        select: {
          idRole: true,
          name: true,
          description: true
        }
      }
    },
    orderBy: { role: { name: 'asc' } }
  }
} satisfies Prisma.UserInclude

type UserWithRoles = Prisma.UserGetPayload<{ include: typeof userWithRolesInclude }>

/** Strip password and attach project codes + role names for API clients. */
export function sanitizeUser(user: UserCore, projectCodes: string[], roleNames: string[]): SanitizedUser {
  return {
    idUser: user.idUser,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    projectCodes,
    roles: roleNames,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}

/** Parse DataGrid server-side query params (TableServerSide sends q, sort, column). */
export function parseUserListQuery(searchParams: URLSearchParams): UserListQuery {
  const sortFieldRaw = searchParams.get('column') ?? searchParams.get('sortField') ?? 'username'
  const sortField = USER_SORT_FIELDS.includes(sortFieldRaw as (typeof USER_SORT_FIELDS)[number])
    ? (sortFieldRaw as UserListQuery['sortField'])
    : 'username'

  const sortOrderRaw = searchParams.get('sort') ?? searchParams.get('sortOrder') ?? 'asc'
  return {
    q: searchParams.get('q')?.trim() ?? '',
    role: searchParams.get('role') ?? '',
    project: searchParams.get('project') ?? '',
    status: searchParams.get('status') ?? '',
    sortField,
    sortOrder: sortOrderRaw === 'desc' ? 'desc' : 'asc',
    pagination: parseOptionalPageFromSearchParams(searchParams)
  }
}

function compareUsers(a: UserListItem, b: UserListItem, field: UserListQuery['sortField'], order: 'asc' | 'desc') {
  const direction = order === 'asc' ? 1 : -1

  if (field === 'isActive') {
    return (Number(a.isActive) - Number(b.isActive)) * direction
  }

  const left = String(a[field] ?? '').toLowerCase()
  const right = String(b[field] ?? '').toLowerCase()

  if (left < right) return -1 * direction
  if (left > right) return 1 * direction

  return 0
}

function filterUsers(rows: UserListItem[], filters: UserListFilters) {
  let result = rows
  const q = filters.q?.trim() ?? ''

  if (q) {
    const query = q.toLowerCase()
    result = result.filter(
      row =>
        row.username.toLowerCase().includes(query) ||
        (row.fullName ?? '').toLowerCase().includes(query) ||
        (row.email ?? '').toLowerCase().includes(query) ||
        row.roles.some(role => role.toLowerCase().includes(query)) ||
        row.projectCodes.some(code => code.toLowerCase().includes(query))
    )
  }

  if (filters.role) {
    result = result.filter(row => row.roles.includes(filters.role!))
  }

  if (filters.project) {
    result = result.filter(row => row.projectCodes.includes(filters.project!))
  }

  if (filters.status === 'active') {
    result = result.filter(row => row.isActive)
  } else if (filters.status === 'inactive') {
    result = result.filter(row => !row.isActive)
  }

  return result
}

function mapAssignedRoles(user: UserWithRoles): { roleDetails: UserRoleDetail[]; roleNames: string[] } {
  const roleDetails = user.userRoles.map(item => item.role)

  return {
    roleDetails,
    roleNames: roleDetails.map(role => role.name)
  }
}

/** Enrich one user row with project scope, roles, and effective permissions. */
async function mapUserWithRbac(user: UserWithRoles): Promise<UserListItem> {
  const assigned = mapAssignedRoles(user)
  const roleInfo = await getUserRolesAndPermissions(user.idUser)
  const projectCodes = await getUserProjectCodes(user.idUser)

  return {
    ...sanitizeUser(user, projectCodes, assigned.roleNames),
    roleIds: assigned.roleDetails.map(role => role.idRole),
    roleDetails: assigned.roleDetails,
    permissions: roleInfo.permissions
  }
}

/** List users with server-side search, filter, and sort for DataGrid. */
export async function listUsers(query: UserListQuery): Promise<{ total: number; data: UserListItem[] }> {
  const users = await prisma.user.findMany({
    include: userWithRolesInclude,
    orderBy: { username: 'asc' }
  })

  const mapped = await Promise.all(users.map(mapUserWithRbac))
  const filtered = filterUsers(mapped, query)
  const sorted = [...filtered].sort((a, b) => compareUsers(a, b, query.sortField, query.sortOrder))

  return paginateListIfRequested(sorted, query.pagination)
}

/** Create user account with hashed password, project scope, and role assignments. */
export async function createUser(input: UserCreateInput): Promise<UserListItem> {
  const existing = await prisma.user.findUnique({
    where: { username: input.username }
  })

  if (existing) {
    throw new UserServiceError('Username already exists', 409)
  }

  const email = normalizeEmailInput(input.email)

  if (email && (await isEmailTaken(email))) {
    throw new UserServiceError('Email already exists', 409)
  }

  const passwordHash = await bcrypt.hash(input.password, 10)
  const projectCodes = normalizeProjectCodes(input.projectCodes ?? [])

  const user = await prisma.user.create({
    data: {
      username: input.username,
      email,
      password: passwordHash,
      fullName: input.fullName ?? null,
      isActive: input.isActive
    }
  })

  await syncUserProjects(user.idUser, projectCodes)

  if (input.roleIds.length > 0) {
    const validRoles = await prisma.role.findMany({
      where: { idRole: { in: input.roleIds }, deletedAt: null },
      select: { idRole: true }
    })

    await prisma.userRole.createMany({
      data: validRoles.map(role => ({
        idUser: user.idUser,
        idRole: role.idRole
      })),
      skipDuplicates: true
    })
  }

  const created = await prisma.user.findUniqueOrThrow({
    where: { idUser: user.idUser },
    include: userWithRolesInclude
  })

  return mapUserWithRbac(created)
}

export class UserServiceError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
