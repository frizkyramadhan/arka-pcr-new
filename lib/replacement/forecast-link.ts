/**
 * Linked PCR forecast on a replacement WO — BA approval gate for row actions.
 */
import type { PcrForecast, BaPcr } from '@prisma/client'

import { pickActiveBaPcr, resolveBaPcrStatus } from '@/lib/forecasts/ba-pcr-helpers'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'

export const replacementForecastInclude = {
  idForecast: true,
  forecastStatus: true,
  convertedAt: true,
  deletedAt: true,
  baPcrs: {
    where: { isActive: true },
    take: 1,
    select: {
      baPcrStatus: true,
      noBaPcr: true,
      statusBaPcr: true
    }
  }
} as const

export type ReplacementLinkedForecast = {
  idForecast: number
  forecastStatus: string
  baPcrStatus: string
  noBaPcr: string | null
  convertedAt: string | null
  baFullyApproved: boolean
}

type ForecastLinkSource = Pick<PcrForecast, 'idForecast' | 'forecastStatus' | 'convertedAt' | 'deletedAt'> & {
  baPcrs?: Array<Pick<BaPcr, 'baPcrStatus' | 'noBaPcr' | 'statusBaPcr'>>
}

export function mapReplacementLinkedForecast(
  forecast: ForecastLinkSource | null | undefined
): ReplacementLinkedForecast | null {
  if (!forecast || forecast.deletedAt) return null

  const active = pickActiveBaPcr(forecast.baPcrs)
  const baPcrStatus = resolveBaPcrStatus(active)

  return {
    idForecast: forecast.idForecast,
    forecastStatus: forecast.forecastStatus,
    baPcrStatus,
    noBaPcr: active?.noBaPcr ?? null,
    convertedAt: forecast.convertedAt ? toIsoDateOnly(forecast.convertedAt) : null,
    baFullyApproved: baPcrStatus === 'APPROVED'
  }
}

/** OPEN WO requires linked forecast with APPROVED BA PCR before edit/close. */
export function canExecuteReplacementActions(
  linkedForecast: ReplacementLinkedForecast | null | undefined
): boolean {
  if (!linkedForecast) return false

  return linkedForecast.baFullyApproved
}

/** Server guard — OPEN WO must be linked to forecast with fully approved BA PCR. */
export async function assertReplacementBaApproved(idRep: number): Promise<void> {
  const linked = await prisma.pcrForecast.findFirst({
    where: { idRep, deletedAt: null },
    include: { baPcrs: { where: { isActive: true }, take: 1 } }
  })

  if (!linked) {
    throw new Error('Create a PCR forecast for this work order before editing or closing')
  }

  const baPcrStatus = resolveBaPcrStatus(pickActiveBaPcr(linked.baPcrs))
  if (baPcrStatus !== 'APPROVED') {
    throw new Error(`BA PCR must be fully approved before this action (current: ${baPcrStatus})`)
  }
}

export function attachLinkedForecast<T extends { forecast?: ForecastLinkSource | null }>(
  row: T
): Omit<T, 'forecast'> & { linkedForecast: ReplacementLinkedForecast | null; forecast: { idForecast: number; forecastStatus: string } | null } {
  const linkedForecast = mapReplacementLinkedForecast(row.forecast)
  const forecast = linkedForecast
    ? { idForecast: linkedForecast.idForecast, forecastStatus: linkedForecast.forecastStatus }
    : null

  const { forecast: _forecast, ...rest } = row

  return {
    ...rest,
    forecast,
    linkedForecast
  }
}
