/**
 * Create PCR Forecast — equipment, component, path (Normal vs Warranty), PCR type, plan, price.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomTextField from 'src/@core/components/mui/text-field'

import arkaApi from 'src/utils/arka-api'
import {
  deriveQuarterFromMonthInput,
  formatPriceComponentDisplay,
  parsePriceComponentInput,
  planPeriodFromMonthInput
} from 'src/utils/forecast-plan-period'
import { formatApiError, getFieldError, validateForm } from 'src/utils/api-error-message'

import { forecastCreateSchema } from '@/lib/validations/forecast'
import {
  emptyPcrSupplyForm,
  formatPcrSupplySummary,
  pcrSupplyPayloadFromForm,
  remarkHintFromCompDesc,
  resolveForecastRemark
} from '@/lib/forecasts/pcr-supply'
import { isUnderPolicy } from '@/lib/forecasts/warranty'

import ForecastComponentPreview from 'src/views/pcr/forecasts/ForecastComponentPreview'
import ForecastCreatePathPicker from 'src/views/pcr/forecasts/ForecastCreatePathPicker'
import ForecastPcrTypeFields from 'src/views/pcr/forecasts/ForecastPcrTypeFields'
import PriceComponentTextField from 'src/views/pcr/forecasts/PriceComponentTextField'

const defaultForm = {
  fleetUnitId: '',
  idMod: '',
  planMonth: '',
  quarter: 'Q1',
  priceComponent: '',
  remark: '',
  ...emptyPcrSupplyForm()
}

const CONFIRM_NORMAL =
  'Create this PCR forecast with the full BA approval chain (PS → PM → PLM → Direksi).\n\nDo you want to continue?'

const CONFIRM_REPAIR =
  'Create this PCR forecast as Repair.\nApproval stops at Plant Manager (PS → PM → PLM).\n\nDo you want to continue?'

const CONFIRM_WARRANTY =
  'Create this PCR forecast as Pergantian Warranty.\nApproval stops at Plant Manager (PS → PM → PLM).\n\nDo you want to continue?'

const ForecastCreateForm = ({
  equipments = [],
  fleetUnitId: presetFleetUnitId,
  fleetModelId: presetFleetModelId,
  presetIdMod,
  equipmentLabel = '',
  onSubmit,
  onCancel
}) => {
  const [form, setForm] = useState(defaultForm)
  const [createPath, setCreatePath] = useState(null)
  const [policies, setPolicies] = useState([])
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingPayload, setPendingPayload] = useState(null)
  const [saving, setSaving] = useState(false)

  const lastPricePrefillIdMod = useRef(null)
  const lastRemarkPrefillIdMod = useRef(null)
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
    setForm({
      ...defaultForm,
      fleetUnitId: isUnitScoped ? String(presetFleetUnitId) : '',
      idMod: presetIdMod != null ? String(presetIdMod) : ''
    })
    setCreatePath(null)
    setPolicies([])
    setPreview(null)
    setPreviewLoading(false)
    setFieldErrors({})
    setFormError('')
    setConfirmOpen(false)
    setPendingPayload(null)
    setSaving(false)
    lastPricePrefillIdMod.current = null
    lastRemarkPrefillIdMod.current = null
    priceTouched.current = false
  }, [isUnitScoped, presetFleetUnitId, presetIdMod])

  useEffect(() => {
    setCreatePath(null)
    setForm(prev => ({ ...prev, ...emptyPcrSupplyForm() }))
  }, [form.idMod])

  useEffect(() => {
    const modelId = isUnitScoped
      ? presetFleetModelId
      : equipments.find(item => String(item.id) === form.fleetUnitId)?.model_id

    if (!modelId) {
      setPolicies([])

      return
    }

    arkaApi
      .get('/model-components', { params: { fleetModelId: modelId } })
      .then(res => setPolicies(Array.isArray(res.data?.rows) ? res.data.rows : Array.isArray(res.data) ? res.data : []))
      .catch(() => setPolicies([]))
  }, [form.fleetUnitId, equipments, isUnitScoped, presetFleetModelId])

  useEffect(() => {
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
  }, [form.idMod, resolvedFleetUnitId])

  useEffect(() => {
    lastPricePrefillIdMod.current = null
    lastRemarkPrefillIdMod.current = null
    priceTouched.current = false
  }, [form.idMod])

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

  useEffect(() => {
    if (!form.idMod) return
    if (lastRemarkPrefillIdMod.current === form.idMod) return

    const policy = policies.find(item => String(item.idMod) === String(form.idMod))
    const desc = preview?.component?.compDesc ?? policy?.comp?.compDesc
    if (!desc && previewLoading) return

    lastRemarkPrefillIdMod.current = form.idMod
    setForm(prev => ({ ...prev, remark: remarkHintFromCompDesc(desc) }))
  }, [form.idMod, previewLoading, preview?.component?.compDesc, policies])

  const showPreview = Boolean(form.idMod) && Boolean(resolvedFleetUnitId)
  const previewReady = showPreview && !previewLoading && preview?.snapshot != null
  const lifePercent = Number(preview?.snapshot?.lifePercent ?? NaN)
  const underPolicy = previewReady && isUnderPolicy(lifePercent)
  const effectivePath = createPath ?? (previewReady && !underPolicy ? 'normal' : null)

  useEffect(() => {
    if (!previewReady || underPolicy) return
    if (createPath == null) setCreatePath('normal')
  }, [previewReady, underPolicy, createPath, form.idMod])

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

  const handlePathChange = path => {
    clearErrors()
    setCreatePath(path)
    if (path === 'warranty') {
      setForm(prev => ({ ...prev, ...emptyPcrSupplyForm() }))
    }
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

    if (isWarranty && !underPolicy) {
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
      remark: resolveForecastRemark(form.remark, preview?.component?.compDesc ?? policies.find(item => String(item.idMod) === String(form.idMod))?.comp?.compDesc),
      isWarranty: Boolean(isWarranty),
      ...(priceComponent !== undefined ? { priceComponent } : {}),
      ...(!isWarranty ? pcrSupplyPayloadFromForm(form) : {})
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

  const handleSubmit = () => {
    if (!effectivePath) {
      setFormError('Choose Normal PCR or Warranty before creating the forecast')
      setFieldErrors({ createPath: 'Select a forecast path' })

      return
    }

    const isWarranty = effectivePath === 'warranty'
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

  const showDetails = previewReady && effectivePath != null
  const isNormalPath = effectivePath === 'normal'
  const isWarrantyPath = effectivePath === 'warranty'

  const fleetUnitError = getFieldError(fieldErrors, 'fleetUnitId')
  const idModError = getFieldError(fieldErrors, 'idMod')
  const pathError = getFieldError(fieldErrors, 'createPath')
  const planPeriodError = getFieldError(fieldErrors, 'planPeriod', 'planMonth')
  const quarterError = getFieldError(fieldErrors, 'quarter')
  const priceError = getFieldError(fieldErrors, 'priceComponent')
  const remarkError = getFieldError(fieldErrors, 'remark')
  const isWarrantyPending = Boolean(pendingPayload?.isWarranty)
  const isRepairPending = pendingPayload?.pcrSupplyCategory === 'REPAIR'
  const pendingTypeSummary = formatPcrSupplySummary(pendingPayload)

  const equipmentOptions = useMemo(() => {
    if (isUnitScoped) {
      return [
        {
          value: String(presetFleetUnitId),
          label: equipmentLabel || `Unit #${presetFleetUnitId}`
        }
      ]
    }

    return equipments.map(item => ({
      value: String(item.id),
      label: `${item.unit_no} — ${item.model}`
    }))
  }, [equipmentLabel, equipments, isUnitScoped, presetFleetUnitId])

  const componentOptions = useMemo(() => {
    const options = policies.map(item => ({
      value: String(item.idMod),
      label: item.comp?.compDesc ?? String(item.idMod)
    }))
    const lockedId = form.idMod ? String(form.idMod) : ''
    if (isComponentLocked && lockedId && !options.some(option => option.value === lockedId)) {
      const lockedLabel = preview?.component?.compDesc
      if (lockedLabel) options.unshift({ value: lockedId, label: lockedLabel })
    }

    return options
  }, [form.idMod, isComponentLocked, policies, preview?.component?.compDesc])

  return (
    <>
      <Card>
        <CardContent>
          {formError ? (
            <Alert severity='error' sx={{ mb: 4 }} onClose={() => setFormError('')}>
              {formError}
            </Alert>
          ) : null}
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Equipment'
                value={isUnitScoped ? String(presetFleetUnitId) : form.fleetUnitId}
                onChange={handleChange('fleetUnitId')}
                disabled={isUnitScoped}
                disableClearable={isUnitScoped}
                error={Boolean(fleetUnitError)}
                helperText={fleetUnitError || undefined}
                options={equipmentOptions}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Component (Policy)'
                value={form.idMod}
                onChange={handleChange('idMod')}
                disabled={!resolvedFleetUnitId || isComponentLocked}
                disableClearable={isComponentLocked}
                error={Boolean(idModError)}
                helperText={idModError || undefined}
                options={componentOptions}
              />
            </Grid>

            {showPreview ? <ForecastComponentPreview preview={preview} loading={previewLoading} /> : null}

            {previewReady ? (
              <ForecastCreatePathPicker
                value={effectivePath}
                onChange={handlePathChange}
                underPolicy={underPolicy}
                lifePercent={lifePercent}
                error={pathError}
              />
            ) : null}

            {showDetails && isWarrantyPath ? (
              <Grid item xs={12}>
                <Alert severity='warning' icon={false} sx={{ alignItems: 'flex-start' }}>
                  <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 0.5 }}>
                    Warranty path selected
                  </Typography>
                  <Typography variant='body2'>
                    PCR Type is not required. BA PCR will use the short approval chain (PS → PM → PLM) and close without
                    MR / PR / PO.
                  </Typography>
                </Alert>
              </Grid>
            ) : null}

            {showDetails && isNormalPath ? (
              <ForecastPcrTypeFields
                value={form}
                onChange={next => {
                  clearErrors()
                  setForm(prev => ({ ...prev, ...next }))
                }}
                fieldErrors={fieldErrors}
              />
            ) : null}

            {showDetails ? (
              <>
                <Grid item xs={12}>
                  <Typography variant='subtitle2' sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Planning & pricing
                  </Typography>
                </Grid>
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
              </>
            ) : previewReady && !effectivePath ? (
              <Grid item xs={12}>
                <Box
                  sx={{
                    py: 4,
                    px: 3,
                    borderRadius: 1,
                    border: theme => `1px dashed ${theme.palette.divider}`,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    Select a forecast path above to continue with PCR type and planning fields.
                  </Typography>
                </Box>
              </Grid>
            ) : null}
          </Grid>
        </CardContent>
        <CardActions sx={{ flexWrap: 'wrap', gap: 1, px: 5, pb: 5, alignItems: 'center' }}>
          <Button variant='tonal' color='secondary' onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          {isWarrantyPath ? (
            <Button variant='contained' color='warning' onClick={handleSubmit} disabled={saving || !showDetails}>
              Create Warranty Forecast
            </Button>
          ) : (
            <Button variant='contained' onClick={handleSubmit} disabled={saving || !showDetails}>
              Create Forecast
            </Button>
          )}
          {!showDetails && previewReady ? (
            <Typography variant='caption' sx={{ color: 'text.secondary', ml: 1 }}>
              Choose a path to enable Create
            </Typography>
          ) : null}
        </CardActions>
      </Card>

      <DeleteConfirmDialog
        open={confirmOpen}
        title={isWarrantyPending ? 'Confirm Warranty Forecast' : 'Confirm Create Forecast'}
        message={
          isWarrantyPending
            ? CONFIRM_WARRANTY
            : isRepairPending
              ? `${CONFIRM_REPAIR}${pendingTypeSummary ? `\n\nPCR Type: ${pendingTypeSummary}` : ''}`
              : `${CONFIRM_NORMAL}${pendingTypeSummary ? `\n\nPCR Type: ${pendingTypeSummary}` : ''}`
        }
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

export default ForecastCreateForm
