/**
 * Add / edit maintenance actual.
 * Left card picks a plan date. Right card is the actual. Each failure is its own form below.
 * Saving the actual records one follow for each finding that is still open.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import Link from 'next/link'
import { useTheme } from '@mui/material/styles'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import DatePicker from 'react-datepicker'
import toast from 'react-hot-toast'
import { useDispatch } from 'react-redux'

import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'
import DatePickerWrapper from 'src/@core/styles/libs/react-datepicker'
import PickersCustomInput from 'src/views/forms/form-elements/pickers/PickersCustomInput'
import EntityAttachmentsSection from 'src/views/fms/EntityAttachmentsSection'
import { addMaintenanceActual, updateMaintenanceActual } from 'src/store/apps/maintenanceActual'
import { useAuth } from 'src/hooks/useAuth'
import useProjects from 'src/hooks/useProjects'
import arkaApi from 'src/utils/arka-api'
import { filterPlanLines, flattenPlanLines } from 'src/utils/maintenance-plan-lines'

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const SEVERITY_COLOR = { CRITICAL: 'error', MAJOR: 'warning', MINOR: 'info' }

const schema = yup.object().shape({
  planProjectId: yup.string(),
  planYear: yup.mixed(),
  planMonth: yup.mixed(),
  planMaintenanceTypeId: yup.string(),
  maintenancePlanDetailId: yup.string(),
  unitId: yup.string(),
  maintenanceDate: yup.string().required('Actual date is required'),
  maintenanceTime: yup.string(),
  hourMeter: yup.number().typeError('Hour meter is required').required('Hour meter is required'),
  remarks: yup.string(),
  mechanics: yup.string(),
  qcStatus: yup.string(),
  picUserId: yup.string(),
  status: yup.string()
})

/** Empty value = not checked yet; NA and empty stay out of QC Pass Rate. */
const QC_OPTIONS = [
  { value: '', label: 'Not checked' },
  { value: 'PASS', label: 'Pass' },
  { value: 'FAIL', label: 'Fail' },
  { value: 'NA', label: 'N/A' }
]

/** Cancelled actuals do not count as executed for PM Compliance. */
const STATUS_OPTIONS = [
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' }
]

const emptyDraft = (findingDate = '') => ({
  clientKey: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  severity: 'MINOR',
  description: '',
  componentCode: '',
  componentName: '',
  subComponentCode: '',
  subComponentName: '',
  damageCode: '',
  damageName: '',
  occurredAt: findingDate,
  closureDate: '',
  picUserId: ''
})

const sapLabel = (code, name) => [code, name].filter(Boolean).join(' · ')

const sapOptions = (rows, selectedCode, selectedName) => {
  const options = (rows || []).map(row => ({
    value: row.code,
    label: sapLabel(row.code, row.name) || row.code,
    description: row.name || ''
  }))
  if (selectedCode && !options.some(option => String(option.value) === String(selectedCode))) {
    options.unshift({
      value: selectedCode,
      label: sapLabel(selectedCode, selectedName) || selectedCode,
      description: selectedName || ''
    })
  }

  return options
}

const failureCardSx = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1.5,
  overflow: 'hidden',
  mb: 4
}

const failureCodeSummary = row =>
  [
    sapLabel(row.componentCode, row.componentName),
    sapLabel(row.subComponentCode, row.subComponentName),
    sapLabel(row.damageCode, row.damageName)
  ]
    .filter(Boolean)
    .join(' · ')

const FailureSapFields = ({ row, components, damages, subs, loading, onChange }) => {
  const componentMatch = code => (components || []).find(item => item.code === code)
  const subMatch = code => (subs || []).find(item => item.code === code)
  const damageMatch = code => (damages || []).find(item => item.code === code)

  return (
    <>
      <Grid item xs={12} sm={4}>
        <SearchableSelect
          label='Component'
          value={row.componentCode || ''}
          options={sapOptions(components, row.componentCode, row.componentName)}
          loading={loading}
          placeholder='Search component'
          onChange={event => {
            const code = event.target.value
            const match = componentMatch(code)
            onChange({
              componentCode: code,
              componentName: match?.name || '',
              subComponentCode: '',
              subComponentName: ''
            })
          }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <SearchableSelect
          label='Sub component'
          value={row.subComponentCode || ''}
          options={sapOptions(subs, row.subComponentCode, row.subComponentName)}
          loading={loading}
          disabled={!row.componentCode}
          placeholder='Search sub component'
          onChange={event => {
            const code = event.target.value
            const match = subMatch(code)
            onChange({ subComponentCode: code, subComponentName: match?.name || '' })
          }}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <SearchableSelect
          label='Damage'
          value={row.damageCode || ''}
          options={sapOptions(damages, row.damageCode, row.damageName)}
          loading={loading}
          placeholder='Search damage'
          onChange={event => {
            const code = event.target.value
            const match = damageMatch(code)
            onChange({ damageCode: code, damageName: match?.name || '' })
          }}
        />
      </Grid>
    </>
  )
}

/** Form tambah / ubah temuan pada actual ini. Frequency dihitung di server, tidak ditampilkan. */
const EditableFailureCard = ({
  title,
  headerAction,
  row,
  sapComponents,
  sapDamages,
  sapSubs,
  sapLoading,
  onSapChange,
  onSeverityChange,
  onDescriptionChange,
  onOccurredAtChange,
  onClosureDateChange,
  picOptions,
  onPicChange,
  photoSlot,
  popperPlacement
}) => (
  <Box sx={failureCardSx}>
    <Box
      sx={{
        px: 4,
        py: 3,
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2
      }}
    >
      <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {headerAction || null}
    </Box>
    <Box sx={{ p: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} sm={4} md={3}>
          <CustomTextField select fullWidth label='Severity' value={row.severity} onChange={onSeverityChange}>
            <MenuItem value='CRITICAL'>Critical</MenuItem>
            <MenuItem value='MAJOR'>Major</MenuItem>
            <MenuItem value='MINOR'>Minor</MenuItem>
          </CustomTextField>
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <DatePickerWrapper sx={{ width: '100%', '& .MuiFormControl-root': { width: '100%' } }}>
            <DatePicker
              selected={row.occurredAt ? new Date(row.occurredAt) : null}
              dateFormat='yyyy-MM-dd'
              popperPlacement={popperPlacement}
              onChange={onOccurredAtChange}
              customInput={<PickersCustomInput fullWidth label='Finding date' />}
            />
          </DatePickerWrapper>
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <DatePickerWrapper sx={{ width: '100%', '& .MuiFormControl-root': { width: '100%' } }}>
            <DatePicker
              selected={row.closureDate ? new Date(row.closureDate) : null}
              dateFormat='yyyy-MM-dd'
              isClearable
              popperPlacement={popperPlacement}
              onChange={onClosureDateChange}
              customInput={<PickersCustomInput fullWidth label='Closed on (optional)' />}
            />
          </DatePickerWrapper>
        </Grid>
        <Grid item xs={12} sm={4} md={3}>
          <SearchableSelect
            label='PIC'
            value={row.picUserId || ''}
            options={picOptions}
            placeholder='Search PIC'
            onChange={onPicChange}
          />
        </Grid>
        <FailureSapFields
          row={row}
          components={sapComponents}
          damages={sapDamages}
          subs={sapSubs}
          loading={sapLoading}
          onChange={onSapChange}
        />
        <Grid item xs={12}>
          <CustomTextField
            fullWidth
            multiline
            minRows={3}
            label='Finding description'
            value={row.description}
            onChange={onDescriptionChange}
          />
        </Grid>
        <Grid item xs={12}>
          {photoSlot}
        </Grid>
      </Grid>
    </Box>
  </Box>
)

const MaintenanceActualForm = ({
  mode = 'add',
  actualId = null,
  lockedFleetUnitId = null,
  presetPlanDetailId = null,
  presetYear = null,
  presetMonth = null,
  embedded = false,
  cancelHref = '/maintenance-actuals/list',
  onCancel,
  onSaved
}) => {
  const theme = useTheme()
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { projects: projectsFromApi } = useProjects()
  const popperPlacement = theme.direction === 'ltr' ? 'bottom-start' : 'bottom-end'
  const photoRefs = useRef({})
  const actualPhotoRef = useRef(null)

  const [loading, setLoading] = useState(mode === 'edit')
  const [fetchError, setFetchError] = useState(null)
  const [legacyUnlinked, setLegacyUnlinked] = useState(false)
  const [registerNo, setRegisterNo] = useState('')
  const [unitDisplay, setUnitDisplay] = useState(null)
  const [planLines, setPlanLines] = useState([])
  const [maintenanceTypes, setMaintenanceTypes] = useState([])
  const [lineOptions, setLineOptions] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [showEmptyCriteriaAlert, setShowEmptyCriteriaAlert] = useState(false)
  const [openFailures, setOpenFailures] = useState([])
  const [recorded, setRecorded] = useState([])
  const [drafts, setDrafts] = useState([])
  const [sapComponents, setSapComponents] = useState([])
  const [sapDamages, setSapDamages] = useState([])
  const [sapSubs, setSapSubs] = useState({})
  const [sapLoading, setSapLoading] = useState(false)
  const [sapError, setSapError] = useState(null)
  const [picCandidates, setPicCandidates] = useState([])
  const [savedPic, setSavedPic] = useState(null)
  const subRequests = useRef({})

  const projectCodes = useMemo(
    () => (user?.projectCodes ?? []).map(code => String(code).trim().toUpperCase()).filter(Boolean),
    [user?.projectCodes]
  )
  const isHeadOffice = projectCodes.includes('000H') || projectCodes.includes('001H')

  const visibleLines = useMemo(() => {
    const scoped = isHeadOffice
      ? planLines
      : planLines.filter(line =>
          projectCodes.includes(
            String(line.projectId ?? '')
              .trim()
              .toUpperCase()
          )
        )
    if (!lockedFleetUnitId) return scoped

    return filterPlanLines(scoped, { fleetUnitId: lockedFleetUnitId })
  }, [isHeadOffice, lockedFleetUnitId, planLines, projectCodes])

  const {
    control,
    setValue,
    setError,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      planProjectId: '',
      planYear: presetYear != null && presetYear !== '' ? String(presetYear) : '',
      planMonth: presetMonth != null && presetMonth !== '' ? String(presetMonth) : '',
      planMaintenanceTypeId: '',
      maintenancePlanDetailId: presetPlanDetailId ? String(presetPlanDetailId) : '',
      unitId: lockedFleetUnitId != null ? String(lockedFleetUnitId) : '',
      maintenanceDate: new Date().toISOString().slice(0, 10),
      maintenanceTime: '',
      hourMeter: 0,
      remarks: '',
      mechanics: '',
      qcStatus: '',
      picUserId: '',
      status: 'CLOSED'
    },
    mode: 'onChange',
    resolver: yupResolver(schema)
  })

  const planProjectId = watch('planProjectId')
  const planYear = watch('planYear')
  const planMonth = watch('planMonth')
  const planMaintenanceTypeId = watch('planMaintenanceTypeId')
  const selectedDetailId = watch('maintenancePlanDetailId')
  const selectedUnitId = watch('unitId')
  const maintenanceDate = watch('maintenanceDate')

  const selectedLine = useMemo(
    () => visibleLines.find(line => line.id === selectedDetailId) || null,
    [selectedDetailId, visibleLines]
  )
  const fleetUnitId = selectedLine?.fleetUnitId || (selectedUnitId ? Number(selectedUnitId) : null)

  const projectOptions = useMemo(() => {
    const list = projectsFromApi || []
    if (isHeadOffice) return list
    if (!projectCodes.length) return []

    return list.filter(project =>
      projectCodes.includes(
        String(project.value ?? '')
          .trim()
          .toUpperCase()
      )
    )
  }, [isHeadOffice, projectCodes, projectsFromApi])

  const yearOptions = useMemo(() => {
    const source = planProjectId
      ? visibleLines.filter(line => String(line.projectId).toUpperCase() === String(planProjectId).trim().toUpperCase())
      : visibleLines
    const years = Array.from(new Set(source.map(line => line.year).filter(year => Number.isInteger(year))))

    return years.sort((a, b) => b - a).map(year => ({ value: String(year), label: String(year) }))
  }, [planProjectId, visibleLines])

  const monthOptions = useMemo(
    () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => ({ value: String(month), label: MONTH_NAMES[month] })),
    []
  )

  const typeOptions = useMemo(
    () => maintenanceTypes.map(type => ({ value: String(type.id), label: type.name })),
    [maintenanceTypes]
  )

  const unitLabel = useMemo(() => {
    const source = selectedLine
      ? {
          code: selectedLine.unitNo || String(selectedLine.fleetUnitId),
          model: selectedLine.unitModel || '',
          description: selectedLine.unitDescription || ''
        }
      : unitDisplay

    if (!source?.code) return ''

    return [source.code, source.model, source.description].filter(Boolean).join(' · ')
  }, [selectedLine, unitDisplay])

  const chooseLine = line => {
    if (line.hasActual && line.id !== selectedDetailId) return
    setValue('maintenancePlanDetailId', line.id)
    setValue('unitId', String(line.fleetUnitId))
  }

  useEffect(() => {
    arkaApi.get('/maintenance-plans', { params: { details: '1' } }).then(res => {
      setPlanLines(flattenPlanLines(res.data?.maintenancePlans || []))
    })
    arkaApi.get('/maintenance-types').then(res => {
      setMaintenanceTypes(res.data?.allData || res.data?.maintenanceTypes || [])
    })
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || !actualId) return
    let cancelled = false
    setLoading(true)
    arkaApi
      .get(`/maintenance-actuals/${actualId}`)
      .then(res => {
        if (cancelled) return
        const actual = res.data
        setValue('planProjectId', actual.planProjectId || '')
        setValue('planYear', actual.planYear != null ? String(actual.planYear) : '')
        setValue('planMonth', actual.planMonth != null ? String(actual.planMonth) : '')
        setValue('planMaintenanceTypeId', actual.planMaintenanceTypeId || '')
        setValue('maintenancePlanDetailId', actual.maintenancePlanDetailId || '')
        setValue('unitId', actual.unitId || (actual.fleetUnitId != null ? String(actual.fleetUnitId) : ''))
        setValue('maintenanceDate', actual.maintenanceDate?.slice(0, 10) || '')
        setValue('maintenanceTime', actual.maintenanceTime || '')
        setValue('hourMeter', actual.hourMeter ?? 0)
        setValue('remarks', actual.remarks || '')
        setValue('mechanics', actual.mechanics || '')
        setValue('qcStatus', actual.qcStatus || '')
        setValue('picUserId', actual.picUserId != null ? String(actual.picUserId) : '')
        setValue('status', actual.status || 'CLOSED')
        setSavedPic(actual.picUserId != null ? { idUser: actual.picUserId, label: actual.picName } : null)
        setRegisterNo(actual.registerNo || '')
        setUnitDisplay({
          code: actual.unitNo || actual.unitCode || String(actual.fleetUnitId ?? actual.unitId ?? ''),
          model: actual.unitModel || '',
          description: actual.unitDescription || ''
        })
        setLegacyUnlinked(!actual.maintenancePlanDetailId)
      })
      .catch(err => {
        if (!cancelled) setFetchError(err?.response?.data?.error || 'Failed to load actual')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [actualId, mode, setValue])

  useEffect(() => {
    if (mode === 'edit') return
    const projectId = selectedLine?.projectId
    if (!projectId || !maintenanceDate) {
      setRegisterNo('')

      return
    }
    let cancelled = false
    arkaApi
      .get('/maintenance-actuals/next-register', {
        params: { projectId, maintenanceDate }
      })
      .then(res => {
        if (!cancelled) setRegisterNo(res.data?.registerNo || '')
      })
      .catch(() => {
        if (!cancelled) setRegisterNo('')
      })

    return () => {
      cancelled = true
    }
  }, [maintenanceDate, mode, selectedLine?.projectId])

  const picProjectId = selectedLine?.projectId || planProjectId || ''

  useEffect(() => {
    if (!picProjectId) {
      setPicCandidates([])

      return
    }
    let cancelled = false
    arkaApi
      .get('/maintenance-actuals/pic-options', { params: { projectCode: picProjectId } })
      .then(res => {
        if (!cancelled) setPicCandidates(res.data?.rows || [])
      })
      .catch(() => {
        if (!cancelled) setPicCandidates([])
      })

    return () => {
      cancelled = true
    }
  }, [picProjectId])

  const picOptions = useMemo(() => {
    const options = picCandidates.map(row => ({
      value: String(row.idUser),
      label: row.fullName ? `${row.fullName} (${row.username})` : row.username
    }))
    if (savedPic && !options.some(option => option.value === String(savedPic.idUser))) {
      options.unshift({ value: String(savedPic.idUser), label: savedPic.label || `User ${savedPic.idUser}` })
    }

    return [{ value: '', label: 'No PIC' }, ...options]
  }, [picCandidates, savedPic])

  /** Site PIC candidates, plus the finding's saved PIC when that user is no longer a candidate. */
  const failurePicOptions = useCallback(
    row => {
      const options = picCandidates.map(user => ({
        value: String(user.idUser),
        label: user.fullName ? `${user.fullName} (${user.username})` : user.username
      }))
      if (row.picUserId && !options.some(option => option.value === row.picUserId)) {
        options.unshift({ value: row.picUserId, label: row.picName || `User ${row.picUserId}` })
      }

      return [{ value: '', label: 'No PIC' }, ...options]
    },
    [picCandidates]
  )

  useEffect(() => {
    if (!selectedDetailId || !visibleLines.length) return
    const line = visibleLines.find(item => item.id === selectedDetailId)
    if (!line) return
    setLineOptions(current => (current.some(item => item.id === line.id) ? current : [line, ...current]))
    setValue('unitId', String(line.fleetUnitId))
  }, [selectedDetailId, setValue, visibleLines])

  useEffect(() => {
    if (!fleetUnitId) {
      setOpenFailures([])
      setRecorded([])

      return
    }
    let cancelled = false
    arkaApi
      .get('/maintenance-failures', {
        params: { fleetUnitId: String(fleetUnitId), ...(actualId ? { actualId } : {}) }
      })
      .then(res => {
        if (cancelled) return
        setOpenFailures(
          (res.data?.openFailures || []).map(row => ({
            ...row,
            progressed: Boolean(row.progressed),
            closureDate: row.closureDate || ''
          }))
        )
        setRecorded(
          (res.data?.recordedHere || []).map(row => ({
            ...row,
            closureDate: row.closureDate || '',
            picUserId: row.picUserId ? String(row.picUserId) : ''
          }))
        )
      })
      .catch(() => {
        if (!cancelled) {
          setOpenFailures([])
          setRecorded([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [actualId, fleetUnitId])

  const loadSubComponents = useCallback(componentCode => {
    const code = String(componentCode || '').trim()
    if (!code || subRequests.current[code]) return
    subRequests.current[code] = true
    arkaApi
      .get('/sap/failure-codes', { params: { kind: 'sub-components', componentCode: code } })
      .then(res => {
        setSapSubs(current => ({ ...current, [code]: res.data?.data || [] }))
      })
      .catch(() => {
        delete subRequests.current[code]
      })
  }, [])

  useEffect(() => {
    if (!fleetUnitId) return
    let cancelled = false
    setSapLoading(true)
    Promise.all([
      arkaApi.get('/sap/failure-codes', { params: { kind: 'components' } }),
      arkaApi.get('/sap/failure-codes', { params: { kind: 'damages' } })
    ])
      .then(([componentsRes, damagesRes]) => {
        if (cancelled) return
        setSapComponents(componentsRes.data?.data || [])
        setSapDamages(damagesRes.data?.data || [])
        setSapError(null)
      })
      .catch(err => {
        if (!cancelled) setSapError(err?.response?.data?.error || 'SAP failure codes are unavailable')
      })
      .finally(() => {
        if (!cancelled) setSapLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fleetUnitId])

  useEffect(() => {
    for (const row of [...recorded, ...drafts]) {
      if (row.componentCode) loadSubComponents(row.componentCode)
    }
  }, [drafts, loadSubComponents, recorded])

  const selectValue = event => (event && typeof event === 'object' && event.target ? event.target.value : event)

  const handleSearchPlan = () => {
    const yearNum = planYear === '' || planYear == null ? null : Number(planYear)
    const monthNum = planMonth === '' || planMonth == null ? null : Number(planMonth)
    const projectId = planProjectId?.trim?.() ?? ''
    const typeId = planMaintenanceTypeId?.trim?.() ?? ''
    const hasCriteria = Boolean(projectId || yearNum || monthNum || typeId || lockedFleetUnitId)
    if (!hasCriteria) {
      setShowEmptyCriteriaAlert(true)
      setHasSearched(false)
      setLineOptions([])

      return
    }
    setShowEmptyCriteriaAlert(false)
    setHasSearched(true)
    setLineOptions(
      filterPlanLines(visibleLines, {
        projectId,
        year: yearNum,
        month: monthNum,
        maintenanceTypeId: typeId,
        fleetUnitId: lockedFleetUnitId
      })
    )
  }

  const clearPlanDate = () => {
    setHasSearched(false)
    setLineOptions([])
    setValue('maintenancePlanDetailId', '')
    if (!lockedFleetUnitId) setValue('unitId', '')
  }

  const onSubmit = async data => {
    if (!user?.id) {
      setError('maintenancePlanDetailId', { message: 'You must be logged in' })

      return
    }
    const line = visibleLines.find(item => item.id === data.maintenancePlanDetailId)
    if (mode === 'add' && !line) {
      setError('maintenancePlanDetailId', { message: 'Select a plan date' })

      return
    }
    if (mode === 'edit' && data.maintenancePlanDetailId && !line && !legacyUnlinked) {
      setError('maintenancePlanDetailId', { message: 'Select a plan date' })

      return
    }
    for (const row of [...drafts, ...recorded]) {
      if (!String(row.description || '').trim()) {
        toast.error('Each finding needs a description')

        return
      }
      if (!row.componentCode || !row.subComponentCode || !row.damageCode) {
        toast.error('Each finding needs a component, sub component, and damage')

        return
      }
    }

    const payload = {
      ...(line ? { maintenancePlanDetailId: line.id, unitId: String(line.fleetUnitId) } : {}),
      maintenanceDate: data.maintenanceDate,
      maintenanceTime: data.maintenanceTime || null,
      hourMeter: Number(data.hourMeter),
      remarks: data.remarks || null,
      mechanics: data.mechanics || null,
      qcStatus: data.qcStatus || null,
      picUserId: data.picUserId ? Number(data.picUserId) : null,
      ...(mode === 'edit' ? { status: data.status || 'CLOSED' } : {}),
      ...(mode === 'add' ? { createdById: user.id } : {})
    }

    try {
      let savedId = actualId
      if (mode === 'add') {
        const result = await dispatch(addMaintenanceActual(payload)).unwrap()
        savedId = result?.maintenanceActual?.id
      } else {
        await dispatch(updateMaintenanceActual({ id: actualId, data: payload })).unwrap()
      }
      if (!savedId) throw new Error('Actual was not saved')
      await actualPhotoRef.current?.flushPending?.(savedId)

      const sync = await arkaApi.post('/maintenance-failures', {
        actualId: savedId,
        follows: openFailures.map(row => ({
          failureId: row.id,
          progressed: Boolean(row.progressed),
          closureDate: row.closureDate || null
        })),
        recorded: recorded.map(row => ({
          failureId: row.id,
          severity: row.severity,
          description: row.description,
          componentCode: row.componentCode,
          subComponentCode: row.subComponentCode,
          damageCode: row.damageCode,
          occurredAt: row.occurredAt || null,
          closureDate: row.closureDate || null,
          picUserId: row.picUserId || null
        })),
        created: drafts.map(row => ({
          clientKey: row.clientKey,
          severity: row.severity,
          description: row.description,
          componentCode: row.componentCode,
          subComponentCode: row.subComponentCode,
          damageCode: row.damageCode,
          occurredAt: row.occurredAt || null,
          closureDate: row.closureDate || null,
          picUserId: row.picUserId || null
        }))
      })
      const created = sync.data?.created || []
      await Promise.all(created.map(row => photoRefs.current[row.clientKey]?.flushPending?.(row.id)))
      toast.success(mode === 'add' ? 'Maintenance actual created' : 'Maintenance actual updated')
      onSaved?.(savedId, { failuresSaved: true })
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Failed to save'
      setError('maintenancePlanDetailId', { message })
      toast.error(message)
    }
  }

  const pageHeading = embedded ? null : (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 4 }}>
      <Box sx={{ minWidth: 0, '& > .MuiGrid-item': { width: 'auto', maxWidth: '100%', flexBasis: 'auto' } }}>
        <PageHeader
          title={
            <Typography variant='h4'>
              {mode === 'edit' ? 'Edit Maintenance Actual' : 'Add Maintenance Actual'}
            </Typography>
          }
          subtitle={
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {mode === 'edit'
                ? 'Update the execution and findings for this plan date.'
                : 'Record an execution against a plan date.'}
            </Typography>
          }
        />
      </Box>
      <Button
        component={Link}
        href={cancelHref}
        variant='contained'
        startIcon={<Icon icon='tabler:arrow-left' />}
        sx={{ flexShrink: 0 }}
      >
        Back
      </Button>
    </Box>
  )

  if (loading) {
    return (
      <Box>
        {pageHeading}
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 16 }}>
          <CircularProgress />
        </Box>
      </Box>
    )
  }

  if (fetchError) {
    return (
      <Box>
        {pageHeading}
        <Alert severity='error'>{fetchError}</Alert>
      </Box>
    )
  }

  return (
    <Box>
      {pageHeading}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title='Maintenance Plan' titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
              <CardContent sx={{ pt: 0 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 2 }}>
                  {lockedFleetUnitId ? null : (
                    <Controller
                      name='planProjectId'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          name={field.name}
                          size='small'
                          label='Project'
                          value={field.value}
                          onBlur={field.onBlur}
                          options={projectOptions.map(project => ({
                            value: String(project.value),
                            label: project.label || project.value
                          }))}
                          placeholder='Search project…'
                          onChange={event => {
                            field.onChange(selectValue(event))
                            clearPlanDate()
                          }}
                        />
                      )}
                    />
                  )}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                      <Controller
                        name='planYear'
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            name={field.name}
                            size='small'
                            label='Year'
                            value={field.value === '' || field.value == null ? '' : String(field.value)}
                            options={yearOptions}
                            placeholder='Year…'
                            onChange={event => {
                              field.onChange(selectValue(event))
                              clearPlanDate()
                            }}
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                      <Controller
                        name='planMonth'
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            name={field.name}
                            size='small'
                            label='Month'
                            value={field.value === '' || field.value == null ? '' : String(field.value)}
                            options={monthOptions}
                            placeholder='Month…'
                            onChange={event => {
                              field.onChange(selectValue(event))
                              clearPlanDate()
                            }}
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '1 1 0', minWidth: 120 }}>
                      <Controller
                        name='planMaintenanceTypeId'
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            name={field.name}
                            size='small'
                            label='Maintenance Type'
                            value={field.value}
                            options={typeOptions}
                            placeholder='Search type…'
                            onChange={event => {
                              field.onChange(selectValue(event))
                              clearPlanDate()
                            }}
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: '0 0 auto' }}>
                      <Button
                        type='button'
                        variant='tonal'
                        color='primary'
                        size='medium'
                        startIcon={<Icon icon='tabler:search' />}
                        onClick={handleSearchPlan}
                      >
                        Search Plan
                      </Button>
                    </Box>
                  </Box>
                </Box>
                {showEmptyCriteriaAlert ? (
                  <Alert severity='warning' sx={{ mb: 2 }}>
                    Choose a project, year, month, or type before searching.
                  </Alert>
                ) : null}
                {legacyUnlinked ? (
                  <Alert severity='info' sx={{ mb: 2 }}>
                    This actual is still on a monthly quota. Select a plan date to attach it.
                  </Alert>
                ) : null}
                {errors.maintenancePlanDetailId ? (
                  <Alert severity='error' sx={{ mb: 2 }}>
                    {errors.maintenancePlanDetailId.message}
                  </Alert>
                ) : null}
                {/* 7 rows: 16px padding + two body2 lines + 1px divider, plus the box border */}
                <Box sx={{ maxHeight: 401, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  {lineOptions.length === 0 ? (
                    <Typography variant='body2' color='text.secondary' sx={{ p: 3 }}>
                      {hasSearched ? 'No plan dates for this filter.' : 'Search to list plan dates.'}
                    </Typography>
                  ) : (
                    lineOptions.map(line => {
                      const taken = Boolean(line.hasActual) && line.id !== selectedDetailId
                      const selected = line.id === selectedDetailId

                      return (
                        <Box
                          key={line.id}
                          onClick={() => chooseLine(line)}
                          sx={{
                            px: 3,
                            py: 2,
                            cursor: taken ? 'not-allowed' : 'pointer',
                            opacity: taken ? 0.55 : 1,
                            bgcolor: selected ? 'primary.main' : 'transparent',
                            color: selected ? 'primary.contrastText' : 'text.primary',
                            borderBottom: 1,
                            borderColor: 'divider',
                            '&:hover': taken || selected ? undefined : { bgcolor: 'action.hover' }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                            <Typography variant='body2' sx={{ fontWeight: 700 }}>
                              {line.planDate}
                            </Typography>
                            {taken ? <CustomChip size='small' skin='light' color='success' label='Recorded' /> : null}
                          </Box>
                          <Typography variant='body2' sx={{ color: selected ? 'inherit' : 'text.secondary' }}>
                            {line.unitNo || line.fleetUnitId} · {line.maintenanceTypeName || '—'} · {line.projectId}
                          </Typography>
                        </Box>
                      )
                    })
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title='Detail Actual' titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }} />
              <CardContent sx={{ pt: 0 }}>
                <Grid container spacing={4}>
                  <Grid item xs={12}>
                    <CustomTextField
                      fullWidth
                      label='Register no'
                      value={registerNo}
                      InputProps={{ readOnly: true }}
                      placeholder='Select a plan date'
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <CustomTextField
                      fullWidth
                      label='Unit'
                      value={unitLabel}
                      InputProps={{ readOnly: true }}
                      placeholder='Select a plan date'
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='hourMeter'
                      control={control}
                      render={({ field }) => (
                        <CustomTextField
                          fullWidth
                          type='number'
                          label='Hour Meter'
                          value={field.value}
                          onChange={field.onChange}
                          error={Boolean(errors.hourMeter)}
                          helperText={errors.hourMeter?.message}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name='maintenanceDate'
                      control={control}
                      render={({ field }) => (
                        <DatePickerWrapper sx={{ width: '100%', '& .MuiFormControl-root': { width: '100%' } }}>
                          <DatePicker
                            selected={field.value ? new Date(field.value) : null}
                            dateFormat='yyyy-MM-dd'
                            popperPlacement={popperPlacement}
                            onChange={date => field.onChange(date ? date.toISOString().slice(0, 10) : '')}
                            customInput={
                              <PickersCustomInput
                                fullWidth
                                label='Maintenance Date'
                                error={Boolean(errors.maintenanceDate)}
                                helperText={errors.maintenanceDate?.message}
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
                      render={({ field }) => (
                        <DatePickerWrapper sx={{ width: '100%', '& .MuiFormControl-root': { width: '100%' } }}>
                          <DatePicker
                            selected={field.value ? new Date(`1970-01-01T${field.value}`) : null}
                            showTimeSelect
                            showTimeSelectOnly
                            timeIntervals={15}
                            dateFormat='HH:mm'
                            popperPlacement={popperPlacement}
                            onChange={date =>
                              field.onChange(
                                date ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
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
                      render={({ field }) => (
                        <CustomTextField
                          fullWidth
                          multiline
                          rows={2}
                          label='Remarks (optional)'
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name='mechanics'
                      control={control}
                      render={({ field }) => (
                        <CustomTextField
                          fullWidth
                          label='Mechanics (optional)'
                          placeholder='e.g. Budi, Andi'
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={mode === 'edit' ? 4 : 6}>
                    <Controller
                      name='picUserId'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          label='PIC (optional)'
                          value={field.value}
                          onChange={event => field.onChange(event.target.value)}
                          disabled={!picProjectId}
                          placeholder={picProjectId ? 'Search user…' : 'Select a plan date'}
                          options={picOptions}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={mode === 'edit' ? 4 : 6}>
                    <Controller
                      name='qcStatus'
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          label='QC status'
                          value={field.value}
                          onChange={event => field.onChange(event.target.value)}
                          disableClearable
                          options={QC_OPTIONS}
                        />
                      )}
                    />
                  </Grid>
                  {mode === 'edit' && (
                    <Grid item xs={12} sm={4}>
                      <Controller
                        name='status'
                        control={control}
                        render={({ field }) => (
                          <SearchableSelect
                            label='Status'
                            value={field.value}
                            onChange={event => field.onChange(event.target.value)}
                            disableClearable
                            options={STATUS_OPTIONS}
                          />
                        )}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <EntityAttachmentsSection
                      ref={actualPhotoRef}
                      entityType='MAINTENANCE_ACTUAL'
                      entityId={mode === 'edit' ? actualId : null}
                      allowPending={mode === 'add'}
                      canUpload
                      canDelete
                      imagesOnly
                      title='Photos'
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardHeader
                title='Failures'
                subheader='Open findings stay one row per defect. Saving this actual records a follow-up until the finding is closed.'
                action={
                  <Button
                    variant='tonal'
                    startIcon={<Icon icon='tabler:plus' />}
                    onClick={() => setDrafts(current => [...current, emptyDraft(maintenanceDate)])}
                    disabled={!fleetUnitId}
                  >
                    Add Finding
                  </Button>
                }
              />
              <CardContent>
                {sapError ? (
                  <Alert severity='warning' sx={{ mb: 4 }}>
                    {sapError}
                  </Alert>
                ) : null}
                {!fleetUnitId ? (
                  <Typography variant='body2' color='text.secondary'>
                    Select a plan date to see open findings for that unit.
                  </Typography>
                ) : null}
                {fleetUnitId && openFailures.length === 0 && recorded.length === 0 && drafts.length === 0 ? (
                  <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
                    No open findings on this unit.
                  </Typography>
                ) : null}
                {openFailures.map(row => (
                  <Box key={row.id} sx={failureCardSx}>
                    <Box
                      sx={{
                        px: 4,
                        py: 3,
                        borderBottom: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: 'wrap'
                      }}
                    >
                      <CustomChip
                        size='small'
                        skin='light'
                        color={SEVERITY_COLOR[row.severity] || 'secondary'}
                        label={row.severity}
                      />
                      <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                        Open finding
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Counted when you save this actual
                      </Typography>
                    </Box>
                    <Box sx={{ p: 4 }}>
                      <Typography variant='body2' sx={{ fontWeight: 600, mb: 3 }}>
                        {row.description}
                      </Typography>
                      {failureCodeSummary(row) || row.sapFailureCode ? (
                        <Box sx={{ mb: 4, p: 3, borderRadius: 1, bgcolor: 'action.hover' }}>
                          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                            Failure code
                          </Typography>
                          <Typography variant='body2'>{failureCodeSummary(row) || row.sapFailureCode}</Typography>
                        </Box>
                      ) : null}
                      <Grid container spacing={4} alignItems='center'>
                        <Grid item xs={12} sm={4}>
                          <CustomTextField
                            fullWidth
                            label='Finding date'
                            value={row.occurredAt || ''}
                            InputProps={{ readOnly: true }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={Boolean(row.progressed)}
                                onChange={event =>
                                  setOpenFailures(current =>
                                    current.map(item =>
                                      item.id === row.id ? { ...item, progressed: event.target.checked } : item
                                    )
                                  )
                                }
                              />
                            }
                            label='Progressed'
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <DatePickerWrapper sx={{ width: '100%', '& .MuiFormControl-root': { width: '100%' } }}>
                            <DatePicker
                              selected={row.closureDate ? new Date(row.closureDate) : null}
                              dateFormat='yyyy-MM-dd'
                              isClearable
                              popperPlacement={popperPlacement}
                              onChange={date =>
                                setOpenFailures(current =>
                                  current.map(item =>
                                    item.id === row.id
                                      ? { ...item, closureDate: date ? date.toISOString().slice(0, 10) : '' }
                                      : item
                                  )
                                )
                              }
                              customInput={<PickersCustomInput fullWidth label='Closed on (optional)' />}
                            />
                          </DatePickerWrapper>
                        </Grid>
                        <Grid item xs={12}>
                          <EntityAttachmentsSection
                            entityType='MAINTENANCE_FAILURE'
                            entityId={row.id}
                            canUpload
                            canDelete
                            imagesOnly
                            title='Photos'
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </Box>
                ))}
                {recorded.map(row => (
                  <EditableFailureCard
                    key={row.id}
                    title='Recorded on this actual'
                    row={row}
                    sapComponents={sapComponents}
                    sapDamages={sapDamages}
                    sapSubs={sapSubs[row.componentCode] || []}
                    sapLoading={sapLoading}
                    popperPlacement={popperPlacement}
                    onSeverityChange={event =>
                      setRecorded(current =>
                        current.map(item => (item.id === row.id ? { ...item, severity: event.target.value } : item))
                      )
                    }
                    onDescriptionChange={event =>
                      setRecorded(current =>
                        current.map(item => (item.id === row.id ? { ...item, description: event.target.value } : item))
                      )
                    }
                    onOccurredAtChange={date =>
                      setRecorded(current =>
                        current.map(item =>
                          item.id === row.id
                            ? { ...item, occurredAt: date ? date.toISOString().slice(0, 10) : '' }
                            : item
                        )
                      )
                    }
                    onClosureDateChange={date =>
                      setRecorded(current =>
                        current.map(item =>
                          item.id === row.id
                            ? { ...item, closureDate: date ? date.toISOString().slice(0, 10) : '' }
                            : item
                        )
                      )
                    }
                    picOptions={failurePicOptions(row)}
                    onPicChange={event =>
                      setRecorded(current =>
                        current.map(item => (item.id === row.id ? { ...item, picUserId: event.target.value || '' } : item))
                      )
                    }
                    onSapChange={patch => {
                      if (patch.componentCode && patch.componentCode !== row.componentCode) {
                        loadSubComponents(patch.componentCode)
                      }
                      setRecorded(current => current.map(item => (item.id === row.id ? { ...item, ...patch } : item)))
                    }}
                    photoSlot={
                      <EntityAttachmentsSection
                        entityType='MAINTENANCE_FAILURE'
                        entityId={row.id}
                        canUpload
                        canDelete
                        imagesOnly
                        title='Photos'
                      />
                    }
                  />
                ))}
                {drafts.map(row => (
                  <EditableFailureCard
                    key={row.clientKey}
                    title='New finding'
                    row={row}
                    sapComponents={sapComponents}
                    sapDamages={sapDamages}
                    sapSubs={sapSubs[row.componentCode] || []}
                    sapLoading={sapLoading}
                    popperPlacement={popperPlacement}
                    headerAction={
                      <Button
                        size='small'
                        color='secondary'
                        onClick={() => setDrafts(current => current.filter(item => item.clientKey !== row.clientKey))}
                      >
                        Remove
                      </Button>
                    }
                    onSeverityChange={event =>
                      setDrafts(current =>
                        current.map(item =>
                          item.clientKey === row.clientKey ? { ...item, severity: event.target.value } : item
                        )
                      )
                    }
                    onDescriptionChange={event =>
                      setDrafts(current =>
                        current.map(item =>
                          item.clientKey === row.clientKey ? { ...item, description: event.target.value } : item
                        )
                      )
                    }
                    onOccurredAtChange={date =>
                      setDrafts(current =>
                        current.map(item =>
                          item.clientKey === row.clientKey
                            ? { ...item, occurredAt: date ? date.toISOString().slice(0, 10) : '' }
                            : item
                        )
                      )
                    }
                    onClosureDateChange={date =>
                      setDrafts(current =>
                        current.map(item =>
                          item.clientKey === row.clientKey
                            ? { ...item, closureDate: date ? date.toISOString().slice(0, 10) : '' }
                            : item
                        )
                      )
                    }
                    picOptions={failurePicOptions(row)}
                    onPicChange={event =>
                      setDrafts(current =>
                        current.map(item =>
                          item.clientKey === row.clientKey ? { ...item, picUserId: event.target.value || '' } : item
                        )
                      )
                    }
                    onSapChange={patch => {
                      if (patch.componentCode && patch.componentCode !== row.componentCode) {
                        loadSubComponents(patch.componentCode)
                      }
                      setDrafts(current =>
                        current.map(item => (item.clientKey === row.clientKey ? { ...item, ...patch } : item))
                      )
                    }}
                    photoSlot={
                      <EntityAttachmentsSection
                        ref={node => {
                          photoRefs.current[row.clientKey] = node
                        }}
                        entityType='MAINTENANCE_FAILURE'
                        allowPending
                        canUpload
                        imagesOnly
                        title='Photos'
                      />
                    }
                  />
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button type='submit' variant='contained' disabled={!user?.id || isSubmitting}>
                Save
              </Button>
              {onCancel ? (
                <Button type='button' variant='tonal' color='secondary' onClick={onCancel}>
                  Cancel
                </Button>
              ) : (
                <Button component={Link} href={cancelHref} variant='tonal' color='secondary'>
                  Cancel
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  )
}

export default MaintenanceActualForm
