/**
 * Client-side gate: OPEN WO needs linked forecast + fully approved BA before edit/close/etc.
 */
export function canExecuteReplacementRow(row) {
  if (row?.woStatus !== 'OPEN') return true

  if (!row?.linkedForecast) return false

  return row.linkedForecast.baFullyApproved === true
}

export function getReplacementActionBlockReason(row) {
  if (row?.woStatus !== 'OPEN') return null

  if (!row?.linkedForecast) {
    return 'Create a PCR forecast before editing or closing this work order'
  }

  if (!row.linkedForecast.baFullyApproved) {
    return `BA PCR must be fully approved (current: ${row.linkedForecast.baPcrStatus})`
  }

  return null
}
