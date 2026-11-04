/** Pure parsers for breakdown history Excel (no DB). */

export function cellText(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && value && 'text' in value) return String((value as { text: string }).text ?? '').trim()
  if (typeof value === 'object' && value && 'result' in value) return cellText((value as { result: unknown }).result)
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)

  return String(value).trim()
}

/** Normalize WO for matching: trim, drop spaces; keep digits+letters. */
export function normalizeWorkOrder(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, '')
}

/** Digits only for SAP DocNum lookup. */
export function workOrderDocNum(raw: string): number | null {
  const digits = normalizeWorkOrder(raw).replace(/\D/g, '')
  if (!digits) return null
  const num = Number(digits)
  if (!Number.isInteger(num) || num <= 0) return null

  return num
}

function fromExcelSerial(serial: number): Date | null {
  // Excel day serial (1900 date system); 1 = 1899-12-31 in JS UTC math with 25569 offset.
  if (!Number.isFinite(serial) || serial < 1) return null
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial * 86400000)
  const date = new Date(utc)


  // Prefer local wall clock for site stamps (date part + time fraction).
  const local = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  )

  return Number.isNaN(local.getTime()) ? null : local
}

/**
 * Accept ISO, Excel Date/serial, site style "19 Oct 26 14:05",
 * or day-first "19/10/2026 14:05" / "19-10-26".
 */
export function parseHistoryStamp(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Plain year like 2026 is not an Excel serial.
    if (value > 2000 && value < 2100 && Number.isInteger(value)) return null

    return fromExcelSerial(value)
  }

  // ExcelJS rich/formula number
  if (typeof value === 'object' && value && 'result' in value) {
    const nested = parseHistoryStamp((value as { result: unknown }).result)
    if (nested) return nested
  }

  const raw = cellText(value)
  if (!raw) return null

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const asDate = new Date(raw)
    if (!Number.isNaN(asDate.getTime())) return asDate
  }

  const site = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(raw)
  if (site) {
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11
    }
    const day = Number(site[1])
    const month = months[site[2].toLowerCase()]
    let year = Number(site[3])
    if (year < 100) year += 2000
    const hour = Number(site[4] ?? 0)
    const minute = Number(site[5] ?? 0)
    const second = Number(site[6] ?? 0)
    if (month == null || !day) return null
    const date = new Date(year, month, day, hour, minute, second)

    return Number.isNaN(date.getTime()) ? null : date
  }

  const dmy = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(raw)
  if (dmy) {
    const day = Number(dmy[1])
    const month = Number(dmy[2]) - 1
    let year = Number(dmy[3])
    if (year < 100) year += 2000
    const hour = Number(dmy[4] ?? 0)
    const minute = Number(dmy[5] ?? 0)
    const second = Number(dmy[6] ?? 0)
    if (month < 0 || month > 11 || day < 1 || day > 31) return null
    const date = new Date(year, month, day, hour, minute, second)

    return Number.isNaN(date.getTime()) ? null : date
  }

  // Numeric string that looks like Excel serial (e.g. "44984.586")
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw)
    if (serial >= 20000 && serial < 80000) return fromExcelSerial(serial)
  }

  const asDate = new Date(raw)
  if (!Number.isNaN(asDate.getTime())) return asDate

  return null
}
