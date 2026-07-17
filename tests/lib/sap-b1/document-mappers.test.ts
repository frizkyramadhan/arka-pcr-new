import { describe, expect, it } from 'vitest'

import {
  mapPurchaseOrderSummary,
  resolveDocumentExpiredLabel,
  resolveExpiredLabel,
  resolvePoExpiredLabel
} from '@/lib/sap-b1/document-mappers'

describe('document-mappers expiration', () => {
  it('marks PO summary expired from U_MIS_ExpStatus', () => {
    const summary = mapPurchaseOrderSummary({
      DocNum: 260201896,
      DocDate: '2026-01-01',
      DocumentStatus: 'bost_Open',
      U_MIS_ExpStatus: 'Expired'
    })

    expect(summary?.expiredLabel).toBe('Expired')
  })

  it('does not mark closed PO expired from past Valid To alone', () => {
    const summary = mapPurchaseOrderSummary({
      DocNum: 260201896,
      DocDate: '2026-03-18T00:00:00Z',
      DocumentStatus: 'bost_Close',
      Cancelled: 'tNO',
      U_MIS_ValidTo: '2026-06-18T00:00:00Z'
    })

    expect(summary?.expiredLabel).toBeNull()
    expect(
      resolvePoExpiredLabel({
        DocumentStatus: 'bost_Close',
        U_MIS_ValidTo: '2026-06-18T00:00:00Z'
      })
    ).toBeNull()
  })

  it('marks open PO expired from past Valid To', () => {
    const summary = mapPurchaseOrderSummary({
      DocNum: 260201897,
      DocDate: '2026-01-01',
      DocumentStatus: 'bost_Open',
      U_MIS_ValidTo: '2020-01-01'
    })

    expect(summary?.expiredLabel).toMatch(/^Expired/)
  })

  it('does not treat Not Expired status as expired', () => {
    expect(
      mapPurchaseOrderSummary({
        DocNum: 1,
        DocumentStatus: 'bost_Open',
        U_MIS_ExpStatus: 'Not Expired'
      })?.expiredLabel
    ).toBeNull()
  })

  it('marks PR summary expired from past required date', () => {
    expect(
      resolveExpiredLabel({
        U_MIS_RequiredDate: '2020-01-01'
      })
    ).toMatch(/^Expired/)
  })

  it('resolves expired label from docStatusLabel fallback', () => {
    expect(
      resolveDocumentExpiredLabel({
        docStatusLabel: 'Expired',
        expiredLabel: null,
        expStatus: null
      })
    ).toBe('Expired')
  })
})
