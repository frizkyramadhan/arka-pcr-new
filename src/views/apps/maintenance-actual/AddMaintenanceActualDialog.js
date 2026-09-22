/**
 * Add Maintenance Actual dialog (unit detail Maintenance tab).
 * Same fields as /maintenance-actuals/add; unit prefilled & locked to current unit.
 */
import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useTheme, styled } from '@mui/material/styles'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Typography from '@mui/material/Typography'
import DatePicker from 'react-datepicker'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'

import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import Icon from 'src/@core/components/icon'
import DatePickerWrapper from 'src/@core/styles/libs/react-datepicker'
import PickersCustomInput from 'src/views/forms/form-elements/pickers/PickersCustomInput'
import { addMaintenanceActual } from 'src/store/apps/maintenanceActual'
import { fetchData as fetchPlans } from 'src/store/apps/maintenancePlan'
import { useAuth } from 'src/hooks/useAuth'
import arkaApi from 'src/utils/arka-api'
import { toUnitSearchOption } from 'src/utils/unit-select-options'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CustomCloseButton = styled(IconButton)(({ theme }) => ({
  top: 0,
  right: 0,
  color: 'grey.500',
  position: 'absolute',
  boxShadow: theme.shadows[2],
  transform: 'translate(10px, -10px)',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: `${theme.palette.background.paper} !important`,
  transition: 'transform 0.25s ease-in-out, box-shadow 0.25s ease-in-out',
  '&:hover': {
    transform: 'translate(7px, -5px)'
  }
}))

const schema = yup.object().shape({
  planYear: yup.mixed(),
  planMonth: yup.mixed(),
  planMaintenanceTypeId: yup.string(),
  maintenancePlanId: yup.string().required('Please search and select a Maintenance Plan'),
  unitId: yup.string().required('Unit is required'),
  maintenanceDate: yup.string().required('Date is required'),
  maintenanceTime: yup.string(),
  hourMeter: yup
    .number()
    .typeError('Hour meter is required')
    .required('Hour meter is required'),
  remarks: yup.string(),
  mechanics: yup.string()
})

