/**
 * Role list + create helpers for /api/roles.
 */
import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { paginateListIfRequested, parseOptionalPageFromSearchParams } from '@/lib/utils/list-pagination'
import { getPermissionModuleKey } from '@/lib/utils/permission-module'
import type { RoleCreateInput } from '@/lib/validations/role'

export type RoleListItem = {
  idRole: number
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  permissionIds: number[]
  permissions: { idPermission: number; code: string }[]
}

export type RoleListFilters = {
  q?: string
  module?: string
  status?: string
}

export type RoleListQuery = RoleListFilters & {
  sortField: 'name' | 'description' | 'isActive'
  sortOrder: 'asc' | 'desc'
  pagination?: { page: number; pageSize: number }
}

const ROLE_SORT_FIELDS = ['name', 'description', 'isActive'] as const

const roleWithPermissionsInclude = {
  rolePermissions: {
    where: { permission: { deletedAt: null } },
    include: { permission: true }
  }
} satisfies Prisma.RoleInclude

type RoleWithPermissions = Prisma.RoleGetPayload<{ include: typeof roleWithPermissionsInclude }>

function mapRole(role: RoleWithPermissions): RoleListItem {
  return {
    idRole: role.idRole,
    name: role.name,
    description: role.description,
    isActive: role.isActive,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissionIds: role.rolePermissions.map(item => item.idPermission),
    permissions: role.rolePermissions.map(item => ({
      idPermission: item.permission.idPermission,
      code: item.permission.code
    }))
  }
}

export function parseRoleListQuery(searchParams: URLSearchParams): RoleListQuery {
  const sortFieldRaw = searchParams.get('column') ?? searchParams.get('sortField') ?? 'name'

  const sortField = ROLE_SORT_FIELDS.includes(sortFieldRaw as (typeof ROLE_SORT_FIELDS)[number])
    ? (sortFieldRaw as RoleListQuery['sortField'])
    : 'name'

  const sortOrderRaw = searchParams.get('sort') ?? searchParams.get('sortOrder') ?? 'asc'
  
return {
    q: searchParams.get('q')?.trim() ?? '',
    module: searchParams.get('module') ?? '',
    status: searchParams.get('status') ?? '',
    sortField,
    sortOrder: sortOrderRaw === 'desc' ? 'desc' : 'asc',
    pagination: parseOptionalPageFromSearchParams(searchParams)
  }
}

function compareRoles(a: RoleListItem, b: RoleListItem, field: RoleListQuery['sortField'], order: 'asc' | 'desc') {
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

function filterRoles(rows: RoleListItem[], filters: RoleListFilters) {
  let result = rows
  const q = filters.q?.trim() ?? ''

  if (q) {
    const query = q.toLowerCase()
    result = result.filter(
      row =>
        row.name.toLowerCase().includes(query) ||
        (row.description ?? '').toLowerCase().includes(query) ||
        row.permissions.some(p => p.code.toLowerCase().includes(query))
    )
  }

  if (filters.module) {
    result = result.filter(row =>
      row.permissions.some(p => getPermissionModuleKey(p.code) === filters.module)
    )
  }

  if (filters.status === 'active') {
    result = result.filter(row => row.isActive)
  } else if (filters.status === 'inactive') {
    result = result.filter(row => !row.isActive)
  }

  return result
}

export async function listRoles(query: RoleListQuery): Promise<{ total: number; data: RoleListItem[] }> {
  const roles = await prisma.role.findMany({
    where: { deletedAt: null },
    include: roleWithPermissionsInclude,
    orderBy: { name: 'asc' }
  })

  const mapped = roles.map(mapRole)
  const filtered = filterRoles(mapped, query)
  const sorted = [...filtered].sort((a, b) => compareRoles(a, b, query.sortField, query.sortOrder))

  return paginateListIfRequested(sorted, query.pagination)
}

export class RoleServiceError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function createRole(input: RoleCreateInput): Promise<RoleListItem> {
  const duplicate = await prisma.role.findFirst({
    where: { name: input.name, deletedAt: null }
  })

  if (duplicate) {
    throw new RoleServiceError('Role already exists', 409)
  }

  const role = await prisma.role.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      isActive: input.isActive
    }
  })

  if (input.permissionIds.length > 0) {
    const validPermissions = await prisma.permission.findMany({
      where: {
        idPermission: { in: input.permissionIds },
        deletedAt: null
      },
      select: { idPermission: true }
    })

    await prisma.rolePermission.createMany({
      data: validPermissions.map(item => ({
        idRole: role.idRole,
        idPermission: item.idPermission
      })),
      skipDuplicates: true
    })
  }

  const created = await prisma.role.findUniqueOrThrow({
    where: { idRole: role.idRole },
    include: roleWithPermissionsInclude
  })

  return mapRole(created)
}
