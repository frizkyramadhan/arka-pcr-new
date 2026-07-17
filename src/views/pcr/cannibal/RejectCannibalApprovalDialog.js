/**
 * Dialog konfirmasi reject approval Cannibal BA.
 */
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import { useState } from 'react'

import { CANNIBAL_APPROVAL_LEVEL_LABELS } from 'src/utils/forecast-approval-auth'

const RejectCannibalApprovalDialog = ({ open, approval, onClose, onConfirm, loading = false }) => {
  const [remark, setRemark] = useState('')

  const handleClose = () => {
    setRemark('')
    onClose?.()
  }

  const handleConfirm = () => {
    onConfirm?.(remark.trim() || null)
    setRemark('')
  }

  const levelLabel = approval?.level
    ? CANNIBAL_APPROVAL_LEVEL_LABELS[approval.level] ?? approval.level
    : null

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Reject BA Approval</DialogTitle>
      <DialogContent>
        {levelLabel ? (
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label={`Rejection note (${levelLabel})`}
            value={remark}
            onChange={e => setRemark(e.target.value)}
            sx={{ mt: 1 }}
          />
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant='contained' color='error' onClick={handleConfirm} disabled={loading}>
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RejectCannibalApprovalDialog
