/**
 * Add Maintenance Actual — ARKA MMS
 * Form: Plan (pilih Project, Year, Month, Maintenance Type), Unit, Date, Time, Hour Meter, Remarks, Mechanics.
 * Project/Year/Month/Type disaring sesuai user (kecuali 000H/001H lihat semua).
 */
import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTheme } from '@mui/material/styles'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import DatePicker from 'react-datepicker'

import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import DatePickerWrapper from 'src/@core/styles/libs/react-datepicker'
import PickersCustomInput from 'src/views/forms/form-elements/pickers/PickersCustomInput'
import { useDispatch, useSelector } from 'react-redux'
import { addMaintenanceActual } from 'src/store/apps/maintenanceActual'
import { fetchData as fetchPlans } from 'src/store/apps/maintenancePlan'
import { fetchData as fetchUnits } from 'src/store/apps/unit'
import { useAuth } from 'src/hooks/useAuth'
import useProjects from 'src/hooks/useProjects'
import arkaApi from 'src/utils/arka-api'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const schema = yup.object().shape({
  planProjectId: yup.string(),
  planYear: yup.mixed(),
  planMonth: yup.mixed(),
  planMaintenanceTypeId: yup.string(),
  maintenancePlanId: yup.string().required('Please search and select a Maintenance Plan'),
  unitId: yup.string().required('Unit is required'),
  maintenanceDate: yup.string().required('Date is required'),
  maintenanceTime: yup.string(),
  hourMeter: yup.number().min(0).required('Hour meter is required'),
  remarks: yup.string(),
  mechanics: yup.string()
})

const defaultValues = {
  planProjectId: '',
  planYear: '',
  planMonth: '',
  planMaintenanceTypeId: '',
  maintenancePlanId: '',
  unitId: '',
  maintenanceDate: new Date().toISOString().slice(0, 10),
  maintenanceTime: '',
  hourMeter: 0,
  remarks: '',
  mechanics: ''
}

