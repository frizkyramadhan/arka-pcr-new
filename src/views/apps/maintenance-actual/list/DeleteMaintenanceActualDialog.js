/**
 * Delete confirmation for a maintenance actual.
 * Loads GET /maintenance-actuals/:id/delete-impact so the user sees how many findings and photos
 * go with it before DELETE /maintenance-actuals/:id runs.
 */
import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import arkaApi from 'src/utils/arka-api'

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const ImpactLine = ({ icon, children, muted }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
    <Icon icon={icon} fontSize='1.25rem' />
    <Typography sx={{ color: muted ? 'text.secondary' : 'text.primary' }}>{children}</Typography>
  </Box>
)

const DeleteMaintenanceActualDialog = ({ actualId, onClose, onDeleted }) => {
  const open = Boolean(actualId)
  const [impact, setImpact] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!actualId) return
    let active = true
    setImpact(null)
    setLoadError('')
    arkaApi
      .get(`/maintenance-actuals/${actualId}/delete-impact`)
      .then(res => active && setImpact(res.data))
      .catch(err => active && setLoadError(err?.response?.data?.error || err?.message || 'Could not load details'))

    return () => {
      active = false
    }
  }, [actualId])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await arkaApi.delete(`/maintenance-actuals/${actualId}`)
      toast.success('Actual deleted')
      onDeleted?.()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const photoTotal = impact ? impact.actualPhotoCount + impact.failurePhotoCount : 0

  return (
    <Dialog open={open} onClose={deleting ? undefined : onClose} maxWidth='xs' fullWidth>
      <DialogTitle>Delete maintenance actual?</DialogTitle>
      <DialogContent>
        {!impact && !loadError ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : null}
        {loadError ? <Alert severity='error'>{loadError}</Alert> : null}
        {impact ? (
          <>
            <Typography sx={{ mb: 2 }}>
              <strong>{impact.registerNo}</strong>
              {impact.unitNo ? ` · ${impact.unitNo}` : ''}
            </Typography>
            <Typography variant='body2' sx={{ mb: 1, color: 'text.secondary' }}>
              These will be deleted together:
            </Typography>
            <ImpactLine icon='tabler:clipboard-check'>This actual</ImpactLine>
            <ImpactLine icon='tabler:alert-triangle' muted={!impact.failureCount}>
              {impact.failureCount ? plural(impact.failureCount, 'finding') : 'No findings'} recorded on this actual
            </ImpactLine>
            <ImpactLine icon='tabler:photo' muted={!photoTotal}>
              {photoTotal
                ? `${plural(photoTotal, 'photo')} (${impact.actualPhotoCount} on the actual, ${impact.failurePhotoCount} on findings)`
                : 'No photos'}
            </ImpactLine>
            <Alert severity='warning' sx={{ mt: 3 }}>
              This cannot be undone. The plan date becomes free to record again. Findings from earlier actuals are
              kept.
            </Alert>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button variant='contained' color='error' onClick={handleDelete} disabled={!impact || deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteMaintenanceActualDialog
