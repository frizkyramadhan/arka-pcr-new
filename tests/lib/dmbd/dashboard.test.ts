/** KPI dashboard DMBD: bucket status, umur, tren, dan MTTR hari ini. */
import { describe, expect, it } from 'vitest'

import { buildDmbdDashboard, type DmbdEpisode, type DmbdUnit } from '@/lib/dmbd/dashboard'

const now = new Date('2026-10-23T10:00:00')

const units: DmbdUnit[] = [
  { fleetUnitId: 1, unitNo: 'E 001', modelName: 'PC200', projectCode: '023C', plantType: 'HAULER', plantGroup: 'Excavator' },
  { fleetUnitId: 2, unitNo: 'E 002', modelName: 'PC200', projectCode: '023C', plantType: 'HAULER', plantGroup: 'Excavator' },
  { fleetUnitId: 3, unitNo: 'DZ 001', modelName: 'D8R', projectCode: '022C', plantType: 'SUPPORT', plantGroup: 'Bulldozer' },
  { fleetUnitId: 4, unitNo: 'ADT 001', modelName: 'HM400', projectCode: '022C', plantType: 'HAULER', plantGroup: 'Articulate Dump Truck' },
  { fleetUnitId: 5, unitNo: 'E 003', modelName: 'PC200', projectCode: '023C', plantType: 'HAULER', plantGroup: 'Excavator' }
]

function episode(partial: Partial<DmbdEpisode> & Pick<DmbdEpisode, 'id' | 'fleetUnitId' | 'startedAt'>): DmbdEpisode {
  return {
    finishedAt: null,
    problem: 'hose',
    hourMeter: 10,
    componentName: 'Engine',
    componentCode: 'CC-01',
    mechanicLeaderName: 'Budi',
    preparedBy: null,
    activities: [
      {
        startedAt: partial.startedAt,
        createdAt: partial.startedAt,
        positionStatus: 'BD',
        breakdownCode: 'B3',
        breakdownCodeName: 'WAITING PART',
        details: 'part',
        technicianName: null
      }
    ],
    ...partial
  }
}

