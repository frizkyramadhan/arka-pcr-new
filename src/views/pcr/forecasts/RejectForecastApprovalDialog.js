/**
 * Catatan reject approval BA PCR.
 */
import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

import CustomTextField from 'src/@core/components/mui/text-field'

const RejectForecastApprovalDialog = ({ open, approval, onClose, onConfirm, loading }) => {
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) setNote('')
  }, [open, approval?.idForecastApproval])

  const handleConfirm = () => {
    onConfirm?.(note.trim() || null)
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Reject BA PCR — {approval?.level}</DialogTitle>
      <DialogContent>
        <CustomTextField
          fullWidth
          multiline
          minRows={3}
          label='Rejection note (optional)'
          value={note}
          onChange={event => setNote(event.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant='contained' color='error' onClick={handleConfirm} disabled={loading}>
          Reject
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RejectForecastApprovalDialog
