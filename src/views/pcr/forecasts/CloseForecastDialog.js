/**
 * Admin-only cancel forecast without replacement close path.
 */
import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import CustomTextField from 'src/@core/components/mui/text-field'

import arkaApi from 'src/utils/arka-api'

const CloseForecastDialog = ({ open, forecast, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false)
  const [remark, setRemark] = useState('')

  useEffect(() => {
    if (!open || !forecast) return

    setRemark(forecast.remark ?? '')
  }, [open, forecast])

  const handleSubmit = async () => {
    if (!forecast?.idForecast) return

    setSubmitting(true)
    try {
      await arkaApi.post(`/forecasts/${forecast.idForecast}/close`, {
        remark: remark.trim() || null
      })
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Cancel failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Cancel Forecast</DialogTitle>
      <DialogContent>
        {forecast ? (
          <>
            <Alert severity='warning' sx={{ mb: 3 }}>
              Admin-only. Normal closure requires closing the linked work order with a PO number.
            </Alert>
            <Typography variant='body2' sx={{ mb: 3, color: 'text.secondary' }}>
              {forecast.unitNo} — {forecast.compDesc ?? forecast.commod?.comp?.compDesc ?? 'Component'}
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <CustomTextField
                  fullWidth
                  multiline
                  minRows={2}
                  label='Remark'
                  value={remark}
                  onChange={event => setRemark(event.target.value)}
                />
              </Grid>
            </Grid>
          </>
        ) : null}
      </DialogContent>
      <DialogActions className='dialog-actions-dense'>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant='contained' color='warning' onClick={handleSubmit} disabled={submitting}>
          Cancel Forecast
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CloseForecastDialog
