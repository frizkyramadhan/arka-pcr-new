/**
 * Dialog konfirmasi hapus — pola Vuexy DialogConfirmation (dialog-actions-dense).
 */
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DialogContentText from '@mui/material/DialogContentText'

const DeleteConfirmDialog = ({
  open,
  title,
  message,
  loading,
  confirmLabel = 'Delete',
  confirmColor = 'error',
  onClose,
  onConfirm
}) => {
  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      aria-labelledby='alert-dialog-title'
      aria-describedby='alert-dialog-description'
      onClose={(event, reason) => {
        if (reason !== 'backdropClick') {
          onClose()
        }
      }}
    >
      <DialogTitle id='alert-dialog-title'>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id='alert-dialog-description' sx={{ whiteSpace: 'pre-line' }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions className='dialog-actions-dense'>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button color={confirmColor} variant='contained' onClick={onConfirm} disabled={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteConfirmDialog
