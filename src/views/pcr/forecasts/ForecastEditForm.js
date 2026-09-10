/**

 * Edit forecast OPEN — forecast path, PCR type, plan period, quarter, price, remark.

 */

import { useEffect, useMemo, useState } from 'react'



import Alert from '@mui/material/Alert'

import Button from '@mui/material/Button'

import Card from '@mui/material/Card'

import CardActions from '@mui/material/CardActions'

import CardContent from '@mui/material/CardContent'

import Grid from '@mui/material/Grid'

import Typography from '@mui/material/Typography'



import toast from 'react-hot-toast'



import SearchableSelect from 'src/@core/components/mui/searchable-select'

import CustomTextField from 'src/@core/components/mui/text-field'



import arkaApi from 'src/utils/arka-api'

import { formatApiError, getFieldError, validateForm } from 'src/utils/api-error-message'

import {

  deriveQuarterFromMonthInput,

  formatPriceComponentDisplay,

  monthInputFromPlanPeriod,

  parsePriceComponentInput,

  planPeriodFromMonthInput

} from 'src/utils/forecast-plan-period'



import { forecastUpdateSchema } from '@/lib/validations/forecast'

import {

  emptyPcrSupplyForm,

  pcrSupplyFormFromForecast,

  pcrSupplyPayloadFromForm,

  resolveForecastPath,

  resolveForecastRemark,

  storedForecastPath

} from '@/lib/forecasts/pcr-supply'

import { isUnderPolicy } from '@/lib/forecasts/warranty'



import ForecastCreatePathPicker from 'src/views/pcr/forecasts/ForecastCreatePathPicker'

import ForecastPcrTypeFields from 'src/views/pcr/forecasts/ForecastPcrTypeFields'

import PriceComponentTextField from 'src/views/pcr/forecasts/PriceComponentTextField'



const priceToFormValue = value => formatPriceComponentDisplay(value)



const ForecastEditForm = ({ forecast, onCancel, onSuccess }) => {

  const [form, setForm] = useState({ planMonth: '', quarter: 'Q1', priceComponent: '', remark: '', ...emptyPcrSupplyForm() })

  const [createPath, setCreatePath] = useState(null)

  const [fieldErrors, setFieldErrors] = useState({})

  const [formError, setFormError] = useState('')

  const [saving, setSaving] = useState(false)



  const savedPath = useMemo(() => (forecast ? storedForecastPath(forecast) : null), [forecast])

  const lifePercent = Number(forecast?.lifePercent ?? NaN)

  const underPolicy = Number.isFinite(lifePercent) && isUnderPolicy(lifePercent)

  const effectivePath = resolveForecastPath(createPath, underPolicy, savedPath)

  const isNormalPath = effectivePath === 'normal'

  const isWarrantyPath = effectivePath === 'warranty'

  const needsPathChoice = savedPath == null && underPolicy && effectivePath == null



  useEffect(() => {

    if (!forecast) return



    setForm({

      planMonth: monthInputFromPlanPeriod(forecast.planPeriod),

      quarter: forecast.quarter ?? 'Q1',

      priceComponent: priceToFormValue(forecast.priceComponent),

      remark: resolveForecastRemark(forecast.remark, forecast.compDesc) ?? '',

      ...pcrSupplyFormFromForecast(forecast)

    })

    setCreatePath(storedForecastPath(forecast))

    setFieldErrors({})

    setFormError('')

  }, [forecast])



  const handleChange = field => event => {

    setFieldErrors({})

    setFormError('')

    setForm(prev => ({ ...prev, [field]: event.target.value }))

  }



  const handlePlanMonthChange = event => {

    const planMonth = event.target.value

    setFieldErrors({})

    setFormError('')

    setForm(prev => ({

      ...prev,

      planMonth,

      quarter: planMonth ? deriveQuarterFromMonthInput(planMonth) : prev.quarter

    }))

  }



  const handlePathChange = path => {

    setFieldErrors({})

    setFormError('')

    setCreatePath(path)

    if (path === 'warranty') {

      setForm(prev => ({ ...prev, ...emptyPcrSupplyForm() }))

    }

  }



  const handleSubmit = async () => {

    if (!forecast?.idForecast) return



    if (!effectivePath) {

      setFieldErrors({ createPath: 'Select a forecast path' })

      setFormError('Choose Normal PCR or Warranty before saving')



      return

    }



    const planPeriod = planPeriodFromMonthInput(form.planMonth)

    if (!planPeriod) {

      setFieldErrors({ planPeriod: 'Select month and year' })

      setFormError('Plan period: select month and year')



      return

    }



    const priceParsed = parsePriceComponentInput(form.priceComponent)

    const isWarranty = effectivePath === 'warranty'



    const result = validateForm(forecastUpdateSchema, {

      planPeriod,

      quarter: form.quarter || deriveQuarterFromMonthInput(form.planMonth),

      remark: resolveForecastRemark(form.remark, forecast.compDesc),

      priceComponent: priceParsed ?? null,

      isWarranty,

      ...(isWarranty ? {} : pcrSupplyPayloadFromForm(form))

    })



    if (!result.success) {

      setFieldErrors(result.fieldErrors ?? {})

      setFormError(result.message)



      return

    }



    setSaving(true)

    try {

      await arkaApi.put(`/forecasts/${forecast.idForecast}`, result.data)

      toast.success('Forecast updated')

      onSuccess?.()

    } catch (error) {

      setFormError(formatApiError(error, 'Update failed'))

    } finally {

      setSaving(false)

    }

  }



  const unitLabel = forecast?.unitNo

    ? `${forecast.unitNo}${forecast.modelName ? ` — ${forecast.modelName}` : ''}`

    : '—'

  const compLabel = forecast?.compDesc ?? forecast?.commod?.comp?.compDesc ?? '—'

  const pathError = getFieldError(fieldErrors, 'createPath')

  const planPeriodError = getFieldError(fieldErrors, 'planPeriod', 'planMonth')

  const quarterError = getFieldError(fieldErrors, 'quarter')

  const priceError = getFieldError(fieldErrors, 'priceComponent')

  const remarkError = getFieldError(fieldErrors, 'remark')



  return (

    <Card>

      <CardContent>

        {formError ? (

          <Alert severity='error' sx={{ mb: 4 }} onClose={() => setFormError('')}>

            {formError}

          </Alert>

        ) : null}

        {needsPathChoice ? (

          <Alert severity='info' sx={{ mb: 4 }}>

            This forecast was created before forecast path was required. Choose Normal PCR or Warranty below, then

            complete the remaining fields.

          </Alert>

        ) : null}

        <Grid container spacing={4}>

          <Grid item xs={12} sm={6}>

            <CustomTextField fullWidth label='Equipment' value={unitLabel} disabled />

          </Grid>

          <Grid item xs={12} sm={6}>

            <CustomTextField fullWidth label='Component' value={compLabel} disabled />

          </Grid>



          <ForecastCreatePathPicker

            value={effectivePath}

            onChange={handlePathChange}

            underPolicy={underPolicy}

            lifePercent={lifePercent}

            error={pathError}

          />



          {isWarrantyPath ? (

            <Grid item xs={12}>

              <Alert severity='warning' icon={false} sx={{ alignItems: 'flex-start' }}>

                <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 0.5 }}>

                  Pergantian Warranty

                </Typography>

                <Typography variant='body2' sx={{ color: 'text.secondary' }}>

                  Short approval chain (PS → PM → PLM). PCR type fields are not used on this path.

                </Typography>

              </Alert>

            </Grid>

          ) : null}



          {isNormalPath ? (

            <ForecastPcrTypeFields

              value={form}

              onChange={next => {

                setFieldErrors({})

                setFormError('')

                setForm(prev => ({ ...prev, ...next }))

              }}

              fieldErrors={fieldErrors}

            />

          ) : null}



          <Grid item xs={12} sm={4}>

            <CustomTextField

              fullWidth

              type='month'

              label='Plan Period'

              value={form.planMonth}

              onChange={handlePlanMonthChange}

              error={Boolean(planPeriodError)}

              helperText={planPeriodError || 'Month and year only'}

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

              helperText={priceError || 'Component price (IDR)'}

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

              error={Boolean(remarkError)}

              helperText={remarkError || undefined}

            />

          </Grid>

        </Grid>

      </CardContent>

      <CardActions sx={{ flexWrap: 'wrap', gap: 1, px: 5, pb: 5 }}>

        <Button variant='tonal' color='secondary' onClick={onCancel} disabled={saving}>

          Cancel

        </Button>

        <Button variant='contained' onClick={handleSubmit} disabled={saving}>

          Save

        </Button>

      </CardActions>

    </Card>

  )

}



export default ForecastEditForm


