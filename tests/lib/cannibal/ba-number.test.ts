import { describe, expect, it } from 'vitest'

import {
  buildBaNumberPrefix,
  formatLegacyBaNumber,
  parseLegacyBaSequence,
  projectKeyForBaNumber
} from '@/lib/cannibal/ba-number'

describe('projectKeyForBaNumber', () => {
  it('uses three-digit prefix for site codes', () => {
    expect(projectKeyForBaNumber('017C')).toBe('017')
    expect(projectKeyForBaNumber('004W')).toBe('004')
    expect(projectKeyForBaNumber('000H')).toBe('000')
  })

  it('keeps alphanumeric project codes', () => {
    expect(projectKeyForBaNumber('APS')).toBe('APS')
  })
})

describe('parseLegacyBaSequence', () => {
  it('parses numeric legacy numbers', () => {
    expect(parseLegacyBaSequence('2652017794', '017C')).toBe(794)
    expect(parseLegacyBaSequence('2552017793', '017C')).toBe(793)
    expect(parseLegacyBaSequence('22520111021', '011C')).toBe(1021)
  })

  it('parses APS legacy numbers', () => {
    expect(parseLegacyBaSequence('2552APS020', 'APS')).toBe(20)
    expect(parseLegacyBaSequence('2052APS001', 'APS')).toBe(1)
  })

  it('rejects non-legacy formats', () => {
    expect(parseLegacyBaSequence('BA-017C-20260001', '017C')).toBeNull()
  })
})

describe('formatLegacyBaNumber', () => {
  it('builds expected legacy numbers', () => {
    expect(formatLegacyBaNumber('017C', 795, 2026)).toBe('2652017795')
    expect(buildBaNumberPrefix('017C', 2026)).toBe('2652017')
    expect(formatLegacyBaNumber('APS', 21, 2025)).toBe('2552APS21')
  })
})
