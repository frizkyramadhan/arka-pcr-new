import { describe, expect, it } from 'vitest'

import {
  computeOverallCondition,
  evaluateInspectionCondition,
  evaluateOverallCondition,
  evaluateSosCondition
} from '@/lib/condition/aggregate'

describe('evaluateInspectionCondition', () => {
  it('returns NORMAL for A/B without C or X', () => {
    expect(evaluateInspectionCondition(['A', 'B'])).toBe('NORMAL')
    expect(evaluateInspectionCondition(['B', 'B'])).toBe('NORMAL')
  })

  it('returns ATTENTION for exactly one C without X', () => {
    expect(evaluateInspectionCondition(['A', 'C', 'B'])).toBe('ATTENTION')
    expect(evaluateInspectionCondition(['C'])).toBe('ATTENTION')
  })

  it('returns CRITICAL for multiple C or any X', () => {
    expect(evaluateInspectionCondition(['C', 'C'])).toBe('CRITICAL')
    expect(evaluateInspectionCondition(['A', 'X'])).toBe('CRITICAL')
  })
})

describe('evaluateSosCondition', () => {
  it('returns NORMAL when any good SOS code exists', () => {
    expect(evaluateSosCondition(['A', 'D'])).toBe('NORMAL')
    expect(evaluateSosCondition(['Normal'])).toBe('NORMAL')
  })

  it('returns ATTENTION for C without good codes', () => {
    expect(evaluateSosCondition(['C'])).toBe('ATTENTION')
  })

  it('matches legacy regex quirk: Attention contains A → NORMAL', () => {
    expect(evaluateSosCondition(['Attention'])).toBe('NORMAL')
  })

  it('returns CRITICAL for D, X, or Urgent without good codes', () => {
    expect(evaluateSosCondition(['D'])).toBe('CRITICAL')
    expect(evaluateSosCondition(['Urgent'])).toBe('CRITICAL')
  })
})

describe('evaluateOverallCondition', () => {
  it('prefers inspection over SOS', () => {
    expect(
      evaluateOverallCondition({
        inspections: ['A'],
        sosCodes: ['D']
      })
    ).toBe('NORMAL')
  })

  it('falls back to SOS when no inspection ratings', () => {
    expect(
      evaluateOverallCondition({
        inspections: [],
        sosCodes: ['Urgent']
      })
    ).toBe('CRITICAL')
  })

  it('returns null when both sources are empty', () => {
    expect(evaluateOverallCondition({ inspections: [], sosCodes: [] })).toBeNull()
  })
})

describe('computeOverallCondition', () => {
  it('uses inspection path when any inspection rating exists', () => {
    expect(
      computeOverallCondition({
        sosRating: 'D',
        sosCodes: ['D'],
        fcRating: 'C',
        mpsRating: null,
        viRating: null,
        ta2Rating: null,
        edRating: null
      })
    ).toBe('ATTENTION')
  })
})
