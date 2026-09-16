/**
 * Client mirror of lib/cannibal/workflow.ts for cannibal BA stepper UI.
 */
export const CANNIBAL_WORKFLOW_STEPS = [
  { key: 'plant', label: 'Plant Input' },
  { key: 'requestor', label: 'Request By' },
  { key: 'logistics', label: 'Logistics Statement' },
  { key: 'documentation', label: 'Record & Documentation' },
  { key: 'approval', label: 'Approval' },
  { key: 'readyToClose', label: 'Ready to Close' },
  { key: 'closed', label: 'Closed' }
]

export function getCannibalWorkflowStep(statusBa) {
  switch (statusBa) {
    case 'DRAFT':
    case 'REJECTED':
      return 'plant'
    case 'PENDING_REQUESTOR':
      return 'requestor'
    case 'PENDING_LOGISTICS':
      return 'logistics'
    case 'PENDING_DOCUMENT':
      return 'documentation'
    case 'SUBMITTED':
    case 'OPEN':
      return 'approval'
    case 'APPROVED':
      return 'readyToClose'
    case 'CLOSED':
      return 'closed'
    default:
      return 'plant'
  }
}

export function getCannibalWorkflowStepIndex(statusBa) {
  const step = getCannibalWorkflowStep(statusBa)

  return CANNIBAL_WORKFLOW_STEPS.findIndex(item => item.key === step)
}

export function getReopenExpiredDialog(noBa, fromStatus) {
  const label = noBa ? `BA ${noBa}` : 'this cannibal BA'
  const stage = getCannibalStatusLabel(fromStatus)

  return {
    title: 'Reopen expired BA?',
    message: `Reopen ${label} at ${stage}? The 5-day SLA restarts from now. Use this only as a failsafe — prefer a new BA if the request itself is stale.`,
    confirmLabel: 'Reopen',
    confirmColor: 'warning'
  }
}

export function getCannibalStatusLabel(statusBa) {
  switch (statusBa) {
    case 'DRAFT':
      return 'Draft — Plant Input'
    case 'PENDING_REQUESTOR':
      return 'Pending Requestor'
    case 'PENDING_LOGISTICS':
      return 'Pending Logistics'
    case 'PENDING_DOCUMENT':
      return 'Record & Documentation'
    case 'SUBMITTED':
    case 'OPEN':
      return 'In Approval'
    case 'APPROVED':
      return 'Approved — Ready to Close'
    case 'REJECTED':
      return 'Rejected'
    case 'CLOSED':
      return 'Closed'
    case 'EXPIRED':
      return 'Expired — reopen or submit a new BA'
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return statusBa ?? '—'
  }
}
