/**
 * Struktur error import hour meter — baris, kolom, nilai, dan pesan untuk UI.
 */
import type { ZodError } from 'zod'

export type HmImportRowError = {
  row: number
  column: string
  value: string | null
  message: string
}

const ZOD_FIELD_TO_COLUMN: Record<string, string> = {
  hmUnit: 'hm_unit',
  whDay: 'wh_day',
  dateHm: 'date_hm',
  fleetUnitId: 'unit_no',
  fleetEquipmentId: 'unit_no'
}

export function formatImportCellValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)

  return String(value)
}

export function hmImportError(
  row: number,
  column: string,
  value: unknown,
  message: string
): HmImportRowError {
  return {
    row,
    column,
    value: formatImportCellValue(value),
    message
  }
}

export function hmImportErrorsFromZod(
  row: number,
  values: Record<string, unknown>,
  error: ZodError
): HmImportRowError[] {
  return error.issues.map(issue => {
    const field = String(issue.path[0] ?? 'data')
    const column = ZOD_FIELD_TO_COLUMN[field] ?? field

    return hmImportError(row, column, values[field] ?? values[column], issue.message)
  })
}
