import { describe, expect, it } from 'vitest'

import {
  formatPriceComponentDisplay,
  formatPriceComponentInputValue,
  parsePriceComponentValue
} from '@/lib/utils/price-component'

describe('parsePriceComponentValue', () => {
  it('parses plain digits', () => {
    expect(parsePriceComponentValue('150000000')).toBe(150000000)
    expect(parsePriceComponentValue(2500000)).toBe(2500000)
  })

  it('parses Indonesian thousand separators', () => {
    expect(parsePriceComponentValue('1.500.000')).toBe(1500000)
    expect(parsePriceComponentValue('1,500,000')).toBe(1500000)
  })

  it('returns undefined for empty or invalid input', () => {
    expect(parsePriceComponentValue('')).toBeUndefined()
    expect(parsePriceComponentValue('abc')).toBeUndefined()
    expect(parsePriceComponentValue('-1')).toBeUndefined()
  })
})

describe('formatPriceComponentDisplay', () => {
  it('formats with Indonesian thousand separators', () => {
    expect(formatPriceComponentDisplay(1500000)).toBe('1.500.000')
    expect(formatPriceComponentDisplay('1.500.000')).toBe('1.500.000')
  })
})

describe('formatPriceComponentInputValue', () => {
  it('formats typed or pasted digits', () => {
    expect(formatPriceComponentInputValue('1500000')).toBe('1.500.000')
    expect(formatPriceComponentInputValue('1.500.000')).toBe('1.500.000')
    expect(formatPriceComponentInputValue('1,500,000')).toBe('1.500.000')
  })
})
