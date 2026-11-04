/** History sheet stamp + WO parsing for BD seed import. */
import { describe, expect, it } from 'vitest'

import {
  normalizeWorkOrder,
  parseHistoryStamp,
  workOrderDocNum
} from '@/lib/dmbd/history-sheet-parse'

describe('parseHistoryStamp', () => {
  it('parses site-style dates with time', () => {
    const date = parseHistoryStamp('19 Oct 26 14:05')
    expect(date).toBeInstanceOf(Date)
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(9)
    expect(date?.getDate()).toBe(19)
    expect(date?.getHours()).toBe(14)
    expect(date?.getMinutes()).toBe(5)
  })

  it('parses day-first slash dates', () => {
    const date = parseHistoryStamp('19/10/2026 14:05')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(9)
    expect(date?.getDate()).toBe(19)
    expect(date?.getHours()).toBe(14)
  })

  it('parses Excel serial numbers', () => {
    // 45984 ≈ 2025-12-28 depending on serial; just ensure non-null Date for a mid-range serial.
    const date = parseHistoryStamp(44984.586805)
    expect(date).toBeInstanceOf(Date)
    expect(date && date.getFullYear()).toBeGreaterThanOrEqual(2020)
  })

  it('parses ISO dates', () => {
    const date = parseHistoryStamp('2026-10-19T08:05:00')
    expect(date?.toISOString().startsWith('2026-10-19')).toBe(true)
  })

  it('returns null for empty values', () => {
    expect(parseHistoryStamp('')).toBeNull()
    expect(parseHistoryStamp(null)).toBeNull()
  })
})

describe('normalizeWorkOrder', () => {
  it('strips spaces for matching', () => {
    expect(normalizeWorkOrder(' 2451 82038 ')).toBe('245182038')
    expect(workOrderDocNum('WO-245182038')).toBe(245182038)
  })
})
