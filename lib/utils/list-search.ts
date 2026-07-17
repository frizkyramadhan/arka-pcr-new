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
