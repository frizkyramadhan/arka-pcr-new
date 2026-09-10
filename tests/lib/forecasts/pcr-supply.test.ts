import { describe, expect, it } from 'vitest'

import {
  canUpdateSubmittedPcrType,
  formatPcrSupplySummary,
  missingPcrSupplySubmitMessage,
  remarkHintFromCompDesc,
  resolveForecastRemark,
  resolveForecastPath,
  storedForecastPath,
  toPcrSupplyPrismaData
} from '@/lib/forecasts/pcr-supply'
import { forecastCreateSchema, forecastPcrTypeUpdateSchema } from '@/lib/validations/forecast'

const planPeriod = '2026-09-01'

describe('remarkHintFromCompDesc', () => {
  it('maps cylinder / suspension keywords to Reseal', () => {
    expect(remarkHintFromCompDesc('CYLINDER HEAD')).toBe('Reseal')
    expect(remarkHintFromCompDesc('Suspension Cylinder')).toBe('Reseal')
    expect(remarkHintFromCompDesc('SILINDER ANGGKAT')).toBe('Reseal')
  })

  it('maps engine to Top Overhaul', () => {
    expect(remarkHintFromCompDesc('ENGINE')).toBe('Top Overhaul')
  })

  it('returns empty for other components', () => {
    expect(remarkHintFromCompDesc('FINAL DRIVE')).toBe('')
  })
})

describe('toPcrSupplyPrismaData', () => {
  it('clears type on warranty', () => {
    expect(
      toPcrSupplyPrismaData({ pcrSupplyCategory: 'REPAIR', repairSite: 'ON_SITE' }, { isWarranty: true })
    ).toEqual({
      pcrSupplyCategory: null,
      repairSite: null,
      repairVendorKind: null,
      repairDealerName: null,
      repairLifeMode: null
    })
  })

  it('nulls nested Repair when category is PTA', () => {
    expect(
      toPcrSupplyPrismaData(
        {
          pcrSupplyCategory: 'PTA_REMAN',
          repairSite: 'OUT_SITE',
          repairVendorKind: 'DEALER',
          repairDealerName: 'UT',
          repairLifeMode: 'RETURN'
        },
        { isWarranty: false }
      )
    ).toEqual({
      pcrSupplyCategory: 'PTA_REMAN',
      repairSite: null,
      repairVendorKind: null,
      repairDealerName: null,
      repairLifeMode: null
    })
  })

  it('keeps dealer name only for Out Site + Dealer', () => {
    expect(
      toPcrSupplyPrismaData(
        {
          pcrSupplyCategory: 'REPAIR',
          repairSite: 'OUT_SITE',
          repairVendorKind: 'DEALER',
          repairDealerName: ' UT ',
          repairLifeMode: 'CONTINUE_LIFE'
        },
        { isWarranty: false }
      )
    ).toMatchObject({
      pcrSupplyCategory: 'REPAIR',
      repairSite: 'OUT_SITE',
      repairVendorKind: 'DEALER',
      repairDealerName: 'UT',
      repairLifeMode: 'CONTINUE_LIFE'
    })
  })
})

describe('forecastCreateSchema PCR type', () => {
  const base = { fleetUnitId: 1, idMod: 2, planPeriod }

  it('requires category on non-warranty create', () => {
    const parsed = forecastCreateSchema.safeParse(base)
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.some(issue => issue.path[0] === 'pcrSupplyCategory')).toBe(true)
  })

  it('allows warranty create without category', () => {
    const parsed = forecastCreateSchema.safeParse({ ...base, isWarranty: true })
    expect(parsed.success).toBe(true)
  })

  it('requires nested Repair fields', () => {
    const parsed = forecastCreateSchema.safeParse({ ...base, pcrSupplyCategory: 'REPAIR' })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    const paths = parsed.error.issues.map(issue => issue.path[0])
    expect(paths).toContain('repairSite')
    expect(paths).toContain('repairLifeMode')
  })

  it('requires dealer name for Out Site Dealer', () => {
    const parsed = forecastPcrTypeUpdateSchema.safeParse({
      pcrSupplyCategory: 'REPAIR',
      repairSite: 'OUT_SITE',
      repairVendorKind: 'DEALER',
      repairLifeMode: 'RETURN'
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.some(issue => issue.path[0] === 'repairDealerName')).toBe(true)
  })
})

describe('submitted empty type gate', () => {
  it('allows dedicated update after BA submit when category is empty', () => {
    expect(
      canUpdateSubmittedPcrType({
        status: 'OPEN',
        isWarranty: false,
        pcrSupplyCategory: null,
        baPcrStatus: 'IN_REVIEW'
      })
    ).toBe(true)
  })

  it('blocks submit message for pending non-warranty without type', () => {
    expect(
      missingPcrSupplySubmitMessage({
        isWarranty: false,
        pcrSupplyCategory: null,
        baPcrStatus: 'PENDING'
      })
    ).toMatch(/PCR type/i)
  })
})

describe('formatPcrSupplySummary', () => {
  it('joins Repair nested labels', () => {
    expect(
      formatPcrSupplySummary({
        pcrSupplyCategory: 'REPAIR',
        repairSite: 'OUT_SITE',
        repairVendorKind: 'APS',
        repairLifeMode: 'RETURN'
      })
    ).toBe('Repair · Out Site · APS · Return')
  })
})

describe('resolveForecastRemark', () => {
  it('keeps non-empty user remark', () => {
    expect(resolveForecastRemark('Custom note', 'CYLINDER HEAD')).toBe('Custom note')
  })

  it('defaults cylinder to Reseal', () => {
    expect(resolveForecastRemark('', 'Suspension Cylinder')).toBe('Reseal')
    expect(resolveForecastRemark(null, 'ENGINE BLOCK')).toBe('Top Overhaul')
  })
})

describe('storedForecastPath', () => {
  it('returns warranty when isWarranty is true', () => {
    expect(storedForecastPath({ isWarranty: true, pcrSupplyCategory: null })).toBe('warranty')
  })

  it('returns normal when category is set', () => {
    expect(storedForecastPath({ isWarranty: false, pcrSupplyCategory: 'PTA_REMAN' })).toBe('normal')
  })

  it('returns null for legacy rows without explicit path', () => {
    expect(storedForecastPath({ isWarranty: false, pcrSupplyCategory: null })).toBe(null)
  })
})

describe('resolveForecastPath', () => {
  it('prefers user selection', () => {
    expect(resolveForecastPath('warranty', true, null)).toBe('warranty')
  })

  it('falls back to saved path', () => {
    expect(resolveForecastPath(null, true, 'normal')).toBe('normal')
  })

  it('auto-normal when above policy and no saved path', () => {
    expect(resolveForecastPath(null, false, null)).toBe('normal')
  })

  it('requires choice when under policy and legacy', () => {
    expect(resolveForecastPath(null, true, null)).toBe(null)
  })
})
