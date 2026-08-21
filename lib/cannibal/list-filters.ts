/**
 * Parse cannibal list query params — shared by list API, export, and period matrix.
 */
import type { BaApprovalLevel } from '@/lib/cannibal/types'
import { BA_APPROVAL_LEVELS } from '@/lib/cannibal/types'
import type { CannibalListFilters } from '@/lib/cannibal/service'

const LOGISTIC_STATEMENT_VALUES = ['confirmed', 'pending', 'not_started'] as const

function pick(value: string | null): string | null {
  const trimmed = value?.trim()
  
return trimmed ? trimmed : null
}

export function parseCannibalListFilters(searchParams: URLSearchParams): CannibalListFilters {
  const logisticStatement = pick(searchParams.get('logisticStatement'))
  const approvalLevel = pick(searchParams.get('approvalLevel'))
  const postingMonth = pick(searchParams.get('postingMonth'))
  const postingDateParam = pick(searchParams.get('postingDate'))
  const fleetUnitIdRaw = pick(searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId'))

  let postingDate: string | null = null
  if (postingMonth && /^\d{4}-\d{2}$/.test(postingMonth)) {
    postingDate = `${postingMonth}-01`
  } else if (postingDateParam) {
    postingDate = /^\d{4}-\d{2}$/.test(postingDateParam) ? `${postingDateParam}-01` : postingDateParam
  }

  const fleetUnitIdNum = fleetUnitIdRaw ? Number(fleetUnitIdRaw) : null

  return {
    projectCode: pick(searchParams.get('projectCode')),
    statusBa: pick(searchParams.get('status')),
    noBa: pick(searchParams.get('noBa')),
    postingDate,
    postingDateFrom: pick(searchParams.get('postingDateFrom')),
    postingDateTo: pick(searchParams.get('postingDateTo')),
    fleetUnitId: fleetUnitIdNum && Number.isFinite(fleetUnitIdNum) ? fleetUnitIdNum : null,
    removedUnitNo: pick(searchParams.get('removedUnitNo')),
    installedUnitNo: pick(searchParams.get('installedUnitNo')),
    pn: pick(searchParams.get('pn')),
    component: pick(searchParams.get('component')),
    logisticStatement:
      logisticStatement && LOGISTIC_STATEMENT_VALUES.includes(logisticStatement as (typeof LOGISTIC_STATEMENT_VALUES)[number])
        ? (logisticStatement as CannibalListFilters['logisticStatement'])
        : null,
    approvalLevel:
      approvalLevel && (BA_APPROVAL_LEVELS as readonly string[]).includes(approvalLevel)
        ? (approvalLevel as BaApprovalLevel)
        : null,
    search: pick(searchParams.get('search')) ?? pick(searchParams.get('q'))
  }
}
