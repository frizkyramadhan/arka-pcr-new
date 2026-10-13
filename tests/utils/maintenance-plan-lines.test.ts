import { describe, expect, it } from 'vitest'

import { filterPlanLines } from '@/src/utils/maintenance-plan-lines'

const lines = [
  {
    id: 'a',
    projectId: '021C',
    year: 2026,
    month: 10,
    maintenanceTypeId: 'type-a',
    fleetUnitId: 12,
    unitNo: 'DT010',
    unitModel: 'HD785',
    unitDescription: 'Dump truck',
    planDate: '2026-10-02'
  },
  {
    id: 'b',
    projectId: '021C',
    year: 2026,
    month: 10,
    maintenanceTypeId: 'type-a',
    fleetUnitId: 12,
    unitNo: 'DT010',
    unitModel: 'HD785',
    unitDescription: 'Dump truck',
    planDate: '2026-10-16'
  },
  {
    id: 'c',
    projectId: '025C',
    year: 2026,
    month: 11,
    maintenanceTypeId: 'type-b',
    fleetUnitId: 3,
    unitNo: 'EX003',
    unitModel: '',
    unitDescription: '',
    planDate: '2026-11-01'
  }
]

describe('filterPlanLines unit', () => {
  it('keeps only the selected unit', () => {
    expect(filterPlanLines(lines, { fleetUnitId: '12' }).map((line: { id: string }) => line.id)).toEqual(['a', 'b'])
  })
})
