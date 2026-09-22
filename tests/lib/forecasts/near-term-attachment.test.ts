import { describe, expect, it } from 'vitest'

import {
  monthsBetweenPlanAndSubmit,
  requiresNearTermAttachment
} from '@/lib/forecasts/near-term-attachment'

describe('monthsBetweenPlanAndSubmit', () => {
  it('returns 0 for same calendar month', () => {
    expect(monthsBetweenPlanAndSubmit('2026-09-01', new Date(2026, 8, 22))).toBe(0)
  })

  it('returns positive when plan is ahead of submit', () => {
    expect(monthsBetweenPlanAndSubmit('2026-12-01', new Date(2026, 8, 15))).toBe(3)
    expect(monthsBetweenPlanAndSubmit('2027-01-01', new Date(2026, 8, 15))).toBe(4)
  })

  it('returns negative when plan is in the past', () => {
    expect(monthsBetweenPlanAndSubmit('2026-07-01', new Date(2026, 8, 22))).toBe(-2)
  })
})

describe('requiresNearTermAttachment', () => {
  const submit = new Date(2026, 8, 22) // Sep 2026

  it('requires for same month (0)', () => {
    expect(requiresNearTermAttachment('2026-09-01', submit)).toBe(true)
  })

  it('requires for +3 months inclusive', () => {
    expect(requiresNearTermAttachment('2026-12-01', submit)).toBe(true)
  })

  it('does not require for +4 months', () => {
    expect(requiresNearTermAttachment('2027-01-01', submit)).toBe(false)
  })

  it('requires for past plan periods (diff < 0)', () => {
    expect(requiresNearTermAttachment('2026-06-01', submit)).toBe(true)
  })
})
