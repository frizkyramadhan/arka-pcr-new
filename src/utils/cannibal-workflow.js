/**
 * Client mirror of lib/cannibal/workflow.ts for cannibal BA stepper UI.
 */
export const CANNIBAL_WORKFLOW_STEPS = [
  { key: 'plant', label: 'Plant Input' },
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

export function getCannibalStatusLabel(statusBa) {
  switch (statusBa) {
    case 'DRAFT':
      return 'Draft — Plant Input'
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
    case 'CANCELLED':
      return 'Cancelled'
    default:
      return statusBa ?? '—'
  }
}
