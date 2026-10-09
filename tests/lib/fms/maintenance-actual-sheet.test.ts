import { describe, expect, it } from 'vitest'

import {
  ACTUAL_SHEET_COLUMNS,
  blankActualSheetRow,
  parseSheetTime,
  rowHasFinding,
  sheetGroupKey
} from '@/lib/fms/maintenance-actual-sheet'

describe('maintenance actual sheet', () => {
  it('uses the same columns for a blank template and a filled export', () => {
    expect(Object.keys(blankActualSheetRow())).toEqual([...ACTUAL_SHEET_COLUMNS])
  })

  it('treats an actual-only row as having no finding', () => {
    expect(rowHasFinding({})).toBe(false)
    expect(rowHasFinding({ finding: '  ' })).toBe(false)
  })

  it('treats any finding column as a finding row', () => {
    expect(rowHasFinding({ severity: 'CRITICAL' })).toBe(true)
    expect(rowHasFinding({ closedOn: '2026-10-01' })).toBe(true)
  })

  it('groups several findings on one plan date into one actual', () => {
    const key = sheetGroupKey({
      unitNo: 'dt-01',
      program: 'Greasing',
      planDateIso: '2026-10-02',
      registerNo: 'PM-021C.2610-0001'
    })

    expect(key).toBe('plan|DT-01|greasing|2026-10-02')
    expect(sheetGroupKey({ unitNo: 'DT-01', program: 'greasing', planDateIso: '2026-10-02' })).toBe(key)
  })

  it('falls back to the register number when the plan date is missing', () => {
    expect(sheetGroupKey({ registerNo: 'pm-021c.2610-0001' })).toBe('reg|PM-021C.2610-0001')
    expect(sheetGroupKey({})).toBeNull()
  })

  it('reads an Excel time fraction as HH:mm', () => {
    expect(parseSheetTime(0.5)).toBe('12:00')
    expect(parseSheetTime('08:30')).toBe('08:30')
    expect(parseSheetTime('')).toBeNull()
  })
})
