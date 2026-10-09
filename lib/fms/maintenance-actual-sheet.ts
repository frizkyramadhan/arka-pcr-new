/**
 * Kolom Excel yang sama untuk export dan import Maintenance Actual + Failure.
 * Satu baris = satu actual, atau satu temuan pada actual itu.
 * Actual tanpa temuan tetap satu baris dengan kolom temuan kosong.
 */

export const ACTUAL_SHEET_COLUMNS = [
  'Project',
  'Unit',
  'Maintenance Type',
  'Plan Date',
  'Register No',
  'Maintenance Date',
  'Time',
  'Hour Meter',
  'Mechanics',
  'Remarks',
  'QC Status',
  'Actual PIC',
  'Severity',
  'Finding',
  'Component',
  'Component Name',
  'Sub Component',
  'Sub Component Name',
  'Damage',
  'Damage Name',
  'Finding Date',
  'Closed On',
  'Failure PIC'
] as const

export type ActualSheetColumn = (typeof ACTUAL_SHEET_COLUMNS)[number]

export type ActualSheetRow = Record<ActualSheetColumn, string | number>

export function blankActualSheetRow(): ActualSheetRow {
  return {
    Project: '',
    Unit: '',
    'Maintenance Type': '',
    'Plan Date': '',
    'Register No': '',
    'Maintenance Date': '',
    Time: '',
    'Hour Meter': '',
    Mechanics: '',
    Remarks: '',
    'QC Status': '',
    'Actual PIC': '',
    Severity: '',
    Finding: '',
    Component: '',
    'Component Name': '',
    'Sub Component': '',
    'Sub Component Name': '',
    Damage: '',
    'Damage Name': '',
    'Finding Date': '',
    'Closed On': '',
    'Failure PIC': ''
  }
}

export function sheetCell(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }

  return ''
}

/** Baris punya temuan bila ada isian di kolom failure, bukan hanya actual. */
export function rowHasFinding(fields: {
  severity?: unknown
  finding?: unknown
  componentCode?: unknown
  subComponentCode?: unknown
  damageCode?: unknown
  findingDate?: unknown
  closedOn?: unknown
  failurePic?: unknown
}): boolean {
  return [
    fields.severity,
    fields.finding,
    fields.componentCode,
    fields.subComponentCode,
    fields.damageCode,
    fields.findingDate,
    fields.closedOn,
    fields.failurePic
  ].some(value => value != null && String(value).trim() !== '')
}

/**
 * Actual yang sama dikelompokkan supaya beberapa temuan tidak membuat actual kedua.
 * Unit + program + tanggal plan menang. Tanpa itu, Register No dipakai.
 */
export function sheetGroupKey(fields: {
  unitNo?: string
  program?: string
  planDateIso?: string
  registerNo?: string
}): string | null {
  const unitNo = fields.unitNo?.trim() ?? ''
  const program = fields.program?.trim() ?? ''
  const planDateIso = fields.planDateIso?.trim() ?? ''
  const registerNo = fields.registerNo?.trim() ?? ''
  if (unitNo && program && planDateIso) {
    return `plan|${unitNo.toUpperCase()}|${program.toLowerCase()}|${planDateIso}`
  }
  if (registerNo) return `reg|${registerNo.toUpperCase()}`

  return null
}

/** Jam Excel (pecahan hari) atau teks HH:mm. */
export function parseSheetTime(value: unknown): string | null {
  if (value == null || String(value).trim() === '') return null
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1) {
    const total = Math.round(value * 24 * 60)
    const hours = Math.floor(total / 60) % 24
    const minutes = total % 60

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  const text = String(value).trim()

  return text || null
}