const AddMaintenanceActualPage = () => {
  const theme = useTheme()
  const router = useRouter()
  const dispatch = useDispatch()
  const { user } = useAuth()
  const popperPlacement = theme.direction === 'ltr' ? 'bottom-start' : 'bottom-end'

  const planStore = useSelector(state => state.maintenancePlan)
  const unitStore = useSelector(state => state.unit)
  const allPlans = planStore.allData || []
  const allUnits = unitStore.allData?.length ? unitStore.allData : unitStore.data || []

  const [maintenanceTypes, setMaintenanceTypes] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [showEmptyCriteriaAlert, setShowEmptyCriteriaAlert] = useState(false)

  const { projects: projectsFromApi } = useProjects()

  const projectCodes = useMemo(
    () => (user?.projectCodes ?? []).map(c => String(c).trim().toUpperCase()).filter(Boolean),
    [user?.projectCodes]
  )

  /** 000H/001H = tampilkan semua project & plan; selain itu filter by user.projectCodes */
  const isHeadOffice = useMemo(() => {
    return projectCodes.includes('000H') || projectCodes.includes('001H')
  }, [projectCodes])

  const plans = useMemo(() => {
    if (isHeadOffice) return allPlans
    if (!projectCodes.length) return []

    return allPlans.filter(p => projectCodes.includes(String(p.projectId ?? '').trim().toUpperCase()))
  }, [isHeadOffice, projectCodes, allPlans])

  /** Project options from fleet — HO sees all; else filter by projectCodes */
  const projectOptions = useMemo(() => {
    const list = projectsFromApi || []
    if (isHeadOffice) return list
    if (!projectCodes.length) return []

    return list.filter(p => projectCodes.includes(String(p.value ?? '').trim().toUpperCase()))
  }, [isHeadOffice, projectCodes, projectsFromApi])

  const yearOptions = useMemo(() => {
    const set = new Set(plans.map(p => p.year).filter(y => Number.isInteger(y)))

    return Array.from(set).sort((a, b) => b - a)
  }, [plans])

  const units = useMemo(() => {
    if (isHeadOffice) return allUnits
    if (!projectCodes.length) return []

    return allUnits.filter(u => {
      const pid = String(u.projectId ?? '')
        .trim()
        .toUpperCase()

      const pname = String(u.projectName ?? '')
        .trim()
        .toUpperCase()

      return (
        projectCodes.includes(pid) ||
        projectCodes.some(c => pname === c || (pname !== '' && pname.includes(c)))
      )
    })
  }, [isHeadOffice, projectCodes, allUnits])

  useEffect(() => {
    dispatch(fetchPlans({}))
    dispatch(fetchUnits({}))
  }, [dispatch])

  useEffect(() => {
    arkaApi
      .get('/maintenance-types')
      .then(res => setMaintenanceTypes(res.data?.allData || res.data?.maintenanceTypes || []))
  }, [])

  const {
    control,
    setValue,
    setError,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues,
    mode: 'onChange',
    resolver: yupResolver(schema)
  })

  const planProjectId = watch('planProjectId')
  const planYear = watch('planYear')
  const planMonth = watch('planMonth')
  const planMaintenanceTypeId = watch('planMaintenanceTypeId')

  const handleSearchPlan = () => {
    const projectId = planProjectId?.trim?.() ?? ''

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
      projectId ||
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
    setSearchResults([])
    setValue('maintenancePlanId', '')

    const filtered = plans.filter(p => {
      if (projectId && p.projectId !== projectId) return false
      if (yearNum != null && !isNaN(yearNum) && p.year !== yearNum) return false
      if (monthNum != null && !isNaN(monthNum) && p.month !== monthNum) return false
      if (typeId && p.maintenanceTypeId !== typeId) return false
      
return true
    })
    setSearchResults(filtered)
  }

  const onSubmit = async data => {
    if (!user?.id) {
      setError('maintenancePlanId', { message: 'User not logged in' })
      
return
    }
    if (!data.maintenancePlanId) {
      setError('maintenancePlanId', { message: 'Please search and select a Maintenance Plan' })
      
return
    }
    try {
      const result = await dispatch(
        addMaintenanceActual({
          maintenancePlanId: data.maintenancePlanId,
          unitId: data.unitId,
          maintenanceDate: data.maintenanceDate,
          maintenanceTime: data.maintenanceTime || undefined,
          hourMeter: Number(data.hourMeter),
          remarks: data.remarks || undefined,
          mechanics: data.mechanics || undefined,
          createdById: user.id
        })
      ).unwrap()
      const id = result?.maintenanceActual?.id
      if (id) router.push(`/maintenance-actuals/view/${id}`)
      else router.push('/maintenance-actuals/list')
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to add actual'
      setError('maintenancePlanId', { message: msg })
    }
  }

  const handlePlanFilterChange = () => {
    setShowEmptyCriteriaAlert(false)
    setHasSearched(false)
    setSearchResults([])
    setValue('maintenancePlanId', '')
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button
            component={Link}
            href='/maintenance-actuals/list'
            variant='contained'
            startIcon={<Icon icon='tabler:arrow-left' />}
          >
            Back
          </Button>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title='Maintenance Plan' titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
                <CardContent sx={{ pt: 0 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end', mb: 2 }}>
                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                      <Controller
                        name='planProjectId'
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <CustomTextField
                            fullWidth
                            select
                            size='small'
                            label='Project'
                            value={value}
                            onChange={e => {
                              onChange(e)
                              handlePlanFilterChange()
                            }}
                          >
                            <MenuItem value=''>
                              <em>Select project</em>
                            </MenuItem>
                            {projectOptions.map(p => (
                              <MenuItem key={p.value} value={p.value}>
                                {p.value}
                              </MenuItem>
                            ))}
                          </CustomTextField>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                      <Controller
                        name='planYear'
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <CustomTextField
                            fullWidth
                            select
                            size='small'
                            label='Year'
                            value={value ?? ''}
                            onChange={e => {
                              onChange(e)
                              handlePlanFilterChange()
                            }}
                          >
                            <MenuItem value=''>
                              <em>Year</em>
                            </MenuItem>
                            {yearOptions.map(y => (
                              <MenuItem key={y} value={y}>
                                {y}
                              </MenuItem>
                            ))}
                          </CustomTextField>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                      <Controller
                        name='planMonth'
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <CustomTextField
                            fullWidth
                            select
                            size='small'
                            label='Month'
                            value={value ?? ''}
                            onChange={e => {
                              onChange(e)
                              handlePlanFilterChange()
                            }}
                          >
                            <MenuItem value=''>
                              <em>Month</em>
                            </MenuItem>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                              <MenuItem key={m} value={m}>
                                {MONTH_NAMES[m]}
                              </MenuItem>
                            ))}
                          </CustomTextField>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                      <Controller
                        name='planMaintenanceTypeId'
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <CustomTextField
                            fullWidth
                            select
                            size='small'
                            label='Maintenance Type'
                            value={value}
                            onChange={e => {
                              onChange(e)
                              handlePlanFilterChange()
                            }}
                          >
                            <MenuItem value=''>
                              <em>Select type</em>
                            </MenuItem>
                            {maintenanceTypes.map(t => (
                              <MenuItem key={t.id} value={t.id}>
                                {t.name}
                              </MenuItem>
                            ))}
                          </CustomTextField>
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                      <Button
                        type='button'
                        variant='tonal'
                        color='primary'
                        size='medium'
                        fullWidth
                        startIcon={<Icon icon='tabler:search' />}
                        onClick={handleSearchPlan}
                      >
                        Search Plan
                      </Button>
                    </Box>
                  </Box>
                  {showEmptyCriteriaAlert && (
                    <Alert severity='warning' onClose={() => setShowEmptyCriteriaAlert(false)} sx={{ mb: 2 }}>
                      Silakan isi salah satu kriteria (Project, Year, Month, atau Maintenance Type) sebelum mencari.
                    </Alert>
                  )}
                  <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
                    Select a plan (required)
                  </Typography>
                  {searchResults.length === 0 ? (
                    hasSearched ? (
                      <Alert severity='warning' sx={{ mt: 0 }}>
                        Pencarian tidak ditemukan. Silakan hubungi Admin Plant HO Balikpapan.
                      </Alert>
                    ) : (
                      <Typography variant='body2' color='text.secondary'>
                        Fill Project / Year / Month / Type (optional) and click Search to see plans.
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
                  {errors.maintenancePlanId && (
                    <Typography variant='caption' color='error' sx={{ display: 'block', mt: 0.5 }}>
                      {errors.maintenancePlanId.message}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={8}>
              <Card sx={{ height: '100%' }}>
                <CardHeader title='Detail Actual' titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
                <CardContent sx={{ pt: 0 }}>
                  <Grid container spacing={4}>
                    <Grid item xs={12} sm={6}>
                      <Controller
                        name='unitId'
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <CustomTextField
                            fullWidth
                            select
                            label='Unit'
                            value={value}
                            onChange={onChange}
                            error={Boolean(errors.unitId)}
                            {...(errors.unitId && { helperText: errors.unitId.message })}
                          >
                            <MenuItem value=''>
                              <em>Select unit</em>
                            </MenuItem>
                            {units.map(u => {
                              const desc = [u.model, u.description, u.projectName].filter(Boolean).join(' · ') || '—'
                              const statusLabel = u.unitStatus ? `Status: ${u.unitStatus}` : null
                              
return (
                                <MenuItem key={u.id} value={u.id}>
                                  <Box
                                    sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 0.5 }}
                                  >
                                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                                      {u.code || u.id}
                                    </Typography>
                                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                                      {[desc, statusLabel].filter(Boolean).join(' · ') || '—'}
                                    </Typography>
                                  </Box>
                                </MenuItem>
                              )
                            })}
                          </CustomTextField>
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
                            inputProps={{ min: 0 }}
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
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button type='submit' variant='contained' disabled={!user?.id || isSubmitting}>
                          Save
                        </Button>
                        <Button component={Link} href='/maintenance-actuals/list' variant='tonal' color='secondary'>
                          Cancel
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </form>
      </Grid>
    </Grid>
  )
}

AddMaintenanceActualPage.acl = {
  subject: 'maintenance-actual',
  action: 'create'
}

export default AddMaintenanceActualPage
