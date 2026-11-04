import { describe, expect, it } from 'vitest'

import { breakdownRegisterPeriod } from '@/lib/dmbd/register-no'

describe('breakdownRegisterPeriod', () => {
  it('builds yymm from wall-clock UTC getters', () => {
    // 2026-11-03 wall-clock packed into UTC slots
    const startedAt = new Date(Date.UTC(2026, 10, 3, 14, 30, 0))

    expect(breakdownRegisterPeriod(startedAt)).toBe('2611')
  })
})
