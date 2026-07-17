/**
 * Plan period helpers — UI month/year input, DB stores YYYY-MM-01.
 */
import { toIsoDateOnly } from 'src/utils/date-format'

/** `YYYY-MM` for <input type="month"> from planPeriod date. */
export function monthInputFromPlanPeriod(planPeriod) {
  const iso = toIsoDateOnly(planPeriod)
  if (!iso) return ''

  return iso.slice(0, 7)
}

/** First day of month for API / Prisma Date column. */
export function planPeriodFromMonthInput(monthValue) {
  if (!monthValue || typeof monthValue !== 'string') return null
  if (!/^\d{4}-\d{2}$/.test(monthValue)) return null

  return `${monthValue}-01`
}

export function deriveQuarterFromMonthInput(monthValue) {
  if (!monthValue || !/^\d{4}-\d{2}$/.test(monthValue)) return 'Q1'

  const month = Number(monthValue.split('-')[1])
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'

  return 'Q4'
}

/** Parse price from form string — preserves 0, returns null when empty/invalid. */
export function parsePriceComponentInput(value) {
  if (value === '' || value === null || value === undefined) return undefined

  const num = Number(value)

  return Number.isFinite(num) && num >= 0 ? num : undefined
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Display plan period as "Jul 2026" (month + year only). */
export function formatPlanPeriodMonthYear(planPeriod) {
  const iso = toIsoDateOnly(planPeriod)
  if (!iso) return '—'

  const [, year, month] = iso.match(/^(\d{4})-(\d{2})/) ?? []

  return `${MONTHS[Number(month) - 1]} ${year}`
}

/** Year part of plan period (e.g. 2026). */
export function formatPlanPeriodYear(planPeriod) {
  const iso = toIsoDateOnly(planPeriod)
  if (!iso) return '—'

  return iso.slice(0, 4)
}

/** Month number 1–12 from plan period. */
export function formatPlanPeriodMonthNumber(planPeriod) {
  const iso = toIsoDateOnly(planPeriod)
  if (!iso) return '—'

  return String(Number(iso.slice(5, 7)))
}
