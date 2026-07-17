/**
 * Cannibal list — filter option constants & query param builder (UI ↔ API).
 */
import { CANNIBAL_APPROVAL_LEVEL_ORDER } from 'src/utils/cannibal-approval-workflow'
import { CANNIBAL_APPROVAL_LEVEL_LABELS } from 'src/utils/forecast-approval-auth'

export const CANNIBAL_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_LOGISTICS', label: 'Pending Logistics' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'OPEN', label: 'In Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' }
]

export const CANNIBAL_LOGISTIC_FILTER_OPTIONS = [
  { value: '', label: 'All logistic stmt' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'not_started', label: 'Not started' }
]

export const CANNIBAL_APPROVAL_FILTER_OPTIONS = [
  { value: '', label: 'All approval' },
  ...CANNIBAL_APPROVAL_LEVEL_ORDER.map(level => ({
    value: level,
    label: `Waiting ${CANNIBAL_APPROVAL_LEVEL_LABELS[level] ?? level}`
  }))
]

export const EMPTY_CANNIBAL_FILTERS = {
  noBa: '',
  projectCode: '',
  postingDateFrom: '',
  postingDateTo: '',
  removedUnitNo: '',
  installedUnitNo: '',
  pn: '',
  component: '',
  logisticStatement: '',
  approvalLevel: '',
  status: ''
}

/** Map UI filter state → API query params for list/export. */
export function buildCannibalFilterParams(filters) {
  const params = {}

  if (filters.noBa) params.noBa = filters.noBa
  if (filters.projectCode) params.projectCode = filters.projectCode
  if (filters.postingDateFrom) params.postingDateFrom = filters.postingDateFrom
  if (filters.postingDateTo) params.postingDateTo = filters.postingDateTo
  if (filters.removedUnitNo) params.removedUnitNo = filters.removedUnitNo
  if (filters.installedUnitNo) params.installedUnitNo = filters.installedUnitNo
  if (filters.pn) params.pn = filters.pn
  if (filters.component) params.component = filters.component
  if (filters.logisticStatement) params.logisticStatement = filters.logisticStatement
  if (filters.approvalLevel) params.approvalLevel = filters.approvalLevel
  if (filters.status) params.status = filters.status

  return params
}

/** Build URLSearchParams for export download. */
export function buildCannibalExportQuery(filters) {
  const params = new URLSearchParams()

  Object.entries(buildCannibalFilterParams(filters)).forEach(([key, value]) => {
    params.set(key, value)
  })

  return params
}
