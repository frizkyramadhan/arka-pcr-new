import { describe, expect, it } from 'vitest'

import {
  carriesCompHourOnSpawn,
  resetClosedLifeOnClose,
  resolveClosedLifeMetrics,
  resolveSpawnCompHour
} from '@/lib/replacement/close-life-policy'

describe('close-life-policy', () => {
  const calc = { currentLife: 9952, lifePercent: 55.3 }

  it('Repair CONTINUE_LIFE carries compHour and keeps closed life', () => {
    const ctx = { isWarranty: false, pcrSupplyCategory: 'REPAIR', repairLifeMode: 'CONTINUE_LIFE' }
    expect(carriesCompHourOnSpawn(ctx)).toBe(true)
    expect(resetClosedLifeOnClose(ctx)).toBe(false)
    expect(resolveSpawnCompHour(9952, ctx)).toBe(9952)
    expect(resolveClosedLifeMetrics(calc, ctx)).toEqual({ compLife: 9952, lifePercent: 55.3 })
  })

  it('Repair RETURN behaves like CONTINUE_LIFE for spawn and closed life', () => {
    const ctx = { isWarranty: false, pcrSupplyCategory: 'REPAIR', repairLifeMode: 'RETURN' }
    expect(resolveSpawnCompHour(4200, ctx)).toBe(4200)
    expect(resetClosedLifeOnClose(ctx)).toBe(false)
  })

  it('Repair BACK_TO_ZERO resets closed life and spawns compHour 0', () => {
    const ctx = { isWarranty: false, pcrSupplyCategory: 'REPAIR', repairLifeMode: 'BACK_TO_ZERO' }
    expect(carriesCompHourOnSpawn(ctx)).toBe(false)
    expect(resetClosedLifeOnClose(ctx)).toBe(true)
    expect(resolveSpawnCompHour(16796, ctx)).toBe(0)
    expect(resolveClosedLifeMetrics(calc, ctx)).toEqual({ compLife: 0, lifePercent: 0 })
  })

  it('warranty and PTA/New always spawn compHour 0 with normal closed life', () => {
    const warranty = { isWarranty: true, pcrSupplyCategory: null, repairLifeMode: null }
    const pta = { isWarranty: false, pcrSupplyCategory: 'PTA_REMAN', repairLifeMode: null }
    expect(resolveSpawnCompHour(5000, warranty)).toBe(0)
    expect(resolveSpawnCompHour(5000, pta)).toBe(0)
    expect(resolveClosedLifeMetrics(calc, warranty)).toEqual({ compLife: 9952, lifePercent: 55.3 })
  })
})