describe('buildDmbdDashboard', () => {
  const episodes = [
    episode({ id: 'a', fleetUnitId: 1, startedAt: new Date('2026-10-20T06:00:00'), componentName: 'Engine' }),
    episode({
      id: 'c',
      fleetUnitId: 3,
      startedAt: new Date('2026-10-22T06:00:00'),
      componentName: 'Engine',
      activities: [
        {
          startedAt: new Date('2026-10-22T06:00:00'),
          createdAt: new Date('2026-10-22T06:00:00'),
          positionStatus: 'BD',
          breakdownCode: 'B01',
          breakdownCodeName: 'PROGRESS TROUBLESHOOTING',
          details: 'bongkar',
          technicianName: 'Andi'
        }
      ]
    }),
    episode({
      id: 'd',
      fleetUnitId: 4,
      startedAt: new Date('2026-10-21T10:00:00'),
      componentName: 'Hydraulic',
      activities: [
        {
          startedAt: new Date('2026-10-21T10:00:00'),
          createdAt: new Date('2026-10-21T10:00:00'),
          positionStatus: 'SB',
          breakdownCode: 'B6',
          breakdownCodeName: 'WAITING WORKSHOP LABOUR',
          details: 'tunggu',
          technicianName: null
        }
      ]
    }),
    episode({
      id: 'e',
      fleetUnitId: 5,
      startedAt: new Date('2026-10-23T08:00:00'),
      activities: [
        {
          startedAt: new Date('2026-10-23T08:00:00'),
          createdAt: new Date('2026-10-23T08:00:00'),
          positionStatus: 'BD',
          breakdownCode: 'B0',
          breakdownCodeName: 'BREAKDOWN PROGRESS',
          details: 'baru',
          technicianName: null
        }
      ]
    })
  ]

  it('splits open units and compares them with yesterday', () => {
    const result = buildDmbdDashboard({ units, episodes, now })

    expect(result.kpis).toMatchObject({
      totalUnits: 5,
      ready: 1,
      breakdown: 1,
      waitingPart: 1,
      underRepair: 2,
      lostHours: 154,
      mttrHours: null
    })
    expect(result.kpis.delta).toMatchObject({
      totalUnits: 0,
      breakdown: 0,
      waitingPart: 0,
      underRepair: 1,
      ready: -1,
      lostHours: 74
    })
    expect(result.bySite).toEqual([
      { name: '022C', count: 2 },
      { name: '023C', count: 2 }
    ])
    expect(result.byComponent).toEqual([
      { name: 'Engine', count: 3 },
      { name: 'Hydraulic', count: 1 }
    ])
    expect(result.longest.map(row => row.unitNo)).toEqual(['E 001', 'ADT 001', 'DZ 001', 'E 003'])
    expect(result.rows.at(-1)?.unitNo).toBe('E 002')
    expect(result.trend.reduce((sum, day) => sum + day.count, 0)).toBe(4)
    expect(result.options.plants).toEqual(['HAULER', 'SUPPORT'])
  })

  it('keeps the KPI snapshot when the table is filtered', () => {
    const waiting = buildDmbdDashboard({ units, episodes, status: 'waiting_part', now })
    const plant = buildDmbdDashboard({ units, episodes, plant: 'SUPPORT', now })

    expect(waiting.rows.map(row => row.unitNo)).toEqual(['E 001'])
    expect(waiting.kpis.totalUnits).toBe(5)
    expect(plant.kpis).toMatchObject({ totalUnits: 1, underRepair: 1, ready: 0 })
  })

  it('averages repairs that finished on the selected day', () => {
    const result = buildDmbdDashboard({
      units: units.slice(0, 1),
      episodes: [
        episode({
          id: 'old',
          fleetUnitId: 1,
          startedAt: new Date('2026-10-22T10:00:00'),
          finishedAt: new Date('2026-10-22T12:00:00')
        }),
        episode({
          id: 'today-short',
          fleetUnitId: 1,
          startedAt: new Date('2026-10-23T08:00:00'),
          finishedAt: new Date('2026-10-23T12:00:00')
        }),
        episode({
          id: 'today-long',
          fleetUnitId: 1,
          startedAt: new Date('2026-10-23T08:00:00'),
          finishedAt: new Date('2026-10-23T18:00:00')
        })
      ],
      now: new Date('2026-10-23T20:00:00')
    })

    expect(result.kpis.mttrHours).toBe(7)
    expect(result.kpis.delta.mttrHours).toBe(5)
    expect(result.kpis.ready).toBe(1)
  })

  it('keeps a finished September job out of October MTD and inside YTD', () => {
    const rows = [
      episode({
        id: 'sep',
        fleetUnitId: 1,
        startedAt: new Date('2026-09-01T08:00:00'),
        finishedAt: new Date('2026-09-01T18:00:00')
      })
    ]

    const mtd = buildDmbdDashboard({
      units: units.slice(0, 1),
      episodes: rows,
      period: '2026-10',
      mode: 'MTD',
      now
    })

    const ytd = buildDmbdDashboard({
      units: units.slice(0, 1),
      episodes: rows,
      period: '2026-10',
      mode: 'YTD',
      now
    })

    expect(mtd.kpis.mttrHours).toBeNull()
    expect(mtd.rows[0].ageHours).toBeNull()
    expect(mtd.trend.some(day => day.date.startsWith('2026-09'))).toBe(false)
    expect(mtd.period).toMatchObject({ mode: 'MTD', compareLabel: 'vs last month' })

    expect(ytd.kpis.mttrHours).toBe(10)
    expect(ytd.rows[0]).toMatchObject({ status: 'RFU', ageHours: 10 })
    expect(ytd.trend.map(day => day.date)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10'
    ])
    expect(ytd.trend.find(day => day.date === '2026-09')?.count).toBe(1)
    expect(ytd.byComponent).toEqual([{ name: 'Engine', count: 1 }])
    expect(ytd.period.compareLabel).toBe('vs last year')
  })

  it('averages October finishes for MTD and the year for YTD', () => {
    const rows = [
      episode({
        id: 'sep',
        fleetUnitId: 1,
        startedAt: new Date('2026-09-01T08:00:00'),
        finishedAt: new Date('2026-09-01T18:00:00')
      }),
      episode({
        id: 'oct',
        fleetUnitId: 1,
        startedAt: new Date('2026-10-02T08:00:00'),
        finishedAt: new Date('2026-10-02T14:00:00')
      })
    ]

    const mtd = buildDmbdDashboard({
      units: units.slice(0, 1),
      episodes: rows,
      period: '2026-10',
      mode: 'MTD',
      now
    })

    const ytd = buildDmbdDashboard({
      units: units.slice(0, 1),
      episodes: rows,
      period: '2026-10',
      mode: 'YTD',
      now
    })

    expect(mtd.kpis.mttrHours).toBe(6)
    expect(mtd.trend.find(day => day.date === '2026-10-02')?.count).toBe(1)
    expect(ytd.kpis.mttrHours).toBe(8)
  })

  it('computes MTTR, MTBF, and PA from breakdowns in the selected month', () => {
    const result = buildDmbdDashboard({
      units: [{ ...units[0], unitStatus: 'ACTIVE' }],
      episodes: [
        episode({
          id: 'oct',
          fleetUnitId: 1,
          startedAt: new Date('2026-10-02T08:00:00'),
          finishedAt: new Date('2026-10-02T14:00:00')
        })
      ],
      readings: new Map([[1, [
        { iso: '2026-10-01', hm: 100 },
        { iso: '2026-10-23', hm: 200 }
      ]]]),
      period: '2026-10',
      mode: 'MTD',
      now
    })

    expect(result.reliability.mttr).toMatchObject({ value: 6, count: 1 })
    expect(result.reliability.mtbf).toMatchObject({ value: 100, failures: 1, runHours: 100 })
    expect(result.reliability.pa.units).toBe(1)
    expect(result.reliability.pa.downtimeHours).toBe(6)
    expect(result.reliability.pa.value).toBeGreaterThan(99)
    expect(result.reliability.pa.value).toBeLessThan(100)
  })
})
