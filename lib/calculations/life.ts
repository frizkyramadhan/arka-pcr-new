/** Matches MySQL `DECIMAL(6, 2)` on `life_percent` columns. */
export const LIFE_PERCENT_DB_MAX = 9999.99
export const LIFE_PERCENT_DB_MIN = 0

export interface LifeCalcInput {
  hmNow: number
  hmLastReplacement: number
  compHour: number
  policy: number
}

export interface LifeCalcResult {
  currentLife: number
  lifePercent: number
  remainingHours: number
  isCritical: boolean
  isOverdue: boolean
}

export function normalizeLifePercentForDb(value: number): number {
  if (!Number.isFinite(value)) return LIFE_PERCENT_DB_MIN

  const rounded = Math.round(value * 100) / 100

  return Math.min(LIFE_PERCENT_DB_MAX, Math.max(LIFE_PERCENT_DB_MIN, rounded))
}

export function calculateComponentLife(input: LifeCalcInput): LifeCalcResult {
  const policy = input.policy > 0 ? input.policy : 1
  const hmDelta = input.hmNow - input.hmLastReplacement
  const currentLife = hmDelta + input.compHour
  const lifePercent = (currentLife / policy) * 100
  const remainingHours = policy - currentLife

  return {
    currentLife,
    lifePercent: normalizeLifePercentForDb(lifePercent),
    remainingHours,
    isCritical: lifePercent >= 85,
    isOverdue: lifePercent >= 100
  }
}

export function calculateForecastDays(
  remainingHours: number,
  hmReadings: Array<{ readingDate: Date; reading: number }>
): number | null {
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const recent = hmReadings
    .filter(reading => new Date(reading.readingDate) >= threeMonthsAgo)
    .sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime())

  if (recent.length < 2) return null

  const newest = recent[0]
  const oldest = recent[recent.length - 1]

  const daysDiff =
    (new Date(newest.readingDate).getTime() - new Date(oldest.readingDate).getTime()) / (1000 * 60 * 60 * 24)
  const hmDiff = newest.reading - oldest.reading

  if (daysDiff <= 0) return null

  const avgHmPerDay = hmDiff / daysDiff
  if (avgHmPerDay <= 0) return null

  return Math.round(remainingHours / avgHmPerDay)
}

export function deriveQuarter(date: Date): string {
  const month = date.getMonth() + 1
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'

  return 'Q4'
}

export function isCriticalSosRating(rating: string | null | undefined): boolean {
  if (!rating) return false
  const normalized = rating.trim().toUpperCase()

  return (
    normalized === 'C' ||
    normalized === 'D' ||
    normalized === 'X' ||
    normalized === 'URGENT'
  )
}
