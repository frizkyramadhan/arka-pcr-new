/**
 * Dedicated dialog to fill PCR type after BA submit when category is still empty.
 */
import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'

import toast from 'react-hot-toast'

import arkaApi from 'src/utils/arka-api'
import { formatApiError, validateForm } from 'src/utils/api-error-message'

import { emptyPcrSupplyForm, pcrSupplyFormFromForecast, pcrSupplyPayloadFromForm } from '@/lib/forecasts/pcr-supply'
import { forecastPcrTypeUpdateSchema } from '@/lib/validations/forecast'

import ForecastPcrTypeFields from 'src/views/pcr/forecasts/ForecastPcrTypeFields'

const ForecastPcrTypeDialog = ({ open, forecast, onClose, onSuccess }) => {
  const [form, setForm] = useState(emptyPcrSupplyForm())
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(pcrSupplyFormFromForecast(forecast))
    setFieldErrors({})
    setFormError('')
  }, [open, forecast])

  const handleSave = async () => {
    if (!forecast?.idForecast) return

    const result = validateForm(forecastPcrTypeUpdateSchema, pcrSupplyPayloadFromForm(form))
    if (!result.success) {
      setFieldErrors(result.fieldErrors ?? {})
      setFormError(result.message)

      return
    }

    setSaving(true)
    try {
      await arkaApi.post(`/forecasts/${forecast.idForecast}/pcr-type`, result.data)
      toast.success('PCR type updated')
      onSuccess?.()
      onClose()
    } catch (error) {
      setFormError(formatApiError(error, 'Failed to update PCR type'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth='md' fullWidth>
      <DialogTitle>Update PCR Type</DialogTitle>
      <DialogContent>
        <Alert severity='info' sx={{ mb: 4 }}>
          BA PCR is already submitted. Update PCR type only — plan, price, and remark stay unchanged here.
        </Alert>
        {formError ? (
          <Alert severity='error' sx={{ mb: 4 }} onClose={() => setFormError('')}>
            {formError}
          </Alert>
        ) : null}
        <Grid container spacing={4}>
          <ForecastPcrTypeFields value={form} onChange={setForm} fieldErrors={fieldErrors} />
        </Grid>
      </DialogContent>
      <DialogActions className='dialog-actions-dense'>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Update PCR Type'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ForecastPcrTypeDialog
