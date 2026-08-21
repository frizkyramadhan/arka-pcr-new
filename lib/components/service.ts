/**
 * Component list helpers for /api/components.
 */
import { prisma } from '@/lib/prisma'
import { paginateListIfRequested, parseOptionalPageFromSearchParams } from '@/lib/utils/list-pagination'

export type ComponentListItem = {
  idComp: number
  compDesc: string
  compType: string | null
  status: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export type ComponentListFilters = {
  q?: string
  search?: string
}

export type ComponentListQuery = ComponentListFilters & {
  sortField: 'idComp' | 'compDesc' | 'compType' | 'status'
  sortOrder: 'asc' | 'desc'
  pagination?: { page: number; pageSize: number }
}

const COMPONENT_SORT_FIELDS = ['idComp', 'compDesc', 'compType', 'status'] as const

export function parseComponentListQuery(searchParams: URLSearchParams): ComponentListQuery {
  const sortFieldRaw = searchParams.get('column') ?? searchParams.get('sortField') ?? 'compDesc'

  const sortField = COMPONENT_SORT_FIELDS.includes(sortFieldRaw as (typeof COMPONENT_SORT_FIELDS)[number])
    ? (sortFieldRaw as ComponentListQuery['sortField'])
    : 'compDesc'

  const sortOrderRaw = searchParams.get('sort') ?? searchParams.get('sortOrder') ?? 'asc'
  const q = searchParams.get('q')?.trim() ?? searchParams.get('search')?.trim() ?? ''
  
return {
    q,
    search: q,
    sortField,
    sortOrder: sortOrderRaw === 'desc' ? 'desc' : 'asc',
    pagination: parseOptionalPageFromSearchParams(searchParams)
  }
}

function filterComponents(rows: ComponentListItem[], filters: ComponentListFilters) {
  const query = (filters.q ?? filters.search ?? '').trim().toLowerCase()
  if (!query) return rows

  return rows.filter(
    row =>
      String(row.idComp).includes(query) ||
      row.compDesc.toLowerCase().includes(query) ||
      (row.compType ?? '').toLowerCase().includes(query) ||
      row.status.toLowerCase().includes(query)
  )
}

function compareComponents(
  a: ComponentListItem,
  b: ComponentListItem,
  field: ComponentListQuery['sortField'],
  order: 'asc' | 'desc'
) {
  const direction = order === 'asc' ? 1 : -1

  if (field === 'idComp') {
    return (a.idComp - b.idComp) * direction
  }

  const left = String(a[field] ?? '').toLowerCase()
  const right = String(b[field] ?? '').toLowerCase()

  if (left < right) return -1 * direction
  if (left > right) return 1 * direction

  return 0
}

export async function listComponents(
  query: ComponentListQuery
): Promise<{ total: number; data: ComponentListItem[] }> {
  const components = await prisma.comp.findMany({
    where: { deletedAt: null },
    orderBy: { compDesc: 'asc' }
  })

  const filtered = filterComponents(components, query)
  const sorted = [...filtered].sort((a, b) => compareComponents(a, b, query.sortField, query.sortOrder))

  return paginateListIfRequested(sorted, query.pagination)
}
