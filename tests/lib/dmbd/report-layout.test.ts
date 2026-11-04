/** Breakdown report board layout — plant-group headers, RFU/BD, aging. */
import { describe, expect, it } from 'vitest'

import {
  agingBdLabel,
  groupBreakdownReportRows,
  partitionBreakdownReportGroups
} from '@/lib/dmbd/report-layout'

const sample = [
  {
    id: 'ready-1',
    unitNo: 'E 001',
    plantGroup: 'Excavator',
    startedAt: '',
    finishedAt: null,
    problem: '',
    hourMeter: null,
    hmUpdate: 45210,
    statusUnit: 'RFU'
  },
  {
    id: 'bd-2',
    unitNo: 'E 002',
    plantGroup: 'Excavator',
    startedAt: '2026-01-01T00:00:00',
    finishedAt: null,
    problem: 'leak',
    hourMeter: 100,
    statusUnit: 'BD',
    latestCode: 'B0',
    latestCodeName: 'BREAKDOWN PROGRESS'
  }
]

describe('agingBdLabel', () => {
  it('counts whole days from start to finish', () => {
    expect(agingBdLabel('2026-01-01T00:00:00', '2026-01-03T12:00:00')).toBe('2 days')
  })
})

describe('partitionBreakdownReportGroups', () => {
  it('groups units with RFU/BD counts for accordion sections', () => {
    const groups = partitionBreakdownReportGroups(sample, Date.parse('2026-01-11T00:00:00'))

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ label: 'EXCAVATOR', rfu: 1, bd: 1 })
    expect(groups[0].rows[0]).toMatchObject({
      unitNo: 'E 001',
      statusRfu: 'RFU',
      problem: '',
      hourMeter: null,
      hmUpdate: 45210
    })
    expect(groups[0].rows[1]).toMatchObject({
      unitNo: 'E 002',
      statusBd: 'BD',
      agingBd: '10 days',
      processStatus: 'B0 · BREAKDOWN PROGRESS'
    })
  })
})

describe('groupBreakdownReportRows', () => {
  it('keeps RFU units on the flat board without BD detail and totals both statuses', () => {
    const board = groupBreakdownReportRows(sample, Date.parse('2026-01-11T00:00:00'))

    expect(board.map(row => row.rowType)).toEqual(['group', 'data', 'data', 'total'])
    expect(board[0].groupLabel).toBe('EXCAVATOR')
    expect(board[3]).toMatchObject({ statusRfu: '1', statusBd: '1' })
  })
})
