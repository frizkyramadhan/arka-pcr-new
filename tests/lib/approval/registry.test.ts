import { describe, expect, it } from 'vitest'

import {
  getForecastApprovalChain,
  PCR_FORECAST_APPROVAL_CHAIN,
  PCR_FORECAST_SHORT_APPROVAL_CHAIN,
  usesShortForecastApprovalChain
} from '@/lib/approval/registry'

describe('getForecastApprovalChain', () => {
  it('uses full chain for PTA Reman', () => {
    expect(getForecastApprovalChain({ isWarranty: false, pcrSupplyCategory: 'PTA_REMAN' })).toBe(
      PCR_FORECAST_APPROVAL_CHAIN
    )
  })

  it('uses full chain for New Component', () => {
    expect(getForecastApprovalChain({ isWarranty: false, pcrSupplyCategory: 'NEW_COMPONENT' })).toBe(
      PCR_FORECAST_APPROVAL_CHAIN
    )
  })

  it('uses short chain for Repair', () => {
    expect(getForecastApprovalChain({ isWarranty: false, pcrSupplyCategory: 'REPAIR' })).toBe(
      PCR_FORECAST_SHORT_APPROVAL_CHAIN
    )
  })

  it('uses short chain for warranty', () => {
    expect(getForecastApprovalChain({ isWarranty: true, pcrSupplyCategory: null })).toBe(
      PCR_FORECAST_SHORT_APPROVAL_CHAIN
    )
  })

  it('infers short chain from seeded approvals without directors', () => {
    const approvals = [
      { level: 'PS' },
      { level: 'PM' },
      { level: 'PLM' }
    ]

    expect(getForecastApprovalChain(false, approvals)).toBe(PCR_FORECAST_SHORT_APPROVAL_CHAIN)
  })
})

describe('usesShortForecastApprovalChain', () => {
  it('is true for Repair without warranty flag', () => {
    expect(usesShortForecastApprovalChain({ isWarranty: false, pcrSupplyCategory: 'REPAIR' })).toBe(true)
  })
})
