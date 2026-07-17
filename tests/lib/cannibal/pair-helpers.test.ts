import { describe, expect, it } from 'vitest'

import { groupLinesToPairs } from '@/lib/cannibal/pair-helpers'

describe('groupLinesToPairs', () => {
  it('preserves fleetUnitId and unitNo on pair sides', () => {
    const pairs = groupLinesToPairs([
      {
        type: 'REMOVE',
        pairIndex: 0,
        fleetUnitId: 107,
        unitNo: 'E 066',
        date: new Date('2026-01-15'),
        compDesc: 'ALTERNATOR',
        pn: 'SP-001',
        sn: '',
        pos: '',
        hmComp: 0,
        woStatusKanibal: 'OPEN'
      },
      {
        type: 'INSTALL',
        pairIndex: 0,
        fleetUnitId: 108,
        unitNo: 'E 067',
        date: new Date('2026-01-15'),
        compDesc: 'ALTERNATOR',
        pn: 'SP-001',
        sn: '',
        pos: '',
        hmComp: 0,
        woStatusKanibal: 'OPEN'
      }
    ])

    expect(pairs).toHaveLength(1)
    expect(pairs[0].remove.fleetUnitId).toBe(107)
    expect(pairs[0].remove.unitNo).toBe('E 066')
    expect(pairs[0].install.fleetUnitId).toBe(108)
    expect(pairs[0].install.unitNo).toBe('E 067')
  })

  it('falls back unitNo from unit relation when scalar is empty', () => {
    const pairs = groupLinesToPairs([
      {
        type: 'REMOVE',
        pairIndex: 0,
        fleetUnitId: 107,
        unitNo: '',
        unit: { unitNo: 'E 066' },
        date: new Date('2026-01-15'),
        compDesc: 'TEST',
        pn: '',
        sn: '',
        pos: '',
        hmComp: 0,
        woStatusKanibal: 'OPEN'
      },
      {
        type: 'INSTALL',
        pairIndex: 0,
        fleetUnitId: 108,
        unitNo: '',
        unit: { unitNo: 'E 067' },
        date: new Date('2026-01-15'),
        compDesc: 'TEST',
        pn: '',
        sn: '',
        pos: '',
        hmComp: 0,
        woStatusKanibal: 'OPEN'
      }
    ])

    expect(pairs[0].remove.unitNo).toBe('E 066')
    expect(pairs[0].install.unitNo).toBe('E 067')
  })
})
