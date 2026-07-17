/**
 * Permission list + create helpers for /api/permissions.
 */
import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { paginateListIfRequested, parseOptionalPageFromSearchParams } from '@/lib/utils/list-pagination'
import { getPermissionModuleKey } from '@/lib/utils/permission-module'
import type { PermissionCreateInput } from '@/lib/validations/permission'

export type PermissionListItem = {
  idPermission: number
  code: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  roleIds: number[]
  roles: { idRole: number; name: string }[]
}

export type PermissionListFilters = {
  q?: string
  module?: string
  role?: string
  status?: string
}

export type PermissionListQuery = PermissionListFilters & {
  sortField: 'code' | 'description' | 'isActive'
  sortOrder: 'asc' | 'desc'
  pagination?: { page: number; pageSize: number }
}

const PERMISSION_SORT_FIELDS = ['code', 'description', 'isActive'] as const

/** Role assignments shown in lists / delete guards — active roles only. */
const activeRoleWhere = { deletedAt: null, isActive: true } satisfies Prisma.RoleWhereInput

const permissionWithRolesInclude = {
  rolePermissions: {
    where: { role: activeRoleWhere },
    include: { role: true }
  }
} satisfies Prisma.PermissionInclude

type PermissionWithRoles = Prisma.PermissionGetPayload<{ include: typeof permissionWithRolesInclude }>

function mapPermission(permission: PermissionWithRoles): PermissionListItem {
  return {
    idPermission: permission.idPermission,
    code: permission.code,
    description: permission.description,
    isActive: permission.isActive,
    createdAt: permission.createdAt,
    updatedAt: permission.updatedAt,
    roleIds: permission.rolePermissions.map(item => item.idRole),
    roles: permission.rolePermissions.map(item => ({
      idRole: item.role.idRole,
      name: item.role.name
    }))
  }
}

export function parsePermissionListQuery(searchParams: URLSearchParams): PermissionListQuery {
  const sortFieldRaw = searchParams.get('column') ?? searchParams.get('sortField') ?? 'code'
  const sortField = PERMISSION_SORT_FIELDS.includes(sortFieldRaw as (typeof PERMISSION_SORT_FIELDS)[number])
    ? (sortFieldRaw as PermissionListQuery['sortField'])
    : 'code'

  const sortOrderRaw = searchParams.get('sort') ?? searchParams.get('sortOrder') ?? 'asc'
  return {
    q: searchParams.get('q')?.trim() ?? '',
    module: searchParams.get('module') ?? '',
    role: searchParams.get('role') ?? '',
    status: searchParams.get('status') ?? '',
    sortField,
    sortOrder: sortOrderRaw === 'desc' ? 'desc' : 'asc',
    pagination: parseOptionalPageFromSearchParams(searchParams)
  }
}

function comparePermissions(
  a: PermissionListItem,
  b: PermissionListItem,
  field: PermissionListQuery['sortField'],
  order: 'asc' | 'desc'
) {
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

function filterPermissions(rows: PermissionListItem[], filters: PermissionListFilters) {
  let result = rows
  const q = filters.q?.trim() ?? ''

  if (q) {
    const query = q.toLowerCase()
    result = result.filter(
      row =>
        row.code.toLowerCase().includes(query) ||
        (row.description ?? '').toLowerCase().includes(query) ||
        row.roles.some(r => r.name.toLowerCase().includes(query))
    )
  }

  if (filters.module) {
    result = result.filter(row => getPermissionModuleKey(row.code) === filters.module)
  }

  if (filters.role) {
    result = result.filter(row => row.roles.some(r => r.name === filters.role))
  }

  if (filters.status === 'active') {
    result = result.filter(row => row.isActive)
  } else if (filters.status === 'inactive') {
    result = result.filter(row => !row.isActive)
  }

  return result
}

export async function listPermissions(
  query: PermissionListQuery
): Promise<{ total: number; data: PermissionListItem[] }> {
  const permissions = await prisma.permission.findMany({
    where: { deletedAt: null },
    include: permissionWithRolesInclude,
    orderBy: { code: 'asc' }
  })

  const mapped = permissions.map(mapPermission)
  const filtered = filterPermissions(mapped, query)
  const sorted = [...filtered].sort((a, b) => comparePermissions(a, b, query.sortField, query.sortOrder))

  return paginateListIfRequested(sorted, query.pagination)
}

export class PermissionServiceError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function createPermission(input: PermissionCreateInput): Promise<PermissionListItem> {
  const duplicate = await prisma.permission.findFirst({
    where: { code: input.code, deletedAt: null }
  })

  if (duplicate) {
    throw new PermissionServiceError('Permission already exists', 409)
  }

  const permission = await prisma.permission.create({
    data: {
      code: input.code,
      description: input.description ?? null,
      isActive: input.isActive
    }
  })

  if (input.roleIds.length > 0) {
    const validRoles = await prisma.role.findMany({
      where: {
        idRole: { in: input.roleIds },
        deletedAt: null
      },
      select: { idRole: true }
    })

    await prisma.rolePermission.createMany({
      data: validRoles.map(item => ({
        idRole: item.idRole,
        idPermission: permission.idPermission
      })),
      skipDuplicates: true
    })
  }

  const created = await prisma.permission.findUniqueOrThrow({
    where: { idPermission: permission.idPermission },
    include: permissionWithRolesInclude
  })

  return mapPermission(created)
}

/** Soft-delete permission; block only when still linked to active roles. */
export async function deletePermission(idPermission: number): Promise<void> {
  const existing = await prisma.permission.findFirst({
    where: { idPermission, deletedAt: null }
  })

  if (!existing) {
    throw new PermissionServiceError('Permission not found', 404)
  }

  const activeAssignmentCount = await prisma.rolePermission.count({
    where: {
      idPermission,
      role: activeRoleWhere
    }
  })

  if (activeAssignmentCount > 0) {
    throw new PermissionServiceError('Permission is still assigned to roles', 400)
  }

  await prisma.rolePermission.deleteMany({ where: { idPermission } })

  await prisma.permission.update({
    where: { idPermission },
    data: { deletedAt: new Date(), isActive: false }
  })
}
