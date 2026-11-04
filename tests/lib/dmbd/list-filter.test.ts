/** Filters for the breakdown list: BD date, finish date, and description. */
import { describe, expect, it } from 'vitest'

import { breakdownListFilter } from '@/lib/dmbd/list-filter'

describe('breakdownListFilter', () => {
  it('keeps a BD date range on the local calendar day', () => {
    const where = breakdownListFilter({ bdFrom: '2026-10-01', bdTo: '2026-10-19' })

    expect(where.startedAt).toEqual({
      gte: new Date('2026-10-01T00:00:00'),
      lte: new Date('2026-10-19T23:59:59.999')
    })
  })

  it('ignores a date that is not a real day', () => {
    expect(breakdownListFilter({ bdFrom: '2026-02-31', finishTo: 'nope' })).toEqual({})
  })

  it('matches description text on the problem', () => {
    expect(breakdownListFilter({ description: '  hose  ' }).problem).toEqual({ contains: 'hose' })
  })

  it('keeps a finish range only on rows that have a finish date', () => {
    const where = breakdownListFilter({ status: 'closed', finishFrom: '2026-10-20' })

    expect(where.finishedAt).toEqual({
      not: null,
      gte: new Date('2026-10-20T00:00:00')
    })
  })

  it('does not treat an open row as finished when a finish date is set', () => {
    const where = breakdownListFilter({ status: 'open', finishFrom: '2026-10-20' })

    expect(where.AND).toEqual([
      { finishedAt: null },
      { finishedAt: { gte: new Date('2026-10-20T00:00:00') } }
    ])
  })
})