const AddMaintenanceActualDialog = ({
  open,
  onClose,
  fleetUnitId,
  unit,
  presetPlanId = null,
  presetYear = null,
  presetMonth = null,
  onSaved
}) => {
  const theme = useTheme()
  const popperPlacement = theme.direction === 'ltr' ? 'bottom-start' : 'bottom-end'
  const dispatch = useDispatch()
  const { user } = useAuth()
  const planStore = useSelector(state => state.maintenancePlan)
  const allPlans = planStore.allData || []

  const [maintenanceTypes, setMaintenanceTypes] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [showEmptyCriteriaAlert, setShowEmptyCriteriaAlert] = useState(false)

  const projectId =
    unit?.project_code?.trim?.() ||
    unit?.projectCode?.trim?.() ||
    unit?.projectName?.trim?.() ||
    unit?.projectId?.trim?.() ||
    ''

  const lockedUnitOption = useMemo(() => {
    if (!fleetUnitId) return null

    const mapped = {
      id: String(fleetUnitId),
      code: unit?.unit_no || unit?.unitNo || String(fleetUnitId),
      model: unit?.model ?? null,
      description: unit?.description ?? null,
      projectName: projectId || null,
      project_code: projectId || null,
      unitStatus: unit?.unitstatus || unit?.unitStatus || null
    }

    return toUnitSearchOption(mapped)
  }, [fleetUnitId, unit, projectId])

  const unitOptions = useMemo(() => (lockedUnitOption ? [lockedUnitOption] : []), [lockedUnitOption])

  const projectPlans = useMemo(() => {
    if (!projectId) return allPlans

    return allPlans.filter(
      p => String(p.projectId ?? '').trim().toUpperCase() === String(projectId).trim().toUpperCase()
    )
  }, [allPlans, projectId])

  const yearOptions = useMemo(() => {
    const set = new Set(projectPlans.map(p => p.year).filter(y => Number.isInteger(y)))

    return Array.from(set)
      .sort((a, b) => b - a)
      .map(y => ({ value: String(y), label: String(y) }))
  }, [projectPlans])

  const monthSelectOptions = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => ({
        value: String(m),
        label: MONTH_NAMES[m]
      })),
    []
  )

  const typeSelectOptions = useMemo(
    () => maintenanceTypes.map(t => ({ value: String(t.id), label: t.name })),
    [maintenanceTypes]
  )

  const defaultValues = useMemo(
    () => ({
      planYear: presetYear != null && presetYear !== '' ? String(presetYear) : '',
      planMonth: presetMonth != null && presetMonth !== '' ? String(presetMonth) : '',
      planMaintenanceTypeId: '',
      maintenancePlanId: presetPlanId ? String(presetPlanId) : '',
      unitId: fleetUnitId != null ? String(fleetUnitId) : '',
      maintenanceDate: new Date().toISOString().slice(0, 10),
      maintenanceTime: '',
      hourMeter: unit?.latest_hm_unit != null ? Number(unit.latest_hm_unit) : 0,
      remarks: '',
      mechanics: ''
    }),
    [fleetUnitId, presetMonth, presetPlanId, presetYear, unit?.latest_hm_unit]
  )

  const {
    control,
    setValue,
    setError,
    watch,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues,
    mode: 'onChange',
    resolver: yupResolver(schema)
  })

  const planYear = watch('planYear')
  const planMonth = watch('planMonth')
  const planMaintenanceTypeId = watch('planMaintenanceTypeId')

  useEffect(() => {
    if (!open) return
    dispatch(fetchPlans({}))
    arkaApi
      .get('/maintenance-types')
      .then(res => setMaintenanceTypes(res.data?.allData || res.data?.maintenanceTypes || []))
    reset(defaultValues)
    setShowEmptyCriteriaAlert(false)
    setHasSearched(false)
    setSearchResults([])
  }, [open, dispatch, reset, defaultValues])

  useEffect(() => {
    if (!open || !presetPlanId || !allPlans.length) return
    const plan = allPlans.find(p => String(p.id) === String(presetPlanId))
    if (!plan) return
    setSearchResults([plan])
    setHasSearched(true)
    setValue('maintenancePlanId', String(presetPlanId))
  }, [open, presetPlanId, allPlans, setValue])

  const handleSearchPlan = () => {
    const yearNum =
      planYear !== '' && planYear != null ? (typeof planYear === 'number' ? planYear : parseInt(planYear, 10)) : null

    const monthNum =
      planMonth !== '' && planMonth != null
        ? typeof planMonth === 'number'
          ? planMonth
          : parseInt(planMonth, 10)
        : null
    const typeId = planMaintenanceTypeId?.trim?.() ?? ''

    const hasAnyCriteria = !!(
      (yearNum != null && !isNaN(yearNum)) ||
      (monthNum != null && !isNaN(monthNum)) ||
      typeId
    )

    setShowEmptyCriteriaAlert(false)
    if (!hasAnyCriteria) {
      setShowEmptyCriteriaAlert(true)
      setHasSearched(false)
      setSearchResults([])

      return
    }

    setHasSearched(true)
    setValue('maintenancePlanId', '')

    const filtered = projectPlans.filter(p => {
      if (yearNum != null && !isNaN(yearNum) && p.year !== yearNum) return false
      if (monthNum != null && !isNaN(monthNum) && p.month !== monthNum) return false
      if (typeId && p.maintenanceTypeId !== typeId) return false

      return true
    })
    setSearchResults(filtered)
  }

  const handlePlanFilterChange = () => {
    setShowEmptyCriteriaAlert(false)
    setHasSearched(false)
    setSearchResults([])
    setValue('maintenancePlanId', '')
  }

  const handleClose = () => {
    reset(defaultValues)
    setSearchResults([])
    setHasSearched(false)
    onClose?.()
  }

  const onSubmit = async data => {
    if (!user?.id) {
      setError('maintenancePlanId', { message: 'User not logged in' })

      return
    }
    try {
      await dispatch(
        addMaintenanceActual({
          maintenancePlanId: data.maintenancePlanId,
          unitId: String(fleetUnitId),
          maintenanceDate: data.maintenanceDate,
          maintenanceTime: data.maintenanceTime || undefined,
          hourMeter: Number(data.hourMeter),
          remarks: data.remarks || undefined,
          mechanics: data.mechanics || undefined,
          createdById: user.id
        })
      ).unwrap()
      toast.success('Maintenance actual created')
      onSaved?.()
      handleClose()
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to add actual'
      setError('maintenancePlanId', { message: msg })
      toast.error(msg)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='lg'
      fullWidth
      scroll='paper'
      aria-labelledby='add-maintenance-actual-dialog-title'
      sx={{ '& .MuiDialog-paper': { overflow: 'visible' } }}
    >
      <DialogTitle id='add-maintenance-actual-dialog-title' sx={{ p: 4 }}>
        <Typography variant='h6' component='span'>
          Add Maintenance Actual
        </Typography>
        <CustomCloseButton aria-label='close' onClick={handleClose}>
          <Icon icon='tabler:x' fontSize='1.25rem' />
        </CustomCloseButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: theme => `${theme.spacing(4)} !important` }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <Typography variant='subtitle2' sx={{ mb: 2, fontWeight: 600 }}>
                Maintenance Plan
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
                Project: {projectId || '—'}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
                  <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                    <Controller
                      name='planYear'
                      control={control}
                      render={({ field: { value, onChange, onBlur, name } }) => (
                        <SearchableSelect
                          name={name}
                          size='small'
                          label='Year'
                          value={value === '' || value == null ? '' : String(value)}
                          onBlur={onBlur}
                          options={yearOptions}
                          placeholder='Year…'
                          onChange={e => {
                            onChange(e?.target?.value ?? e)
                            handlePlanFilterChange()
                          }}
                        />
                      )}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                    <Controller
                      name='planMonth'
                      control={control}
                      render={({ field: { value, onChange, onBlur, name } }) => (
                        <SearchableSelect
                          name={name}
                          size='small'
                          label='Month'
                          value={value === '' || value == null ? '' : String(value)}
                          onBlur={onBlur}
                          options={monthSelectOptions}
                          placeholder='Month…'
                          onChange={e => {
                            onChange(e?.target?.value ?? e)
                            handlePlanFilterChange()
                          }}
                        />
                      )}
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 0', minWidth: 140 }}>
                    <Controller
                      name='planMaintenanceTypeId'
                      control={control}
                      render={({ field: { value, onChange, onBlur, name } }) => (
                        <SearchableSelect
                          name={name}
                          size='small'
                          label='Type'
                          value={value}
                          onBlur={onBlur}
                          options={typeSelectOptions}
                          placeholder='Search type…'
                          onChange={e => {
                            onChange(e?.target?.value ?? e)
                            handlePlanFilterChange()
                          }}
                        />
                      )}
                    />
                  </Box>
                  <Button
                    type='button'
                    variant='tonal'
                    color='primary'
                    startIcon={<Icon icon='tabler:search' />}
                    onClick={handleSearchPlan}
                  >
                    Search Plan
                  </Button>
                </Box>
              </Box>
              {showEmptyCriteriaAlert ? (
                <Alert severity='warning' onClose={() => setShowEmptyCriteriaAlert(false)} sx={{ mb: 2 }}>
                  Isi salah satu kriteria (Year, Month, atau Type) sebelum mencari.
                </Alert>
              ) : null}
              <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
                Select a plan (required)
              </Typography>
              {searchResults.length === 0 ? (
                hasSearched ? (
                  <Alert severity='warning'>Pencarian tidak ditemukan.</Alert>
                ) : (
                  <Typography variant='body2' color='text.secondary'>
                    Isi Year / Month / Type lalu klik Search Plan.
                  </Typography>
                )
              ) : (
                <Controller
                  name='maintenancePlanId'
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <RadioGroup value={value || ''} onChange={e => onChange(e.target.value)}>
                      {searchResults.map(p => (
                        <FormControlLabel
                          key={p.id}
                          value={p.id}
                          control={<Radio size='small' />}
                          label={
                            <Typography variant='body2'>
                              {p.projectId} | {p.year} {MONTH_NAMES[p.month] || p.month} |{' '}
                              {p.maintenanceTypeName || p.maintenanceType?.name || '—'}{' '}
                              {p.sumPlan != null ? `(Sum: ${p.sumPlan})` : ''}
                            </Typography>
                          }
                        />
                      ))}
                    </RadioGroup>
                  )}
                />
              )}
              {errors.maintenancePlanId ? (
                <Typography variant='caption' color='error' sx={{ display: 'block', mt: 0.5 }}>
                  {errors.maintenancePlanId.message}
                </Typography>
              ) : null}
            </Grid>

            <Grid item xs={12} md={7}>
              <Typography variant='subtitle2' sx={{ mb: 3, fontWeight: 600 }}>
                Detail Actual
              </Typography>
              <Grid container spacing={4}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='unitId'
                    control={control}
                    render={({ field: { value, name } }) => (
                      <SearchableSelect
                        name={name}
                        label='Unit'
                        value={value}
                        onChange={() => {}}
                        options={unitOptions}
                        disabled
                        disableClearable
                        helperText='Locked to this unit'
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='hourMeter'
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <CustomTextField
                        fullWidth
                        type='number'
                        label='Hour Meter'
                        value={value}
                        onChange={onChange}
                        error={Boolean(errors.hourMeter)}
                        {...(errors.hourMeter && { helperText: errors.hourMeter.message })}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='maintenanceDate'
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <DatePickerWrapper
                        sx={{ width: '100%', minWidth: 0, '& .MuiFormControl-root': { width: '100%' } }}
                      >
                        <DatePicker
                          selected={value ? new Date(value) : null}
                          dateFormat='yyyy-MM-dd'
                          placeholderText='Select date'
                          popperPlacement={popperPlacement}
                          onChange={date => onChange(date ? date.toISOString().slice(0, 10) : '')}
                          customInput={
                            <PickersCustomInput
                              fullWidth
                              label='Maintenance Date'
                              error={Boolean(errors.maintenanceDate)}
                              {...(errors.maintenanceDate && { helperText: errors.maintenanceDate.message })}
                            />
                          }
                        />
                      </DatePickerWrapper>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name='maintenanceTime'
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <DatePickerWrapper
                        sx={{ width: '100%', minWidth: 0, '& .MuiFormControl-root': { width: '100%' } }}
                      >
                        <DatePicker
                          showTimeSelect
                          showTimeSelectOnly
                          timeIntervals={15}
                          timeCaption='Time'
                          dateFormat='HH:mm'
                          placeholderText='Select time (optional)'
                          popperPlacement={popperPlacement}
                          selected={
                            value
                              ? (() => {
                                  const [h, m] = value.split(':')
                                  const d = new Date()
                                  d.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0, 0, 0)

                                  return d
                                })()
                              : null
                          }
                          onChange={date =>
                            onChange(
                              date
                                ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
                                    2,
                                    '0'
                                  )}`
                                : ''
                            )
                          }
                          customInput={<PickersCustomInput fullWidth label='Time (optional)' />}
                        />
                      </DatePickerWrapper>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name='remarks'
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <CustomTextField
                        fullWidth
                        multiline
                        rows={2}
                        label='Remarks (optional)'
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name='mechanics'
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <CustomTextField
                        fullWidth
                        label='Mechanics (optional)'
                        placeholder='e.g. Budi, Andi'
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant='tonal' color='secondary' onClick={handleClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type='submit' variant='contained' disabled={!user?.id || isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddMaintenanceActualDialog
