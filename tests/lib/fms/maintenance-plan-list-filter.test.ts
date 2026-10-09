import { describe, expect, it } from 'vitest'

import {
  filterPlansForExport,
  planExportRows,
  planHeaderWhere,
  planListRequestParams
} from '@/lib/fms/maintenance-plan-list-filter'

const march = {
  projectId: '021C',
  year: 2026,
  month: 3,
  maintenanceTypeId: 'type-a',
  maintenanceTypeName: 'Service 250',
  details: [
    { unitNo: 'DT001', planDate: '2026-03-04' },
    { unitNo: '', planDate: '2026-03-05' },
    { unitNo: 'DT002', planDate: '' }
  ]
}

const april = {
  projectId: '025C',
  year: 2026,
  month: 4,
  maintenanceTypeId: 'type-b',
  maintenanceTypeName: 'Service 500',
  details: [{ unitNo: 'DT009', planDate: '2026-04-01' }]
}

describe('planHeaderWhere', () => {
  it('keeps year, month, and maintenance type when they are set', () => {
    expect(
      planHeaderWhere({ year: '2026', month: '3', maintenanceTypeId: ' type-a ' })
    ).toEqual({ year: 2026, month: 3, maintenanceTypeId: 'type-a' })
  })

  it('ignores empty filters and a month outside 1-12', () => {
    expect(planHeaderWhere({ year: '', month: '13', maintenanceTypeId: '  ' })).toEqual({})
    expect(planHeaderWhere({})).toEqual({})
  })
})

describe('planListRequestParams', () => {
  it('sends the same filters the list is showing, plus detail rows for export', () => {
    expect(
      planListRequestParams({
        projectId: '021C',
        year: '2026',
        month: 3,
        maintenanceTypeId: 'type-a',
        withDetails: true,
        forExport: true
      })
    ).toEqual({
      projectId: '021C',
      year: '2026',
      month: '3',
      maintenanceTypeId: 'type-a',
      details: '1',
      export: '1'
    })
  })

  it('does not mark a detail request as export unless the Excel download asked for it', () => {
    expect(planListRequestParams({ withDetails: true })).toEqual({ details: '1' })
  })

  it('omits an empty project so the API scope still limits a site user', () => {
    expect(planListRequestParams({ projectId: '', year: '', month: '', maintenanceTypeId: '' })).toEqual({})
  })
})

describe('planExportRows', () => {
  it('exports only detail rows that match the active project, year, month, and type', () => {
    expect(
      planExportRows([march, april], {
        projectId: '021C',
        year: '2026',
        month: 3,
        maintenanceTypeId: 'type-a'
      })
    ).toEqual([
      {
        Project: '021C',
        Year: 2026,
        Month: 3,
        Unit: 'DT001',
        'Plan Date': '2026-03-04',
        'Maintenance Type': 'Service 250'
      }
    ])
  })

  it('does not dump every plan when only some filters are active', () => {
    const rows = planExportRows([march, april], { year: 2026, month: 4 })

    expect(rows.map(row => row.Unit)).toEqual(['DT009'])
    expect(filterPlansForExport([march, april], { month: 3 }).map(plan => plan.projectId)).toEqual(['021C'])
  })

  it('keeps every given plan when the screen filters are All', () => {
    expect(planExportRows([march, april], {}).map(row => row.Unit)).toEqual(['DT001', 'DT009'])
  })
})
