/**
 * Edit forecast OPEN — plan period (month/year), quarter, price, remark.
 */
import { useEffect, useState } from 'react'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'

import toast from 'react-hot-toast'

import CustomTextField from 'src/@core/components/mui/text-field'

import arkaApi from 'src/utils/arka-api'
import {
  deriveQuarterFromMonthInput,
  monthInputFromPlanPeriod,
  parsePriceComponentInput,
  planPeriodFromMonthInput
} from 'src/utils/forecast-plan-period'
import { validateForm } from 'src/utils/api-error-message'

import { forecastUpdateSchema } from '@/lib/validations/forecast'

const priceToFormValue = value => {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)

  return Number.isFinite(num) ? String(num) : ''
}

const ForecastEditDialog = ({ open, forecast, onClose, onSuccess }) => {
  const [form, setForm] = useState({ planMonth: '', quarter: 'Q1', priceComponent: '', remark: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !forecast) return

    setForm({
      planMonth: monthInputFromPlanPeriod(forecast.planPeriod),
      quarter: forecast.quarter ?? 'Q1',
      priceComponent: priceToFormValue(forecast.priceComponent),
      remark: forecast.remark ?? ''
    })
  }, [open, forecast])

  const handleChange = field => event => {
    setForm(prev => ({ ...prev, [field]: event.target.value }))
  }

  const handlePlanMonthChange = event => {
    const planMonth = event.target.value
    setForm(prev => ({
      ...prev,
      planMonth,
      quarter: planMonth ? deriveQuarterFromMonthInput(planMonth) : prev.quarter
    }))
  }

  const handleSubmit = async () => {
    if (!forecast?.idForecast) return

    const planPeriod = planPeriodFromMonthInput(form.planMonth)
    if (!planPeriod) {
      toast.error('Plan period: select month and year')

      return
    }

    const priceParsed = parsePriceComponentInput(form.priceComponent)

    const result = validateForm(forecastUpdateSchema, {
      planPeriod,
      quarter: form.quarter || deriveQuarterFromMonthInput(form.planMonth),
      remark: form.remark || null,
      priceComponent: priceParsed ?? null
    })

    if (!result.success) {
      toast.error(result.message)

      return
    }

    setSaving(true)
    try {
      await arkaApi.put(`/forecasts/${forecast.idForecast}`, result.data)
      toast.success('Forecast updated')
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth='md'>
      <DialogTitle>Edit Forecast</DialogTitle>
      <DialogContent>
        <Grid container spacing={4} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              fullWidth
              type='month'
              label='Plan Period'
              value={form.planMonth}
              onChange={handlePlanMonthChange}
              InputLabelProps={{ shrink: true }}
              helperText='Month and year only'
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField select fullWidth label='Quarter' value={form.quarter} onChange={handleChange('quarter')}>
              {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                <MenuItem key={q} value={q}>
                  {q}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              fullWidth
              type='number'
              label='Price Component'
              value={form.priceComponent}
              onChange={handleChange('priceComponent')}
              helperText='Component price (IDR)'
              inputProps={{ min: 0, step: 1 }}
            />
          </Grid>
          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label='Remark'
              value={form.remark}
              onChange={handleChange('remark')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ForecastEditDialog
