/**
 * Dialog reject Request By — remark wajib (acuan naikkan order P1).
 */
import { useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'

const RejectCannibalRequestorDialog = ({ open, onClose, onConfirm, loading = false }) => {
  const [remark, setRemark] = useState('')

  const handleClose = () => {
    setRemark('')
    onClose?.()
  }

  const trimmed = remark.trim()

  const handleConfirm = () => {
    if (!trimmed) return
    onConfirm?.(trimmed)
    setRemark('')
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Reject Request By</DialogTitle>
      <DialogContent>
        <Typography variant='body2' sx={{ color: 'text.secondary', mb: 2, mt: 0.5 }}>
          Rejecting returns the BA to plant as reference to raise a P1 order. Plant can edit and resubmit.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          required
          multiline
          minRows={3}
          label='Rejection remark'
          value={remark}
          onChange={e => setRemark(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant='contained' color='error' onClick={handleConfirm} disabled={loading || !trimmed}>
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RejectCannibalRequestorDialog
