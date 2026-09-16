/**
 * Link PCR forecast Return To Other Unit with a cannibal BA pair.
 */
export type CannibalLinkPair = {
  removeFleetUnitId: number
  installFleetUnitId: number
  compDesc?: string | null
}

export type CannibalLineLike = {
  type: string
  fleetUnitId: number
  pairIndex?: number | null
  compDesc?: string | null
}

export function resolveConvertTargetFleetUnitId(forecast: {
  fleetUnitId: number
  pcrReturnTo?: string | null
  returnOtherFleetUnitId?: number | null
}): number {
  if (forecast.pcrReturnTo === 'OTHER_UNIT' && forecast.returnOtherFleetUnitId) {
    return forecast.returnOtherFleetUnitId
  }

  return forecast.fleetUnitId
}

export const BLOCKED_CANNIBAL_LINK_STATUSES = ['EXPIRED', 'CANCELLED', 'CANCEL'] as const

export function isBlockedCannibalLinkStatus(statusBa: string | null | undefined) {
  return BLOCKED_CANNIBAL_LINK_STATUSES.includes(
    String(statusBa ?? '') as (typeof BLOCKED_CANNIBAL_LINK_STATUSES)[number]
  )
}

export function cannibalPairMatchesForecast(
  lines: CannibalLineLike[],
  pair: CannibalLinkPair
): boolean {
  const grouped = new Map<number, { remove?: CannibalLineLike; install?: CannibalLineLike }>()

  for (const line of lines) {
    const index = line.pairIndex ?? 0
    const slot = grouped.get(index) ?? {}
    if (line.type === 'REMOVE') slot.remove = line
    if (line.type === 'INSTALL') slot.install = line
    grouped.set(index, slot)
  }

  const expectedDesc = String(pair.compDesc ?? '').trim().toLowerCase()

  for (const slot of grouped.values()) {
    if (slot.remove?.fleetUnitId !== pair.removeFleetUnitId) continue
    if (slot.install?.fleetUnitId !== pair.installFleetUnitId) continue
    if (!expectedDesc) return true

    const removeDesc = String(slot.remove.compDesc ?? '').trim().toLowerCase()
    const installDesc = String(slot.install.compDesc ?? '').trim().toLowerCase()
    if (removeDesc === expectedDesc && installDesc === expectedDesc) return true
  }

  return false
}
