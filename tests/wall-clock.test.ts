import { describe, expect, it } from 'vitest'

import {
  formatWallClockDate,
  formatWallClockDateTime,
  splitWallClock,
  toWallClockIso,
  wallClockParts
} from '@/lib/utils/wall-clock'

describe('wall-clock', () => {
  it('reads Prisma UTC Date as stored wall-clock', () => {
    const date = new Date(Date.UTC(2025, 0, 10, 11, 25, 0))

    expect(wallClockParts(date)).toEqual({
      year: 2025,
      month: 1,
      day: 10,
      hour: 11,
      minute: 25,
      second: 0
    })
    expect(toWallClockIso(date)).toBe('2025-01-10T11:25:00')
    expect(formatWallClockDateTime(date)).toBe('10 Jan 2025, 11:25')
    expect(formatWallClockDate(date)).toBe('10 Jan 2025')
    expect(splitWallClock(date)).toEqual({ date: '2025-01-10', time: '11:25' })
  })

  it('parses ISO-Z the same way (no local shift)', () => {
    expect(formatWallClockDateTime('2025-01-10T11:25:00.000Z')).toBe('10 Jan 2025, 11:25')
    expect(splitWallClock('2025-01-10T11:25:00')).toEqual({ date: '2025-01-10', time: '11:25' })
  })
})
