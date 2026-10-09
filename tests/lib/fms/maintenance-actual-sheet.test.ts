import { describe, expect, it } from 'vitest'

import {
  ACTUAL_SHEET_COLUMNS,
  actualSheetHeaderIndex,
  blankActualSheetRow,
  normalizeActualSheetRow,
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

  it('maps grid and legacy report headers onto the import columns', () => {
    const row = normalizeActualSheetRow({
      'Unit No': 'DT-01',
      Type: 'Greasing',
      Date: '2026-10-02',
      HM: 1200,
      'Reg. No': 'PM-021C.2610-0001'
    })

    expect(row.Unit).toBe('DT-01')
    expect(row['Maintenance Type']).toBe('Greasing')
    expect(row['Maintenance Date']).toBe('2026-10-02')
    expect(row['Hour Meter']).toBe(1200)
    expect(row['Register No']).toBe('PM-021C.2610-0001')
  })

  it('keeps the canonical header when an alias is also present', () => {
    const row = normalizeActualSheetRow({
      Type: 'Greasing',
      'Maintenance Type': 'Track Cleaning'
    })

    expect(row['Maintenance Type']).toBe('Track Cleaning')
  })

  it('finds the header row under a title', () => {
    const index = actualSheetHeaderIndex([
      ['Maintenance actual export'],
      ['Unit', 'Type', 'Plan Date'],
      ['DT-01', 'Greasing', '2026-10-02']
    ])

    expect(index).toBe(1)
  })
})
