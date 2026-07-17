/**
 * Cannibal list grid — format pair fields (unit, PN, component) from list API rows.
 */

/** Gabung nilai unik dari semua pair; tampilkan koma jika lebih dari satu. */
export function formatCannibalPairField(pairs, side, field) {
  if (!pairs?.length) return '—'

  const values = pairs
    .map(pair => pair?.[side]?.[field])
    .filter(value => value != null && String(value).trim() !== '')

  const unique = [...new Set(values.map(value => String(value).trim()))]
  if (!unique.length) return '—'
  if (unique.length === 1) return unique[0]

  return unique.join(', ')
}

/** Status logistic statement untuk ikon di grid. */
export function getLogisticStatementState(row) {
  if (row?.statementConfirmedBy) return 'confirmed'
  if (row?.statusBa === 'PENDING_LOGISTICS') return 'pending'

  return 'not_started'
}
