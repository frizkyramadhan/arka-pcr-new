/** Unit tests for SAP employee Excel parse helpers. */
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import { parseEmployeeImportSheet } from '@/lib/sap-b1/employees-sheet'

async function sheetFromRows(headers: string[], rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Employees')
  sheet.addRow(headers)
  for (const row of rows) sheet.addRow(row)

  return sheet
}

describe('parseEmployeeImportSheet', () => {
  it('parses valid rows and skips blanks', async () => {
    const sheet = await sheetFromRows(
      ['employee_id', 'first_name', 'last_name', 'nik', 'branch', 'department', 'is_mechanic', 'record_status'],
      [
        [7, 'HERI', '', '13516', 6, 13, 'N', 'A'],
        ['', '', '', '', '', '', '', ''],
        [null, 'WITO', 'S', '15087', 6, 4, 'Y', 'D']
      ]
    )

    const parsed = parseEmployeeImportSheet(sheet)

    expect(parsed.errors).toEqual([])
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0]).toMatchObject({
      employeeId: 7,
      firstName: 'HERI',
      nik: '13516',
      isMechanic: 'N',
      recordStatus: 'A'
    })
    expect(parsed.rows[1]).toMatchObject({
      employeeId: null,
      firstName: 'WITO',
      nik: '15087',
      isMechanic: 'Y',
      recordStatus: 'D'
    })
  })

  it('rejects bad mechanic / status values', async () => {
    const sheet = await sheetFromRows(
      ['first_name', 'nik', 'is_mechanic', 'record_status'],
      [['HERI', '1', 'MAYBE', 'A']]
    )

    const parsed = parseEmployeeImportSheet(sheet)

    expect(parsed.rows).toHaveLength(0)
    expect(parsed.errors[0]?.column).toBe('is_mechanic')
  })

  it('requires first_name and nik columns', async () => {
    const sheet = await sheetFromRows(['name'], [['x']])
    const parsed = parseEmployeeImportSheet(sheet)

    expect(parsed.rows).toHaveLength(0)
    expect(parsed.errors.map(error => error.column)).toEqual(expect.arrayContaining(['first_name', 'nik']))
  })
})
