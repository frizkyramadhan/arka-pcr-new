import { describe, expect, it } from 'vitest'

import { parseForecastListQuery, parseForecastNumericFilter } from '@/lib/forecasts/list-query'

describe('parseForecastNumericFilter', () => {
  it('parses id-ID thousand grouping', () => {
    expect(parseForecastNumericFilter('18.000')).toBe(18000)
    expect(parseForecastNumericFilter('4.487')).toBe(4487)
  })

  it('parses decimals and life % suffixes', () => {
    expect(parseForecastNumericFilter('24.9')).toBe(24.9)
    expect(parseForecastNumericFilter('85%')).toBe(85)
  })

  it('returns null for empty or invalid input', () => {
    expect(parseForecastNumericFilter('')).toBeNull()
    expect(parseForecastNumericFilter('abc')).toBeNull()
  })
})

describe('parseForecastListQuery', () => {
  it('maps column filters and planMonth to list where inputs', () => {
    const filters = parseForecastListQuery(
      new URLSearchParams({
        modelName: 'HM400',
        unitNo: 'ADT 011',
        compDesc: 'ENGINE',
        hmComponent: '18.000',
        policy: '20.000',
        lifePercent: '85',
        ratingSos: 'Urgent',
        ratingCbm: 'ATTENTION',
        planMonth: '2026-07',
        status: 'OPEN'
      })
    )

    expect(filters.modelName).toBe('HM400')
    expect(filters.unitNo).toBe('ADT 011')
    expect(filters.compDesc).toBe('ENGINE')
    expect(filters.hmComponent).toBe(18000)
    expect(filters.policy).toBe(20000)
    expect(filters.lifePercent).toBe(85)
    expect(filters.ratingSos).toBe('Urgent')
    expect(filters.ratingCbm).toBe('ATTENTION')
    expect(filters.planPeriod).toBe('2026-07-01')
    expect(filters.status).toBe('OPEN')
    expect(filters.isWarranty).toBeNull()
  })

  it('treats status WARRANTY as isWarranty without forecastStatus', () => {
    const filters = parseForecastListQuery(new URLSearchParams({ status: 'WARRANTY' }))

    expect(filters.status).toBeNull()
    expect(filters.isWarranty).toBe(true)
  })
})
