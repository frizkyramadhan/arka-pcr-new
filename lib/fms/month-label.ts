/**
 * Nama bulan penuh di Excel plan dan actual.
 * Sama dengan label filter Month di list plan: January–December.
 */

export const FULL_MONTH_LABELS = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const

/** 1–12 menjadi "January" … "December". Nilai lain dikembalikan apa adanya. */
export function fullMonthLabel(month: unknown): string {
  const n = Number(month)
  if (!Number.isInteger(n) || n < 1 || n > 12) {
    return month == null || String(month).trim() === '' ? '' : String(month)
  }

  return FULL_MONTH_LABELS[n]
}

/** "March", "march", atau 3 menjadi 3. Tidak dikenali → 0. */
export function monthNumberFromLabel(label: unknown): number {
  const text = String(label ?? '').trim().toLowerCase()
  if (!text) return 0

  const named = FULL_MONTH_LABELS.findIndex(name => name.toLowerCase() === text)
  if (named > 0) return named

  const n = Number(text)

  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : 0
}
