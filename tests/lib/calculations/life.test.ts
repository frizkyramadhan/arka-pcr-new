import { describe, expect, it } from 'vitest'

import {
  calculateComponentLife,
  calculateForecastDays,
  deriveQuarter,
  isCriticalSosRating,
  normalizeLifePercentForDb
} from '@/lib/calculations/life'

describe('calculateComponentLife', () => {
  it('computes life percent from HM and replacement baseline', () => {
    const result = calculateComponentLife({
      hmNow: 12000,
      hmLastReplacement: 10000,
      compHour: 500,
      policy: 8000
    })

    expect(result.currentLife).toBe(2500)
    expect(result.lifePercent).toBe(31.25)
    expect(result.remainingHours).toBe(5500)
    expect(result.isCritical).toBe(false)
    expect(result.isOverdue).toBe(false)
  })

  it('flags critical at 85% and overdue at 100%', () => {
    const critical = calculateComponentLife({
      hmNow: 9000,
      hmLastReplacement: 0,
      compHour: 0,
      policy: 10000
    })

    expect(critical.lifePercent).toBe(90)
    expect(critical.isCritical).toBe(true)
    expect(critical.isOverdue).toBe(false)

    const overdue = calculateComponentLife({
      hmNow: 11000,
      hmLastReplacement: 0,
      compHour: 0,
      policy: 10000
    })

    expect(overdue.lifePercent).toBe(110)
    expect(overdue.isOverdue).toBe(true)
  })

  it('uses policy minimum of 1 to avoid division by zero', () => {
    const result = calculateComponentLife({
      hmNow: 100,
      hmLastReplacement: 0,
      compHour: 0,
      policy: 0
    })

    expect(result.lifePercent).toBe(9999.99)
    expect(result.isCritical).toBe(true)
    expect(result.isOverdue).toBe(true)
  })

  it('clamps life percent to DECIMAL(6,2) database range', () => {
    const result = calculateComponentLife({
      hmNow: 500000,
      hmLastReplacement: 0,
      compHour: 0,
      policy: 100
    })

    expect(result.lifePercent).toBe(9999.99)
    expect(result.isOverdue).toBe(true)
  })
})

describe('normalizeLifePercentForDb', () => {
  it('clamps invalid and out-of-range values', () => {
    expect(normalizeLifePercentForDb(Number.NaN)).toBe(0)
    expect(normalizeLifePercentForDb(-5)).toBe(0)
    expect(normalizeLifePercentForDb(10000)).toBe(9999.99)
    expect(normalizeLifePercentForDb(31.256)).toBe(31.26)
  })
})

describe('calculateForecastDays', () => {
  it('returns null when fewer than two readings in window', () => {
    const result = calculateForecastDays(500, [{ readingDate: new Date('2026-03-01'), reading: 1000 }])

    expect(result).toBeNull()
  })

  it('estimates days from average HM per day over recent readings', () => {
    const newest = new Date()
    const oldest = new Date()
    oldest.setDate(oldest.getDate() - 30)

    const readings = [
      { readingDate: oldest, reading: 1000 },
      { readingDate: newest, reading: 1300 }
    ]

    const days = calculateForecastDays(300, readings)

    expect(days).toBe(30)
  })

  it('returns null when average HM per day is zero or negative', () => {
    const readings = [
      { readingDate: new Date('2026-03-01'), reading: 1000 },
      { readingDate: new Date('2026-03-31'), reading: 1000 }
    ]

    expect(calculateForecastDays(300, readings)).toBeNull()
  })
})

describe('deriveQuarter', () => {
  it('maps months to fiscal quarters', () => {
    expect(deriveQuarter(new Date('2026-01-15'))).toBe('Q1')
    expect(deriveQuarter(new Date('2026-04-01'))).toBe('Q2')
    expect(deriveQuarter(new Date('2026-08-01'))).toBe('Q3')
    expect(deriveQuarter(new Date('2026-11-01'))).toBe('Q4')
  })
})

describe('isCriticalSosRating', () => {
  it('treats C and X as critical', () => {
    expect(isCriticalSosRating('C')).toBe(true)
    expect(isCriticalSosRating('x')).toBe(true)
    expect(isCriticalSosRating('A')).toBe(false)
    expect(isCriticalSosRating(null)).toBe(false)
  })
})
