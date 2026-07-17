/**
 * Kolom & parser Excel hour meter — dipakai bersama export, template, dan import.
 */
import type ExcelJS from 'exceljs'

export const HM_EXCEL_COLUMNS = [
  { header: 'id_hm', key: 'id_hm', width: 10 },
  { header: 'unit_no', key: 'unit_no', width: 16 },
  { header: 'description', key: 'description', width: 24 },
  { header: 'project_code', key: 'project_code', width: 12 },
  { header: 'hm_unit', key: 'hm_unit', width: 14 },
  { header: 'wh_day', key: 'wh_day', width: 10 },
  { header: 'date_hm', key: 'date_hm', width: 14 }
] as const

/** Format tampilan default kolom date_hm di Excel (sel tetap bertipe tanggal). */
export const HM_DATE_EXCEL_NUM_FMT = 'yyyy-mm-dd'

export const HM_IMPORT_HEADER_ALIASES = {
  idHm: ['id_hm', 'id hm'],
  unitNo: ['unit_no', 'unit no', 'unit'],
  description: ['description', 'equipment_description'],
  projectCode: ['project_code', 'project'],
  hmUnit: ['hm_unit', 'hm unit', 'hour_meter'],
  whDay: ['wh_day', 'wh day', 'working_hours', 'wh/day'],
  dateHm: ['date_hm', 'date hm', 'date']
} as const

export type ExcelDateParseResult =
  | { ok: true; date: Date }
  | { ok: false; message: string }

export function parseHeaderIndex(headers: string[], candidates: readonly string[]) {
  return headers.findIndex(header => candidates.includes(header))
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false
  if (month < 1 || month > 12 || day < 1 || day > 31) return false

  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function utcDateFromParts(year: number, month: number, day: number): Date | null {
  if (!isValidCalendarDate(year, month, day)) return null

  return new Date(Date.UTC(year, month - 1, day))
}

function sameUtcDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

function invalidDateMessage(displayValue: string): string {
  return `Tanggal "${displayValue}" tidak sesuai — tanggal tersebut tidak ada di kalender. Gunakan format yyyy-mm-dd (contoh: 2026-04-30).`
}

function parseIsoDateText(text: string): ExcelDateParseResult {
  const match = text.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return { ok: false, message: invalidDateMessage(text) }
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = utcDateFromParts(year, month, day)

  if (!date) {
    return { ok: false, message: invalidDateMessage(text) }
  }

  return { ok: true, date }
}

function parseDelimitedDateText(text: string): ExcelDateParseResult {
  const match = text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (!match) {
    return { ok: false, message: invalidDateMessage(text) }
  }

  const first = Number(match[1])
  const second = Number(match[2])
  const year = Number(match[3])

  const candidates: Array<{ month: number; day: number; label: string }> = []

  if (first <= 12) {
    candidates.push({ month: first, day: second, label: 'mm/dd/yyyy' })
  }
  if (second <= 12 && first !== second) {
    candidates.push({ month: second, day: first, label: 'dd/mm/yyyy' })
  }
  if (second <= 12 && first === second) {
    candidates.push({ month: second, day: first, label: 'dd/mm/yyyy' })
  }

  const valid = candidates.filter(candidate => isValidCalendarDate(year, candidate.month, candidate.day))

  if (valid.length === 0) {
    return { ok: false, message: invalidDateMessage(text) }
  }

  // Tanggal ambigu (mis. 01/02/2026) — prioritaskan dd/mm/yyyy (locale Indonesia).
  const preferred =
    valid.find(candidate => candidate.label === 'dd/mm/yyyy') ??
    valid.find(candidate => candidate.label === 'mm/dd/yyyy') ??
    valid[0]

  const date = utcDateFromParts(year, preferred.month, preferred.day)
  if (!date) {
    return { ok: false, message: invalidDateMessage(text) }
  }

  return { ok: true, date }
}

/** Teks tanggal yang user ketik di Excel (bukan Date.toString() dari ExcelJS). */
function isRecognizedDateText(text: string): boolean {
  const trimmed = text.trim()

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(trimmed)
  )
}

