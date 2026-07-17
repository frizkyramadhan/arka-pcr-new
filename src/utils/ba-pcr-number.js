/**
 * Client mirror of BA PCR number formatting (preview in submit dialog).
 * {sequenceNo}/PLT-{projectCode}/PCR/{romanMonth}/{year}
 */
const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export function romanMonthFromDate(date = new Date()) {
  return ROMAN_MONTHS[date.getMonth()] ?? 'I'
}

export function formatBaPcrNumber(sequence, projectCode, date = new Date()) {
  const year = date.getFullYear()
  const roman = romanMonthFromDate(date)
  const seq = String(sequence).padStart(3, '0')

  return `${seq}/PLT-${projectCode}/PCR/${roman}/${year}`
}

export function formatSequencePlaceholder(sequence) {
  if (!Number.isFinite(sequence) || sequence < 1) return ''

  return String(sequence).padStart(3, '0')
}
