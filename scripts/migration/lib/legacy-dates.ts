export function parseLegacyDate(value: string | undefined | null): Date | null {
  if (!value || value.startsWith('0000')) return null
  const d = new Date(value)

  if (Number.isNaN(d.getTime())) return null
  const year = d.getFullYear()
  if (year < 1990 || year > 2100) return null

  return d
}

export function parseLegacyDateOrDefault(
  value: string | undefined | null,
  fallback = '2015-01-01'
): Date {
  return parseLegacyDate(value) ?? new Date(fallback)
}
