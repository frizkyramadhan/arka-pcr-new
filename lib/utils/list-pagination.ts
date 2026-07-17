/**
 * Shared server-side list pagination for DataGrid + Prisma APIs.
 */
export type SortOrder = 'asc' | 'desc'

export type ListPaginationInput = {
  page: number
  pageSize: number
  sortField?: string | null
  sortOrder?: SortOrder | null
}

export type PaginatedResult<T> = {
  rows: T[]
  total: number
}

export const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

export function parseListPagination(searchParams: URLSearchParams): ListPaginationInput {
  const pageRaw = Number(searchParams.get('page') ?? '0')
  const pageSizeRaw = Number(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE))
  const sortOrderRaw = searchParams.get('sortOrder')

  const page = Number.isFinite(pageRaw) && pageRaw >= 0 ? Math.floor(pageRaw) : 0
  const pageSize = Number.isFinite(pageSizeRaw)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSizeRaw)))
    : DEFAULT_PAGE_SIZE

  const sortOrder: SortOrder | null = sortOrderRaw === 'asc' || sortOrderRaw === 'desc' ? sortOrderRaw : null

  return {
    page,
    pageSize,
    sortField: searchParams.get('sortField'),
    sortOrder
  }
}

export function paginationSkipTake(input: ListPaginationInput): { skip: number; take: number } {
  return {
    skip: input.page * input.pageSize,
    take: input.pageSize
  }
}

/** Map DataGrid sort field to Prisma orderBy; unknown fields use fallback. */
export function resolvePrismaOrderBy<T extends Record<string, unknown>>(
  input: ListPaginationInput,
  fieldMap: Record<string, T>,
  fallback: T
): T {
  const field = input.sortField?.trim()
  if (!field || !fieldMap[field]) return fallback

  const direction = input.sortOrder === 'asc' ? 'asc' : 'desc'
  const template = fieldMap[field]

  if (typeof template === 'object' && template !== null && !Array.isArray(template)) {
    const keys = Object.keys(template)
    if (keys.length === 1) {
      return { [keys[0]]: direction } as T
    }
  }

  return template
}

export async function paginatedFindMany<T>(args: {
  findMany: (opts: { skip: number; take: number; orderBy: unknown }) => Promise<T[]>
  count: () => Promise<number>
  pagination: ListPaginationInput
  orderBy: unknown
}): Promise<PaginatedResult<T>> {
  const { skip, take } = paginationSkipTake(args.pagination)
  const [rows, total] = await Promise.all([args.findMany({ skip, take, orderBy: args.orderBy }), args.count()])

  return { rows, total }
}

/** Slice a sorted/filtered in-memory list for TableServerSide `serverPagination` APIs. */
export function paginateSortedList<T>(
  items: T[],
  page = 0,
  pageSize = DEFAULT_PAGE_SIZE
): { total: number; data: T[] } {
  const safePage = Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0
  const safeSize = Number.isFinite(pageSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)))
    : DEFAULT_PAGE_SIZE
  const { skip, take } = paginationSkipTake({ page: safePage, pageSize: safeSize })

  return {
    total: items.length,
    data: items.slice(skip, skip + take)
  }
}

/** Present only when the client sends `page` and/or `pageSize` (e.g. TableServerSide serverPagination). */
export function parseOptionalPageFromSearchParams(
  searchParams: URLSearchParams
): { page: number; pageSize: number } | undefined {
  if (!searchParams.has('page') && !searchParams.has('pageSize')) {
    return undefined
  }

  const { page, pageSize } = parseListPagination(searchParams)

  return { page, pageSize }
}

export function paginateListIfRequested<T>(
  items: T[],
  pagination?: { page: number; pageSize: number }
): { total: number; data: T[] } {
  if (!pagination) {
    return { total: items.length, data: items }
  }

  return paginateSortedList(items, pagination.page, pagination.pageSize)
}
