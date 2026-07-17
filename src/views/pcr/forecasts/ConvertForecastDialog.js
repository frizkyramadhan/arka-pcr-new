/**
 * Konfirmasi convert forecast → replacement WO (manual oleh Planner PF / pengaju).
 */
import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import arkaApi from 'src/utils/arka-api'

const formatDate = value => (value ? String(value).slice(0, 10) : '—')

const ConvertForecastDialog = ({ open, forecast, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false)

  const handleConvert = async () => {
    if (!forecast?.idForecast) return

    setSubmitting(true)
    try {
      const { data } = await arkaApi.post(`/forecasts/${forecast.idForecast}/convert`)
      onSuccess?.(data)
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Convert failed')
    } finally {
      setSubmitting(false)
    }
  }

  const compLabel = forecast?.compDesc ?? forecast?.commod?.comp?.compDesc ?? '—'

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Convert to Work Order</DialogTitle>
      <DialogContent>
        {forecast ? (
          <>
            <Alert severity='info' sx={{ mb: 3 }}>
              Forecast yang sudah disetujui akan dibuatkan <strong>Work Order (PCR Actual)</strong> dengan status OPEN.
              Proses ini dilakukan manual oleh Planner Foreman atau pengaju BA PCR.
            </Alert>
            <Typography variant='body2' sx={{ mb: 1 }}>
              <strong>Unit:</strong> {forecast.unitNo}
            </Typography>
            <Typography variant='body2' sx={{ mb: 1 }}>
              <strong>Component:</strong> {compLabel}
            </Typography>
            <Typography variant='body2' sx={{ mb: 1 }}>
              <strong>Plan Period:</strong> {formatDate(forecast.planPeriod)}
            </Typography>
            <Typography variant='body2'>
              <strong>Life %:</strong> {forecast.lifePercent != null ? `${Number(forecast.lifePercent)}%` : '—'}
            </Typography>
          </>
        ) : null}
      </DialogContent>
      <DialogActions className='dialog-actions-dense'>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleConvert} disabled={submitting || !forecast}>
          Create Work Order
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConvertForecastDialog
