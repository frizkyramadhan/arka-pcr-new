/**
 * Copy for requestor confirm / reject / send confirmation dialogs (detail & list pages).
 */

export function getSubmitToRequestorDialog(noBa) {
  const label = noBa ? `BA ${noBa}` : 'this cannibal request'

  return {
    title: 'Send to Requestor',
    message: `Send ${label} to the requestor for confirmation before logistics?`,
    confirmLabel: 'Send',
    confirmColor: 'info'
  }
}

export function getConfirmRequestorDialog(noBa) {
  const label = noBa ? `BA ${noBa}` : 'this cannibal request'

  return {
    title: 'Confirm Request',
    message: `Confirm ${label}? The BA will be sent to logistics for the next step.`,
    confirmLabel: 'Confirm',
    confirmColor: 'success'
  }
}

export function getRejectRequestorConfirmDialog(noBa) {
  const label = noBa ? `BA ${noBa}` : 'this cannibal request'

  return {
    title: 'Reject Request',
    message: `Reject ${label}? You will be asked to provide a rejection remark. The BA will return to plant for revision.`,
    confirmLabel: 'Continue',
    confirmColor: 'error'
  }
}
