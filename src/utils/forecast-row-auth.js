/**
 * OPEN + BA belum disubmit (PENDING/REJECTED) — selaras dengan canDeleteForecast di server.
 */
export function canDeleteForecastRow(row) {
  if (!row || row.status !== 'OPEN') return false
  const ba = row.baPcrStatus ?? 'PENDING'

  return ba === 'PENDING' || ba === 'REJECTED'
}

/**
 * Client-side check: boleh proceed forecast → replacement (Planner PF atau pengaju BA).
 */
export function canConvertForecastRow(row, userId, can) {
  if (!row || row.status !== 'OPEN' || row.baPcrStatus !== 'APPROVED' || row.convertedAt) return false
  if (can('system.admin')) return true
  if (can('forecasts.submit')) return true

  const uid = Number(userId)
  if (Number.isFinite(uid) && row.submittedBy != null && Number(row.submittedBy) === uid) return true

  return false
}
