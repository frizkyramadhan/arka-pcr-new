/**
 * Format tanggal tampilan — 01 Jan 1990 (selaras DATE MySQL / Prisma @db.Date).
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const toIsoDateOnly = value => {
  if (value == null || value === '') return null

  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const formatDisplayDate = (value, empty = '—') => {
  const iso = toIsoDateOnly(value)
  if (!iso) return empty

  const [, year, month, day] = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? []

  return `${day} ${MONTHS[Number(month) - 1]} ${year}`
}
