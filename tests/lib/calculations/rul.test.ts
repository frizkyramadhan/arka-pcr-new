import { describe, expect, it } from 'vitest'

import { applyLeadTimeRecommendation, estimateRulByRegression } from '@/lib/calculations/rul'

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)

  return date
}

describe('estimateRulByRegression', () => {
  it('returns null with fewer than 2 data points', () => {
    expect(estimateRulByRegression([{ date: new Date(), hmUnit: 100 }], 500, 1000)).toBeNull()
    expect(estimateRulByRegression([], 500, 1000)).toBeNull()
  })

  it('returns null when policy is invalid', () => {
    const readings = [
      { date: daysAgo(30), hmUnit: 100 },
      { date: daysAgo(0), hmUnit: 400 }
    ]

    expect(estimateRulByRegression(readings, 500, 0)).toBeNull()
    expect(estimateRulByRegression(readings, 500, -10)).toBeNull()
  })

  it('returns null when all readings share the same date (undefined slope)', () => {
    const sameDate = daysAgo(5)

    const readings = [
      { date: sameDate, hmUnit: 100 },
      { date: sameDate, hmUnit: 200 }
    ]

    expect(estimateRulByRegression(readings, 500, 1000)).toBeNull()
  })

  it('returns null when the HM trend is flat or decreasing (cannot project forward)', () => {
    const readings = [
      { date: daysAgo(60), hmUnit: 500 },
      { date: daysAgo(30), hmUnit: 500 },
      { date: daysAgo(0), hmUnit: 480 }
    ]

    expect(estimateRulByRegression(readings, 500, 1000)).toBeNull()
  })

  it('projects estimatedDate from a perfect 2-point linear trend, no confidence band', () => {
    // 10 HM/day for 30 days → 300 HM increase.
    const readings = [
      { date: daysAgo(30), hmUnit: 1000 },
      { date: daysAgo(0), hmUnit: 1300 }
    ]

    const result = estimateRulByRegression(readings, 1300, 1600)

    expect(result).not.toBeNull()
    expect(result?.dataPoints).toBe(2)
    expect(result?.dailyRate).toBeCloseTo(10, 5)
    expect(result?.confidenceLowDate).toBeNull()
    expect(result?.confidenceHighDate).toBeNull()

    // remaining = 300, rate = 10/day → ~30 days from today.
    const expected = new Date()
    expected.setDate(expected.getDate() + 30)
    expect(result?.estimatedDate.toDateString()).toBe(expected.toDateString())
  })

  it('produces a confidence band bracketing the estimated date when data is noisy (n > 2)', () => {
    const readings = [
      { date: daysAgo(90), hmUnit: 1000 },
      { date: daysAgo(60), hmUnit: 1280 },
      { date: daysAgo(30), hmUnit: 1305 },
      { date: daysAgo(0), hmUnit: 1600 }
    ]

    const result = estimateRulByRegression(readings, 1600, 2000)

    expect(result).not.toBeNull()
    expect(result?.dataPoints).toBe(4)
    expect(result?.dailyRate).toBeGreaterThan(0)
    expect(result?.confidenceLowDate).not.toBeNull()
    expect(result?.confidenceHighDate).not.toBeNull()

    if (result?.confidenceLowDate && result?.confidenceHighDate) {
      expect(result.confidenceLowDate.getTime()).toBeLessThanOrEqual(result.estimatedDate.getTime())
      expect(result.confidenceHighDate.getTime()).toBeGreaterThanOrEqual(result.estimatedDate.getTime())
    }
  })

  it('returns null when the component is already overdue (currentLife >= policy)', () => {
    const readings = [
      { date: daysAgo(60), hmUnit: 1000 },
      { date: daysAgo(30), hmUnit: 1150 },
      { date: daysAgo(0), hmUnit: 1300 }
    ]

    // currentLife already past policy — projecting forward would only yield a past date.
    expect(estimateRulByRegression(readings, 7000, 7000)).toBeNull()
    expect(estimateRulByRegression(readings, 8000, 7000)).toBeNull()
  })

  it('falls back to using all data when fewer than 3 points fall in the 12-month window', () => {
    const readings = [
      { date: daysAgo(400), hmUnit: 500 },
      { date: daysAgo(200), hmUnit: 900 },
      { date: daysAgo(5), hmUnit: 1300 }
    ]

    const result = estimateRulByRegression(readings, 1300, 2000)

    expect(result).not.toBeNull()
    expect(result?.dataPoints).toBe(3)
  })
})

describe('applyLeadTimeRecommendation', () => {
  const baseRul = {
    estimatedDate: new Date('2027-01-01T00:00:00.000Z'),
    confidenceLowDate: null,
    confidenceHighDate: null,
    method: 'LINEAR_REGRESSION_V1' as const,
    dataPoints: 4,
    dailyRate: 10,
    recommendedProcurementDate: null
  }

  it('leaves recommendedProcurementDate null when there is no lead-time data', () => {
    expect(applyLeadTimeRecommendation(baseRul, null).recommendedProcurementDate).toBeNull()
  })

  it('leaves recommendedProcurementDate null when sample count is below the threshold', () => {
    const result = applyLeadTimeRecommendation(baseRul, { avgLeadTimeDays: 14, sampleCount: 4 }, 5)
    expect(result.recommendedProcurementDate).toBeNull()
  })

  it('sets recommendedProcurementDate as estimatedDate minus avgLeadTimeDays once sample count meets the threshold', () => {
    const result = applyLeadTimeRecommendation(baseRul, { avgLeadTimeDays: 14, sampleCount: 5 }, 5)

    expect(result.recommendedProcurementDate?.toISOString().slice(0, 10)).toBe('2026-12-18')

    // Other fields untouched.
    expect(result.estimatedDate).toBe(baseRul.estimatedDate)
    expect(result.dailyRate).toBe(10)
  })
})
