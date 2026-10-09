/**
 * Unduh dan baca Excel Actual + Failure. Kolom sama dengan blankActualSheetRow di server.
 */
import * as XLSX from 'xlsx'

import { actualSheetHeaderIndex, blankActualSheetRow } from '@/lib/fms/maintenance-actual-sheet'

export function downloadActualSheet(rows, filenamePrefix) {
  const sheetRows = rows.length > 0 ? rows : [blankActualSheetRow()]
  const ws = XLSX.utils.json_to_sheet(sheetRows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Actuals')
  const date = new Date()
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  XLSX.writeFile(wb, `${filenamePrefix}-${dateStr}.xlsx`)

  return rows.length
}

export function actualImportMessage(result) {
  return [
    result?.actualsCreated > 0 && `${result.actualsCreated} actual created`,
    result?.actualsUpdated > 0 && `${result.actualsUpdated} actual unchanged`,
    result?.failuresCreated > 0 && `${result.failuresCreated} finding created`,
    result?.failuresUpdated > 0 && `${result.failuresUpdated} finding unchanged`,
    result?.errors?.length > 0 && `${result.errors.length} error(s)`
  ]
    .filter(Boolean)
    .join(', ')
}

export async function readActualSheetRows(file) {
  const data = await file.arrayBuffer()
  const wb = XLSX.read(data, { type: 'array' })
  const firstSheet = wb.SheetNames[0] ? wb.Sheets[wb.SheetNames[0]] : null
  if (!firstSheet) return null

  const matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '', raw: true })
  const headerIndex = actualSheetHeaderIndex(Array.isArray(matrix) ? matrix : [])

  return XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: true, range: headerIndex })
}
