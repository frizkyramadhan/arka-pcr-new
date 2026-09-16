import { describe, expect, it } from 'vitest'

import {
  cannibalPairMatchesForecast,
  resolveConvertTargetFleetUnitId
} from '@/lib/forecasts/cannibal-link'

describe('resolveConvertTargetFleetUnitId', () => {
  it('uses the other unit when Return To Other Unit', () => {
    expect(
      resolveConvertTargetFleetUnitId({
        fleetUnitId: 1,
        pcrReturnTo: 'OTHER_UNIT',
        returnOtherFleetUnitId: 22
      })
    ).toBe(22)
  })

  it('keeps the forecast unit otherwise', () => {
    expect(
      resolveConvertTargetFleetUnitId({
        fleetUnitId: 1,
        pcrReturnTo: 'ORIGINAL_UNIT',
        returnOtherFleetUnitId: 22
      })
    ).toBe(1)
  })
})

describe('cannibalPairMatchesForecast', () => {
  const lines = [
    { type: 'REMOVE', fleetUnitId: 1, pairIndex: 0, compDesc: 'ENGINE' },
    { type: 'INSTALL', fleetUnitId: 2, pairIndex: 0, compDesc: 'ENGINE' }
  ]

  it('matches REMOVE donor and INSTALL other unit for the component', () => {
    expect(
      cannibalPairMatchesForecast(lines, {
        removeFleetUnitId: 1,
        installFleetUnitId: 2,
        compDesc: 'engine'
      })
    ).toBe(true)
  })

  it('rejects the wrong install unit', () => {
    expect(
      cannibalPairMatchesForecast(lines, {
        removeFleetUnitId: 1,
        installFleetUnitId: 9,
        compDesc: 'ENGINE'
      })
    ).toBe(false)
  })
})
