/**
 * Context for close / reopen dialogs — latest HM, reference HM by date, mismatch flags.
 */
import type { Session } from 'next-auth'

import { getHourMeterNearestToDate } from '@/lib/hour-meter/hm-reference'
import { getLatestHourMeterForUnit } from '@/lib/hour-meter/service'
import { getReplacementById } from '@/lib/replacement/service'
import { prisma } from '@/lib/prisma'
import { toIsoDateOnly } from '@/lib/utils/date-only'

export type ReplacementCloseContext = {
  mode: 'close'
  idRep: number
  woNo: string | null
  postingHm: number
  lastHmRep: number
  woDate: string | null
  woEndDate: string | null
  latestHmUnit: number | null
  latestHmDate: string | null
  referenceHmUnit: number | null
  referenceHmDate: string | null
  referenceDate: string | null
  hasLinkedForecast: boolean
  mrNo: string | null
  prNo: string | null
  poNo: string | null
  returnOldcoreDate: string | null
  spbBaReturnOldcore: string | null
}

export type ReplacementReopenContext = {
  mode: 'reopen'
  idRep: number
  woNo: string | null
  closedHmUnit: number
  woEndDate: string | null
  latestHmUnit: number | null
  latestHmDate: string | null
  referenceHmUnit: number | null
  referenceHmDate: string | null
  hmMismatch: boolean
  hmDriftHours: number | null
}

function resolveReferenceDate(woEndDate: Date | null, woDate: Date | null, repDate: Date): Date {
  if (woEndDate) return woEndDate
  if (woDate) return woDate

  return repDate
}

export async function getReplacementCloseContext(
  session: Session,
  idRep: number
): Promise<ReplacementCloseContext | null> {
  const existing = await getReplacementById(session, idRep)
  if (!existing || existing.woStatus !== 'OPEN') return null

  const referenceDate = resolveReferenceDate(existing.woEndDate, existing.woDate, existing.repDate)

  const [latestHm, referenceHm, linkedForecast] = await Promise.all([
    getLatestHourMeterForUnit(existing.fleetUnitId),
    getHourMeterNearestToDate(existing.fleetUnitId, referenceDate),
    prisma.pcrForecast.findUnique({ where: { idRep }, select: { idForecast: true } })
  ])

  return {
    mode: 'close',
    idRep: existing.idRep,
    woNo: existing.woNo,
    postingHm: Number(existing.hmRep),
    lastHmRep: Number(existing.lastHmRep ?? 0),
    woDate: toIsoDateOnly(existing.woDate),
    woEndDate: toIsoDateOnly(existing.woEndDate),
    latestHmUnit: latestHm ? Number(latestHm.hmUnit) : null,
    latestHmDate: latestHm ? toIsoDateOnly(latestHm.dateHm) : null,
    referenceHmUnit: referenceHm ? Number(referenceHm.hmUnit) : null,
    referenceHmDate: referenceHm ? toIsoDateOnly(referenceHm.dateHm) : null,
    referenceDate: toIsoDateOnly(referenceDate),
    hasLinkedForecast: Boolean(linkedForecast),
    mrNo: existing.mrNo,
    prNo: existing.prNo,
    poNo: existing.poNo,
    returnOldcoreDate: toIsoDateOnly(existing.returnOldcoreDate),
    spbBaReturnOldcore: existing.spbBaReturnOldcore
  }
}

export async function getReplacementReopenContext(
  session: Session,
  idRep: number
): Promise<ReplacementReopenContext | null> {
  const existing = await getReplacementById(session, idRep)
  if (!existing || existing.woStatus !== 'CLOSE') return null

  const referenceDate = existing.woEndDate ?? existing.woDate ?? existing.repDate

  const [latestHm, referenceHm] = await Promise.all([
    getLatestHourMeterForUnit(existing.fleetUnitId),
    getHourMeterNearestToDate(existing.fleetUnitId, referenceDate)
  ])

  const closedHmUnit = Number(existing.hmRep)
  const latestHmUnit = latestHm ? Number(latestHm.hmUnit) : null

  const hmDriftHours =
    latestHmUnit != null && Number.isFinite(closedHmUnit) ? latestHmUnit - closedHmUnit : null
  const hmMismatch = hmDriftHours != null && hmDriftHours !== 0

  return {
    mode: 'reopen',
    idRep: existing.idRep,
    woNo: existing.woNo,
    closedHmUnit,
    woEndDate: toIsoDateOnly(existing.woEndDate),
    latestHmUnit,
    latestHmDate: latestHm ? toIsoDateOnly(latestHm.dateHm) : null,
    referenceHmUnit: referenceHm ? Number(referenceHm.hmUnit) : null,
    referenceHmDate: referenceHm ? toIsoDateOnly(referenceHm.dateHm) : null,
    hmMismatch,
    hmDriftHours
  }
}
