/**
 * Component life on replacement close — driven by forecast Lifetime Mode for all non-warranty PCR types.
 */
import { normalizeLifetimeMode } from '@/lib/forecasts/pcr-supply'

export type CloseLifeForecastContext = {
  isWarranty?: boolean | null
  pcrSupplyCategory?: string | null
  repairLifeMode?: string | null
}

/** Continue Life (including legacy RETURN): spawned OPEN keeps accumulated compHour. */
export function carriesCompHourOnSpawn(ctx: CloseLifeForecastContext): boolean {
  if (ctx.isWarranty) return false
  if (!ctx.pcrSupplyCategory) return false

  return normalizeLifetimeMode(ctx.repairLifeMode) === 'CONTINUE_LIFE'
}

/** Back to Zero: closed row life metrics reset to 0. */
export function resetClosedLifeOnClose(ctx: CloseLifeForecastContext): boolean {
  if (ctx.isWarranty) return false
  if (!ctx.pcrSupplyCategory) return false

  return normalizeLifetimeMode(ctx.repairLifeMode) === 'BACK_TO_ZERO'
}

export function resolveSpawnCompHour(closedCompHour: number, ctx: CloseLifeForecastContext): number {
  return carriesCompHourOnSpawn(ctx) ? closedCompHour : 0
}

export function resolveClosedLifeMetrics(
  calc: { currentLife: number; lifePercent: number },
  ctx: CloseLifeForecastContext
): { compLife: number; lifePercent: number } {
  if (resetClosedLifeOnClose(ctx)) {
    return { compLife: 0, lifePercent: 0 }
  }

  return {
    compLife: calc.currentLife,
    lifePercent: Math.round(calc.lifePercent * 10) / 10
  }
}