function parseDateTextStrict(text: string): ExcelDateParseResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, message: 'Tanggal wajib diisi.' }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return parseIsoDateText(trimmed)
  }

  if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$/.test(trimmed)) {
    return parseDelimitedDateText(trimmed)
  }

  return { ok: false, message: invalidDateMessage(trimmed) }
}

/** Komponen tanggal dari sel Excel — pakai local date (Excel menyimpan date-only lokal). */
function dateFromExcelJsDate(value: Date): Date | null {
  return utcDateFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate())
}

/** Serial Excel → Date UTC (date-only, tanpa shift timezone). */
function excelSerialToDate(serial: number): Date | null {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30))
  const date = new Date(excelEpoch.getTime() + serial * 86400000)

  if (Number.isNaN(date.getTime())) return null

  return utcDateFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

function parseExcelDateValueStrict(value: unknown): ExcelDateParseResult {
  if (value === null || value === undefined || value === '') {
    return { ok: false, message: 'Tanggal wajib diisi.' }
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return { ok: false, message: 'Tanggal tidak sesuai — nilai tanggal Excel tidak valid.' }
    }

    const date = dateFromExcelJsDate(value)
    if (!date) {
      return { ok: false, message: 'Tanggal tidak sesuai — nilai tanggal Excel tidak valid.' }
    }

    return { ok: true, date }
  }

  if (typeof value === 'number') {
    const date = excelSerialToDate(value)
    if (!date) {
      return { ok: false, message: 'Tanggal tidak sesuai — serial tanggal Excel tidak valid.' }
    }

    return { ok: true, date }
  }

  return parseDateTextStrict(String(value))
}

/**
 * Parse tanggal import — validasi ketat untuk teks tanggal yang dikenali (yyyy-mm-dd, dd/mm/yyyy).
 * ExcelJS sering mengisi cell.text dengan Date.toString(); untuk itu pakai nilai sel Date/serial.
 */
export function parseExcelDateForImport(
  value: unknown,
  formattedText?: string | null
): ExcelDateParseResult {
  const text = formattedText?.trim()
  const fromValue = parseExcelDateValueStrict(value)

  if (text) {
    if (isRecognizedDateText(text)) {
      const fromText = parseDateTextStrict(text)
      if (!fromText.ok) return fromText

      if (fromValue.ok && !sameUtcDate(fromText.date, fromValue.date)) {
        return {
          ok: false,
          message: `Tanggal "${text}" tidak sesuai dengan nilai tanggal di Excel. Periksa kembali kolom date_hm.`
        }
      }

      return fromText
    }

    if (fromValue.ok) return fromValue

    return { ok: false, message: 'Tanggal tidak sesuai — periksa kolom date_hm.' }
  }

  return fromValue
}

export function parseExcelDate(value: unknown): Date | null {
  const parsed = parseExcelDateValueStrict(value)

  return parsed.ok ? parsed.date : null
}

export function formatExcelDate(value: Date | string | null | undefined): string {
  const cellDate = toExcelDateCell(value)

  if (!cellDate) return ''

  const y = cellDate.getUTCFullYear()
  const m = String(cellDate.getUTCMonth() + 1).padStart(2, '0')
  const d = String(cellDate.getUTCDate()).padStart(2, '0')

  return `${y}-${m}-${d}`
}

/** Nilai Date untuk sel Excel (date-only UTC) — kompatibel dengan serial & format locale Excel. */
export function toExcelDateCell(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null

  const parsed = parseExcelDateValueStrict(value)

  return parsed.ok ? parsed.date : null
}

export function setupHourMeterSheet(sheet: ExcelJS.Worksheet) {
  sheet.columns = HM_EXCEL_COLUMNS.map(column => ({ ...column }))
  sheet.getRow(1).font = { bold: true }

  const dateColumnIndex = HM_EXCEL_COLUMNS.findIndex(column => column.key === 'date_hm') + 1
  if (dateColumnIndex > 0) {
    sheet.getColumn(dateColumnIndex).numFmt = HM_DATE_EXCEL_NUM_FMT
  }
}
