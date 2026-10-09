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

/** Header Excel: trim, huruf kecil, pemisah jadi spasi. "Unit No." dan "unit_no" sama. */
export function normalizeHeaderKey(key: string): string {
  return key
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[_./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Nama lain yang sering muncul di file user.
 * Header grid ("Type", "Actual Date", "HM") dan laporan lama ("Unit No", "Date").
 */
const HEADER_ALIASES: Record<string, ActualSheetColumn> = {
  project: 'Project',
  'project id': 'Project',
  projectid: 'Project',
  unit: 'Unit',
  'unit no': 'Unit',
  unitno: 'Unit',
  'unit number': 'Unit',
  'no unit': 'Unit',
  'maintenance type': 'Maintenance Type',
  maintenancetype: 'Maintenance Type',
  type: 'Maintenance Type',
  program: 'Maintenance Type',
  'maintenance program': 'Maintenance Type',
  'plan date': 'Plan Date',
  plandate: 'Plan Date',
  'register no': 'Register No',
  registerno: 'Register No',
  register: 'Register No',
  'reg no': 'Register No',
  regno: 'Register No',
  'register number': 'Register No',
  'no register': 'Register No',
  'maintenance date': 'Maintenance Date',
  maintenancedate: 'Maintenance Date',
  'actual date': 'Maintenance Date',
  date: 'Maintenance Date',
  time: 'Time',
  'maintenance time': 'Time',
  'hour meter': 'Hour Meter',
  hourmeter: 'Hour Meter',
  hm: 'Hour Meter',
  mechanics: 'Mechanics',
  remarks: 'Remarks',
  'qc status': 'QC Status',
  qcstatus: 'QC Status',
  qc: 'QC Status',
  'actual pic': 'Actual PIC',
  pic: 'Actual PIC',
  severity: 'Severity',
  finding: 'Finding',
  description: 'Finding',
  component: 'Component',
  'component code': 'Component',
  'component name': 'Component Name',
  'sub component': 'Sub Component',
  subcomponent: 'Sub Component',
  'sub component name': 'Sub Component Name',
  damage: 'Damage',
  'damage code': 'Damage',
  'damage name': 'Damage Name',
  'finding date': 'Finding Date',
  'closed on': 'Closed On',
  'closure date': 'Closed On',
  'failure pic': 'Failure PIC'
}

/** Samakan header ke nama kolom kanonik. Nilai kanonik menang bila alias dan nama asli sama-sama terisi. */
export function normalizeActualSheetRow(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const pending: Array<{ canonical: ActualSheetColumn; value: unknown }> = []

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'row' || key === '__rowNum__') {
      out[key] = value
      continue
    }

    const canonical = HEADER_ALIASES[normalizeHeaderKey(key)]
    if (!canonical) continue
    if (normalizeHeaderKey(key) === normalizeHeaderKey(canonical)) {
      out[canonical] = value
    } else {
      pending.push({ canonical, value })
    }
  }

  for (const item of pending) {
    const current = out[item.canonical]
    if (current == null || String(current).trim() === '') out[item.canonical] = item.value
  }

  return out
}

/** Baris header sheet (0-based). Melewati judul di atas tabel bila ada. */
export function actualSheetHeaderIndex(matrix: unknown[][]): number {
  const hints = new Set([
    'unit',
    'unit no',
    'maintenance type',
    'type',
    'program',
    'plan date',
    'register no',
    'register',
    'actual date',
    'date'
  ])
  const limit = Math.min(matrix.length, 20)

  for (let index = 0; index < limit; index += 1) {
    const hits = (matrix[index] ?? []).filter(cell => hints.has(normalizeHeaderKey(String(cell ?? '')))).length
    if (hits >= 2) return index
  }

  return 0
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
