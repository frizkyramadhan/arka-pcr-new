// ** React Imports
import { useEffect, useMemo, useRef, useState } from 'react'

// ** MUI Imports
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Third Party Imports
import toast from 'react-hot-toast'

// ** Utils
import arkaApi from 'src/utils/arka-api'
import {
  deriveQuarterFromMonthInput,
  formatPriceComponentDisplay,
  parsePriceComponentInput,
  planPeriodFromMonthInput
} from 'src/utils/forecast-plan-period'
import { validateForm } from 'src/utils/api-error-message'

// ** Validation
import { forecastCreateSchema } from '@/lib/validations/forecast'

// ** View Components
import ForecastComponentPreview from 'src/views/pcr/forecasts/ForecastComponentPreview'
import PriceComponentTextField from 'src/views/pcr/forecasts/PriceComponentTextField'

const defaultForm = {
  fleetUnitId: '',
  idMod: '',
  planMonth: '',
  quarter: 'Q1',
  priceComponent: '',
  remark: ''
}

const ForecastDialog = ({
  open,
  onClose,
  equipments = [],
  fleetUnitId: presetFleetUnitId,
  fleetModelId: presetFleetModelId,
  presetIdMod,
  onSubmit
}) => {
  const [form, setForm] = useState(defaultForm)
  const [policies, setPolicies] = useState([])
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  /** Prevents auto-prefill from overwriting manual price input. */
  const lastPricePrefillIdMod = useRef(null)
  const priceTouched = useRef(false)
  const isUnitScoped = presetFleetUnitId != null && presetFleetUnitId !== ''
  const isComponentLocked = presetIdMod != null && presetIdMod !== ''

  const resolvedFleetUnitId = useMemo(() => {
    if (isUnitScoped) {
      const id = Number(presetFleetUnitId)

      return Number.isFinite(id) && id > 0 ? id : null
    }

    const parsed = Number(form.fleetUnitId)

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [form.fleetUnitId, isUnitScoped, presetFleetUnitId])

  useEffect(() => {
    if (!open) return

    setForm({
      ...defaultForm,
      fleetUnitId: isUnitScoped ? String(presetFleetUnitId) : '',
      idMod: presetIdMod != null ? String(presetIdMod) : ''
    })
    setPolicies([])
    setPreview(null)
    setPreviewLoading(false)
    lastPricePrefillIdMod.current = null
    priceTouched.current = false
  }, [open, isUnitScoped, presetFleetUnitId, presetIdMod])

  useEffect(() => {
    if (!open) return

    const modelId = isUnitScoped
      ? presetFleetModelId
      : equipments.find(item => String(item.id) === form.fleetUnitId)?.model_id

    if (!modelId) {
      setPolicies([])

      return
    }

    arkaApi
      .get('/model-components', { params: { fleetModelId: modelId, pageSize: 100 } })
      .then(res => setPolicies(Array.isArray(res.data?.rows) ? res.data.rows : Array.isArray(res.data) ? res.data : []))
      .catch(() => setPolicies([]))
  }, [open, form.fleetUnitId, equipments, isUnitScoped, presetFleetModelId])

  useEffect(() => {
    if (!open) return

    const idMod = Number(form.idMod)
    if (!resolvedFleetUnitId || !form.idMod || !Number.isFinite(idMod) || idMod <= 0) {
      setPreview(null)
      setPreviewLoading(false)

      return
    }

    const controller = new AbortController()
    setPreviewLoading(true)
    setPreview(null)

    arkaApi
      .get('/forecasts/preview', {
        params: { fleetUnitId: resolvedFleetUnitId, idMod },
        signal: controller.signal,
        skipGlobalErrorToast: true
      })
      .then(res => setPreview(res.data))
      .catch(error => {
        if (controller.signal.aborted || error?.code === 'ERR_CANCELED') return
        setPreview(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false)
      })

    return () => controller.abort()
  }, [open, form.idMod, resolvedFleetUnitId])

  // Reset prefill lock when user picks a different component
  useEffect(() => {
    lastPricePrefillIdMod.current = null
    priceTouched.current = false
  }, [form.idMod])

  // Auto-fill price once per component (after preview/policy load) — never overwrite manual input
  useEffect(() => {
    if (!form.idMod || previewLoading) return
    if (priceTouched.current) return
    if (lastPricePrefillIdMod.current === form.idMod) return

    const policy = policies.find(item => String(item.idMod) === String(form.idMod))
    const rawPrice = preview?.component?.price ?? policy?.price
    const price = rawPrice != null ? Number(rawPrice) : null

    if (price == null || !Number.isFinite(price)) {
      lastPricePrefillIdMod.current = form.idMod

      return
    }

    const priceText = formatPriceComponentDisplay(price)
    setForm(prev => {
      if (priceTouched.current) return prev

      return { ...prev, priceComponent: priceText }
    })
    lastPricePrefillIdMod.current = form.idMod
  }, [form.idMod, previewLoading, preview?.component?.price, policies])

  const handleChange = field => event => {
    if (field === 'priceComponent') {
      priceTouched.current = true
    }
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

  const handleSubmit = () => {
    const planPeriod = planPeriodFromMonthInput(form.planMonth)
    if (!planPeriod) {
      toast.error('Plan period: select month and year')

      return
    }

    const trimmedPrice = String(form.priceComponent ?? '').trim()
    let priceComponent

    if (trimmedPrice !== '') {
      priceComponent = parsePriceComponentInput(form.priceComponent)
      if (priceComponent === undefined) {
        toast.error('Price component: enter a valid amount')

        return
      }
    }

    const payload = {
      fleetUnitId: form.fleetUnitId || resolvedFleetUnitId,
      idMod: form.idMod,
      planPeriod,
      quarter: form.quarter || deriveQuarterFromMonthInput(form.planMonth),
      remark: form.remark || null,
      ...(priceComponent !== undefined ? { priceComponent } : {})
    }

    const result = validateForm(forecastCreateSchema, payload)

    if (!result.success) {
      toast.error(result.message)

      return
    }

    onSubmit(result.data)
  }

  const showPreview = Boolean(form.idMod) && Boolean(resolvedFleetUnitId)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle>Create PCR Forecast</DialogTitle>
      <DialogContent>
        <Grid container spacing={4} sx={{ mt: 0 }}>
          {!isUnitScoped ? (
            <Grid item xs={12} sm={6}>
              <CustomTextField
                select
                fullWidth
                label='Equipment'
                value={form.fleetUnitId}
                onChange={handleChange('fleetUnitId')}
              >
                {equipments.map(item => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {item.unit_no} — {item.model}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
          ) : null}
          <Grid item xs={12} sm={isUnitScoped ? 12 : 6}>
            <CustomTextField
              select
              fullWidth
              label='Component (Policy)'
              value={form.idMod}
              onChange={handleChange('idMod')}
              disabled={!resolvedFleetUnitId || isComponentLocked}
              helperText={isComponentLocked ? 'Locked to the selected replacement component' : undefined}
            >
              {policies.map(item => (
                <MenuItem key={item.idMod} value={String(item.idMod)}>
                  {item.comp?.compDesc ?? item.idMod}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>

          {showPreview ? (
            <ForecastComponentPreview preview={preview} loading={previewLoading} />
          ) : null}

          <Grid item xs={12} sm={4}>
            <CustomTextField
              fullWidth
              type='month'
              label='Plan Period'
              value={form.planMonth}
              onChange={handlePlanMonthChange}
              InputLabelProps={{ shrink: true }}
              helperText='Month and year only (stored as 1st of month)'
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
            <PriceComponentTextField
              fullWidth
              label='Price Component'
              value={form.priceComponent}
              onChange={handleChange('priceComponent')}
              helperText='Component price (IDR) — default from model-component policy'
            />
          </Grid>
          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              multiline
              minRows={2}
              label='Remark'
              value={form.remark}
              onChange={handleChange('remark')}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSubmit}>
          Create & Snapshot
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ForecastDialog
