import type { BaPcr, PcrForecast, PcrForecastApproval } from '@prisma/client'

import { parseRejectionHistory } from '@/lib/forecasts/ba-pcr-rejection-history'

export type BaPcrWithRelations = BaPcr & {
  approvals?: (PcrForecastApproval & {
    approver?: { idUser: number; fullName: string | null; username: string } | null
  })[]
  submitter?: { idUser: number; fullName: string | null; username: string } | null
}

export type ForecastWithBaPcrs = PcrForecast & {
  baPcrs?: BaPcrWithRelations[]
}

/** Active BA for a forecast — isActive=true, else newest row. */
export function pickActiveBaPcr(baPcrs: BaPcrWithRelations[] | null | undefined): BaPcrWithRelations | null {
  if (!baPcrs?.length) return null

  const active = baPcrs.find(row => row.isActive)
  if (active) return active

  return [...baPcrs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0]
}

export function resolveBaPcrStatus(baPcr: Pick<BaPcr, 'baPcrStatus'> | null | undefined): string {
  return baPcr?.baPcrStatus ?? 'PENDING'
}

export function canRefreshBaPcr(baPcr: Pick<BaPcr, 'baPcrStatus'> | null | undefined): boolean {
  const status = resolveBaPcrStatus(baPcr)

  return status === 'PENDING' || status === 'REJECTED'
}

export function canSubmitBaPcr(baPcr: Pick<BaPcr, 'baPcrStatus'> | null | undefined): boolean {
  const status = resolveBaPcrStatus(baPcr)

  return status === 'PENDING' || status === 'REJECTED'
}

export function canDeleteForecast(
  forecast: Pick<PcrForecast, 'forecastStatus'>,
  baPcr: Pick<BaPcr, 'baPcrStatus'> | null | undefined
): boolean {
  if (forecast.forecastStatus !== 'OPEN') return false
  const status = resolveBaPcrStatus(baPcr)

  return status === 'PENDING' || status === 'REJECTED'
}

export function mapBaPcrForClient(ba: BaPcrWithRelations) {
  return {
    idBaPcr: ba.idBaPcr,
    isActive: ba.isActive,
    noBaPcr: ba.noBaPcr,
    baPcrStatus: ba.baPcrStatus,
    statusBaPcr: ba.statusBaPcr,
    baPcrDate: ba.baPcrDate,
    baSubmittedAt: ba.baPcrDate,
    submittedBy: ba.submittedBy,
    submitter: ba.submitter ?? null,
    approvals: ba.approvals ?? [],
    rejectedAt: ba.rejectedAt,
    approvedAt: ba.approvedAt,
    createdAt: ba.createdAt,
    rejectionHistory: parseRejectionHistory(ba.rejectionHistory)
  }
}

export function sortBaPcrsNewestFirst(baPcrs: BaPcrWithRelations[]): BaPcrWithRelations[] {
  return [...baPcrs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function flattenForecastForBaPcr<T extends PcrForecast>(forecast: T, baPcr: BaPcrWithRelations) {
  const mapped = mapBaPcrForClient(baPcr)

  return {
    ...forecast,
    baPcr: mapped,
    baPcrList: [],
    idBaPcr: mapped.idBaPcr,
    baPcrStatus: mapped.baPcrStatus,
    statusBaPcr: mapped.statusBaPcr,
    noBaPcr: mapped.noBaPcr,
    baSubmittedAt: mapped.baSubmittedAt,
    submittedBy: mapped.submittedBy,
    submitter: mapped.submitter,
    approvals: mapped.approvals,
    rejectionHistory: mapped.rejectionHistory,
    status: forecast.forecastStatus
  }
}

export function flattenForecastBaFields<T extends ForecastWithBaPcrs>(forecast: T) {
  const baPcrs = forecast.baPcrs ?? []
  const active = pickActiveBaPcr(baPcrs)
  const baPcrList = sortBaPcrsNewestFirst(baPcrs).map(mapBaPcrForClient)

  return {
    ...forecast,
    baPcr: active ? mapBaPcrForClient(active) : null,
    baPcrList,
    idBaPcr: active?.idBaPcr ?? null,
    baPcrStatus: resolveBaPcrStatus(active),
    statusBaPcr: active?.statusBaPcr ?? null,
    noBaPcr: active?.noBaPcr ?? null,
    baSubmittedAt: active?.baPcrDate ?? null,
    submittedBy: active?.submittedBy ?? null,
    submitter: active?.submitter ?? null,
    approvals: active?.approvals ?? [],
    rejectionHistory: parseRejectionHistory(active?.rejectionHistory),
    status: forecast.forecastStatus
  }
}

/** Prisma filter: active BA PCR with given status(es). */
export function activeBaPcrSomeFilter(
  baPcrStatus: string | { in: string[] }
): { baPcrs: { some: { isActive: true; baPcrStatus: typeof baPcrStatus } } } {
  return {
    baPcrs: {
      some: {
        isActive: true,
        baPcrStatus
      }
    }
  }
}

/** Prisma filter: forecast has no BA rows yet (treated as PENDING). */
export function forecastWithoutBaPcrFilter(): { baPcrs: { none: Record<string, never> } } {
  return { baPcrs: { none: {} } }
}
