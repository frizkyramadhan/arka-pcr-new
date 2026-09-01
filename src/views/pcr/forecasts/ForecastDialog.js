// ** React Imports
import { useEffect, useMemo, useRef, useState } from 'react'

// ** MUI Imports
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'

// ** Custom Component Import
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Utils
import arkaApi from 'src/utils/arka-api'
import {
  deriveQuarterFromMonthInput,
  formatPriceComponentDisplay,
  parsePriceComponentInput,
  planPeriodFromMonthInput
} from 'src/utils/forecast-plan-period'
import { formatApiError, getFieldError, validateForm } from 'src/utils/api-error-message'

// ** Validation
import { forecastCreateSchema } from '@/lib/validations/forecast'
import { isUnderPolicy } from '@/lib/forecasts/warranty'

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

const CONFIRM_NORMAL =
  'Create this PCR forecast with the full BA approval chain (PS → PM → PLM → Direksi).\n\nDo you want to continue?'

const CONFIRM_WARRANTY =
  'Create this PCR forecast as Pergantian Warranty.\nApproval stops at Plant Manager (PS → PM → PLM).\n\nDo you want to continue?'

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
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingPayload, setPendingPayload] = useState(null)
  const [saving, setSaving] = useState(false)

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
    setFieldErrors({})
    setFormError('')
    setConfirmOpen(false)
    setPendingPayload(null)
    setSaving(false)
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

  const clearErrors = () => {
    setFieldErrors({})
    setFormError('')
  }

  const handleChange = field => event => {
    if (field === 'priceComponent') {
      priceTouched.current = true
    }
    clearErrors()
    setForm(prev => ({ ...prev, [field]: event.target.value }))
  }

  const handlePlanMonthChange = event => {
    const planMonth = event.target.value
    clearErrors()
    setForm(prev => ({
      ...prev,
      planMonth,
      quarter: planMonth ? deriveQuarterFromMonthInput(planMonth) : prev.quarter
    }))
  }

  const buildPayload = isWarranty => {
    const errors = {}
    const planPeriod = planPeriodFromMonthInput(form.planMonth)

    if (!planPeriod) {
      errors.planPeriod = 'Select month and year'
    }

    const trimmedPrice = String(form.priceComponent ?? '').trim()
    let priceComponent

    if (trimmedPrice !== '') {
      priceComponent = parsePriceComponentInput(form.priceComponent)
      if (priceComponent === undefined) {
        errors.priceComponent = 'Enter a valid amount'
      }
    }

    if (isWarranty && !isUnderPolicy(preview?.snapshot?.lifePercent)) {
      errors.isWarranty = 'Warranty forecast is only allowed when component life is still under policy'
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, fieldErrors: errors, message: Object.values(errors)[0] }
    }

    const payload = {
      fleetUnitId: form.fleetUnitId || resolvedFleetUnitId,
      idMod: form.idMod,
      planPeriod,
      quarter: form.quarter || deriveQuarterFromMonthInput(form.planMonth),
      remark: form.remark || null,
      isWarranty: Boolean(isWarranty),
      ...(priceComponent !== undefined ? { priceComponent } : {})
    }

    const result = validateForm(forecastCreateSchema, payload)

    if (!result.success) {
      return {
        success: false,
        fieldErrors: result.fieldErrors ?? {},
        message: result.message
      }
    }

    return { success: true, data: result.data }
  }

  const handleSubmit = isWarranty => {
    const result = buildPayload(isWarranty)

    if (!result.success) {
      setFieldErrors(result.fieldErrors ?? {})
      setFormError(result.message || 'Validation failed')
      setConfirmOpen(false)
      setPendingPayload(null)

      return
    }

    setFieldErrors({})
    setFormError('')
    setPendingPayload(result.data)
    setConfirmOpen(true)
  }

  const handleConfirmCreate = async () => {
    if (!pendingPayload || typeof onSubmit !== 'function') return

    setSaving(true)
    try {
      await onSubmit(pendingPayload)
      setConfirmOpen(false)
      setPendingPayload(null)
    } catch (error) {
      setConfirmOpen(false)
      setFormError(formatApiError(error, 'Create forecast failed'))
    } finally {
      setSaving(false)
    }
  }

  const showPreview = Boolean(form.idMod) && Boolean(resolvedFleetUnitId)
  const warrantyEligible =
    showPreview && !previewLoading && preview?.snapshot != null && isUnderPolicy(preview.snapshot.lifePercent)

  const fleetUnitError = getFieldError(fieldErrors, 'fleetUnitId')
  const idModError = getFieldError(fieldErrors, 'idMod')
  const planPeriodError = getFieldError(fieldErrors, 'planPeriod', 'planMonth')
  const quarterError = getFieldError(fieldErrors, 'quarter')
  const priceError = getFieldError(fieldErrors, 'priceComponent')
  const remarkError = getFieldError(fieldErrors, 'remark')
  const isWarrantyPending = Boolean(pendingPayload?.isWarranty)

  return (
    <>
      <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth='md'>
        <DialogTitle>Create PCR Forecast</DialogTitle>
        <DialogContent>
          {formError ? (
            <Alert severity='error' sx={{ mt: 2, mb: 1 }} onClose={() => setFormError('')}>
              {formError}
            </Alert>
          ) : null}
          <Grid container spacing={4} sx={{ mt: 0 }}>
            {!isUnitScoped ? (
              <Grid item xs={12} sm={6}>
                <SearchableSelect
                  label='Equipment'
                  value={form.fleetUnitId}
                  onChange={handleChange('fleetUnitId')}
                  error={Boolean(fleetUnitError)}
                  helperText={fleetUnitError || undefined}
                  options={equipments.map(item => ({
                    value: String(item.id),
                    label: `${item.unit_no} — ${item.model}`
                  }))}
                />
              </Grid>
            ) : null}
            <Grid item xs={12} sm={isUnitScoped ? 12 : 6}>
              <SearchableSelect
                label='Component (Policy)'
                value={form.idMod}
                onChange={handleChange('idMod')}
                disabled={!resolvedFleetUnitId || isComponentLocked}
                error={Boolean(idModError)}
                helperText={
                  idModError || (isComponentLocked ? 'Locked to the selected replacement component' : undefined)
                }
                options={policies.map(item => ({
                  value: String(item.idMod),
                  label: item.comp?.compDesc ?? String(item.idMod)
                }))}
              />
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
                error={Boolean(planPeriodError)}
                helperText={planPeriodError || 'Month and year only (stored as 1st of month)'}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <SearchableSelect
                label='Quarter'
                value={form.quarter}
                onChange={handleChange('quarter')}
                error={Boolean(quarterError)}
                helperText={quarterError || undefined}
                options={['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({ value: q, label: q }))}
                disableClearable
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <PriceComponentTextField
                fullWidth
                label='Price Component'
                value={form.priceComponent}
                onChange={handleChange('priceComponent')}
                error={Boolean(priceError)}
                helperText={priceError || 'Component price (IDR) — default from model-component policy'}
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
                error={Boolean(remarkError)}
                helperText={remarkError || undefined}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 4, pb: 4 }}>
          <Button variant='tonal' color='secondary' onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant='contained' onClick={() => handleSubmit(false)} disabled={saving}>
            Create Forecast
          </Button>
          {warrantyEligible ? (
            <Button variant='contained' color='warning' onClick={() => handleSubmit(true)} disabled={saving}>
              Create Forecast with Warranty
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <DeleteConfirmDialog
        open={confirmOpen}
        title={isWarrantyPending ? 'Confirm Warranty Forecast' : 'Confirm Create Forecast'}
        message={isWarrantyPending ? CONFIRM_WARRANTY : CONFIRM_NORMAL}
        loading={saving}
        confirmLabel={isWarrantyPending ? 'Create with Warranty' : 'Create Forecast'}
        confirmColor={isWarrantyPending ? 'warning' : 'primary'}
        onClose={() => {
          if (!saving) {
            setConfirmOpen(false)
            setPendingPayload(null)
          }
        }}
        onConfirm={handleConfirmCreate}
      />
    </>
  )
}

export default ForecastDialog
