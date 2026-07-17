import { describe, expect, it } from 'vitest'

import {
  buildItemGroupFilter,
  buildItemsSearchFilter,
  escapeODataString,
  mapSapItemToMaterial,
  normalizeMaterialSearchQuery
} from '@/lib/sap-b1/odata'

describe('escapeODataString', () => {
  it('doubles single quotes', () => {
    expect(escapeODataString("O'Brien")).toBe("O''Brien")
  })
})

describe('buildItemGroupFilter', () => {
  it('returns null when no groups', () => {
    expect(buildItemGroupFilter([])).toBeNull()
  })

  it('builds OR clause for multiple groups', () => {
    expect(buildItemGroupFilter([101, 102])).toBe('(ItemsGroupCode eq 101 or ItemsGroupCode eq 102)')
  })
})

describe('normalizeMaterialSearchQuery', () => {
  it('extracts PN from MUI option label with em dash', () => {
    expect(normalizeMaterialSearchQuery('SP-0350004190 — ALTERNATOR 24V 50A')).toBe('SP-0350004190')
  })

  it('extracts PN from hyphen separator', () => {
    expect(normalizeMaterialSearchQuery('PN-001 - Pump')).toBe('PN-001')
  })

  it('keeps plain PN unchanged', () => {
    expect(normalizeMaterialSearchQuery('SP-0350004190')).toBe('SP-0350004190')
  })
})

describe('buildItemsSearchFilter', () => {
  it('searches code and names with active filters', () => {
    const filter = buildItemsSearchFilter({ query: 'FILTER', itemGroupCodes: [101] })

    expect(filter).toContain("startswith(ItemCode,'FILTER')")
    expect(filter).toContain("contains(ItemName,'FILTER')")
    expect(filter).toContain("Valid eq 'tYES'")
    expect(filter).toContain('ItemsGroupCode eq 101')
  })

  it('escapes quotes in query', () => {
    const filter = buildItemsSearchFilter({ query: "A'B" })
    expect(filter).toContain("A''B")
  })
})

describe('mapSapItemToMaterial', () => {
  it('maps ItemCode and ItemName', () => {
    expect(
      mapSapItemToMaterial({
        ItemCode: 'PN-001',
        ItemName: 'Hydraulic Pump',
        ForeignName: 'Pompa',
        ItemsGroupCode: 101
      })
    ).toEqual({
      pn: 'PN-001',
      compDesc: 'Hydraulic Pump',
      foreignName: 'Pompa',
      itemsGroupCode: 101,
      onHand: null
    })
  })

  it('maps QuantityOnStock to onHand', () => {
    expect(
      mapSapItemToMaterial({
        ItemCode: 'PN-002',
        ItemName: 'Filter',
        QuantityOnStock: 4
      })
    ).toMatchObject({ pn: 'PN-002', onHand: 4 })
  })

  it('returns null without ItemCode', () => {
    expect(mapSapItemToMaterial({ ItemName: 'No code' })).toBeNull()
  })
})
