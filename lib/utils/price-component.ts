/**
 * Parse forecast price (IDR, whole rupiah) from form/API input.
 */
const idrFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

export function parsePriceComponentValue(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined

  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : undefined
  }

  const trimmed = String(value).trim().replace(/\s/g, '')
  if (!trimmed) return undefined

  if (/^[\d.,]+$/.test(trimmed)) {
    const digitsOnly = trimmed.replace(/[^\d]/g, '')
    if (!digitsOnly) return undefined
    const num = Number(digitsOnly)

    return Number.isFinite(num) && num >= 0 ? num : undefined
  }

  const num = Number(trimmed)

  return Number.isFinite(num) && num >= 0 ? num : undefined
}

/** Display stored/API price with Indonesian thousand separators. */
export function formatPriceComponentDisplay(value: unknown): string {
  const parsed = parsePriceComponentValue(value)
  if (parsed === undefined) return ''

  return idrFormatter.format(parsed)
}

/** Format while typing or pasting — strips non-digits then applies id-ID grouping. */
export function formatPriceComponentInputValue(raw: unknown): string {
  if (raw === '' || raw === null || raw === undefined) return ''

  const digits = String(raw).replace(/[^\d]/g, '')
  if (!digits) return ''

  const num = Number(digits)
  if (!Number.isFinite(num) || num < 0) return ''

  return idrFormatter.format(num)
}
