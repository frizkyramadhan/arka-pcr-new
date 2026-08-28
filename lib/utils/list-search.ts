/**
 * Parse text search from list API query params (`search` or `q`).
 */
export function parseListSearch(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get('search')?.trim() ?? searchParams.get('q')?.trim() ?? ''

  return raw || null
}

/**
 * Append an OR search clause to a Prisma where input via AND.
 */
export function appendSearchWhere<T extends { AND?: T['AND'] }>(
  where: T,
  search: string | null | undefined,
  orClause: Record<string, unknown>[]
): T {
  if (!search || orClause.length === 0) return where

  const searchClause = { OR: orClause }
  const existingAnd = where.AND

  if (!existingAnd) {
    return { ...where, AND: [searchClause] }
  }

  const andList = Array.isArray(existingAnd) ? existingAnd : [existingAnd]

  return { ...where, AND: [...andList, searchClause] }
}

export function normalizeSearchText(search: string | null | undefined): string {
  return search?.trim().toLowerCase() ?? ''
}

/** True when any value contains the normalized search substring. */
export function rowMatchesTextSearch(
  values: unknown[],
  search: string | null | undefined
): boolean {
  const q = normalizeSearchText(search)
  if (!q) return true

  return values.some(value => {
    if (value == null || value === '') return false

    return String(value).toLowerCase().includes(q)
  })
}
