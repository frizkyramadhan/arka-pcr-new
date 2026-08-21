/**
 * Cannibal list row actions — staged workflow actions per status.
 */
export const buildCannibalActions = (
  row,
  { canEdit, canSubmitPlant, canSubmitApproval, canClose, canEditExecution, canEditLogistic, currentUserId },
  onAction
) => {
  const actions = [{ key: 'view', label: 'View Detail', onClick: () => onAction('view', row) }]

  if (canEditLogistic && row.statusBa === 'PENDING_LOGISTICS') {
    actions.push({ key: 'edit-logistic', label: 'Edit Logistic', onClick: () => onAction('edit-logistic', row) })
  }

  if (canEdit && ['DRAFT', 'REJECTED'].includes(row.statusBa)) {
    actions.push({ key: 'edit', label: 'Edit Plant Section', onClick: () => onAction('edit', row) })
  }

  if (canSubmitPlant && ['DRAFT', 'REJECTED'].includes(row.statusBa)) {
    actions.push({
      key: 'submit-to-requestor',
      label: 'Send to Requestor',
      onClick: () => onAction('submit-to-requestor', row)
    })
  }

  const isAssignedRequestor =
    row.statusBa === 'PENDING_REQUESTOR' && Number(currentUserId) > 0 && Number(currentUserId) === Number(row.requestedBy)

  if (isAssignedRequestor) {
    actions.push({
      key: 'confirm-requestor',
      label: 'Confirm Request',
      onClick: () => onAction('confirm-requestor', row)
    })
    actions.push({
      key: 'reject-requestor',
      label: 'Reject Request',
      onClick: () => onAction('reject-requestor', row)
    })
  }

  if (canEdit && row.statusBa === 'DRAFT') {
    actions.push({ key: 'delete', label: 'Delete', onClick: () => onAction('delete', row) })
  }

  if (canEditExecution && row.statusBa === 'PENDING_DOCUMENT') {
    actions.push({ key: 'execution', label: 'Update Documentation', onClick: () => onAction('execution', row) })
  }

  if (canSubmitApproval && row.statusBa === 'PENDING_DOCUMENT') {
    if (row.mrNo?.trim() && row.prNo?.trim()) {
      actions.push({ key: 'submit', label: 'Submit for Approval', onClick: () => onAction('submit', row) })
    }
  }

  if (canClose && row.statusBa === 'APPROVED') {
    actions.push({ key: 'close', label: 'Close BA', onClick: () => onAction('close', row) })
  }

  if (canEdit && ['SUBMITTED', 'REJECTED', 'PENDING_REQUESTOR', 'PENDING_LOGISTICS', 'PENDING_DOCUMENT'].includes(row.statusBa)) {
    actions.push({ key: 'cancel', label: 'Cancel', onClick: () => onAction('cancel', row) })
  }

  return actions
}
