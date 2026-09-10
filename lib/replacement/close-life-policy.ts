/**
 * Component life behavior on replacement close — driven by forecast PCR supply / repair life mode.
 * @see docs/pcr-supply-kinds-glossary.md (Repair life modes)
 */
import type { RepairLifeMode } from '@/lib/forecasts/pcr-supply'

export type CloseLifeForecastContext = {
  isWarranty?: boolean | null
  pcrSupplyCategory?: string | null
  repairLifeMode?: string | null
}

function isRepairContinueMode(mode: string | null | undefined): mode is RepairLifeMode {
  return mode === 'RETURN' || mode === 'CONTINUE_LIFE'
}

/** Repair Return/Continue: spawned OPEN row keeps accumulated compHour; all other paths spawn 0. */
export function carriesCompHourOnSpawn(ctx: CloseLifeForecastContext): boolean {
  if (ctx.isWarranty) return false
  if (ctx.pcrSupplyCategory !== 'REPAIR') return false

  return isRepairContinueMode(ctx.repairLifeMode)
}

/** Repair Back to Zero: closed row life metrics reset to 0 on close. */
export function resetClosedLifeOnClose(ctx: CloseLifeForecastContext): boolean {
  if (ctx.isWarranty) return false
  if (ctx.pcrSupplyCategory !== 'REPAIR') return false

  return ctx.repairLifeMode === 'BACK_TO_ZERO'
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
