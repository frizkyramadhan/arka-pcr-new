/**
 * Breakdown add and edit.
 * Project is limited to the user's sites. Units follow that project.
 * Hour meter is filled from the unit's reading on the start date and can still be changed.
 * Model and serial follow the selected unit from ARKFleet and stay read-only.
 * The form is a vertical icon wizard: Breakdown, Activity, Create/Update SAP WO, Review.
 * Activity is its own step under Breakdown and only appears when adding.
 * Without a linked service call, Create WO SAP is opt-in. With a service call, edit always updates that WO.
 * Last operator stays on the Breakdown step.
 * The first activity is its own step under Breakdown, and only on add.
 * That step picks the plant mechanic beside prepared by, and stores the mechanic name on the activity.
 */
import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Checkbox from '@mui/material/Checkbox'
import Grid from '@mui/material/Grid'
import MuiStep from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'

import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import PageHeader from 'src/@core/components/page-header'
import StepperWrapper from 'src/@core/styles/mui/stepper'
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba'
import { useAuth } from 'src/hooks/useAuth'
import useProjects from 'src/hooks/useProjects'
import arkaApi from 'src/utils/arka-api'
import { splitWallClock } from 'src/utils/date-format'
import { toUnitSearchOption } from 'src/utils/unit-select-options'
import { fetchData as fetchUnits } from 'src/store/apps/unit'
import { SapDocumentPicker } from 'src/views/pcr/sap'

const POSITIONS = [
  { value: 'BD', label: 'BD — breakdown' },
  { value: 'OP', label: 'OP — operation' },
  { value: 'SB', label: 'SB — standby' },
  { value: 'AJ', label: 'AJ — additional job' }
]

/** Add: Breakdown, Activity, Create SAP WO, Review. Edit has no Activity step. */
const WIZARD_STEPS = [
  { key: 'breakdown', icon: 'tabler:tool', title: 'Breakdown', subtitle: 'Unit, waktu, dan masalah' },
  { key: 'activity', icon: 'tabler:list-check', title: 'Activity', subtitle: 'Pekerjaan pertama pada breakdown ini' },
  {
    key: 'sap',
    icon: 'tabler:file-invoice',
    title: 'Create SAP WO',
    subtitle: 'Data pelengkap. Centang agar isiannya aktif'
  },
  { key: 'review', icon: 'tabler:circle-check', title: 'Review', subtitle: 'Periksa, lalu simpan' }
]

const StepperHeaderContainer = styled(CardContent)(({ theme }) => ({
  borderRight: `1px solid ${theme.palette.divider}`,
  [theme.breakpoints.up('md')]: {
    flex: '0 0 18.5rem'
  },
  [theme.breakpoints.down('md')]: {
    borderRight: 0,
    borderBottom: `1px solid ${theme.palette.divider}`
  }
}))

const Step = styled(MuiStep)(({ theme }) => ({
  '& .MuiStepLabel-root': {
    paddingTop: 0,
    cursor: 'pointer'
  },
  '&:not(:last-of-type) .MuiStepLabel-root': {
    paddingBottom: theme.spacing(6)
  },
  '&:last-of-type .MuiStepLabel-root': {
    paddingBottom: 0
  },
  '& .MuiStepLabel-iconContainer': {
    display: 'none'
  },
  '& .step-subtitle': {
    color: `${theme.palette.text.disabled} !important`
  },
  '&.Mui-completed .step-title': {
    color: theme.palette.text.disabled
  }
}))

const Fact = ({ label, value }) => (
  <Grid item xs={12} sm={6}>
    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography>{value || '—'}</Typography>
  </Grid>
)

const named = (rows, code) => {
  const found = (rows || []).find(item => item.code === code)

  return found ? `${found.code} · ${found.name}` : code || '—'
}

const localNow = () => {
  const date = new Date()
  const pad = value => String(value).padStart(2, '0')

  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
}

/** Split API/DB wall-clock stamp into date+time inputs (no browser TZ shift). */
const splitStamp = iso => splitWallClock(iso) || localNow()

const emptyActivity = (date, time) => ({
  code: '',
  position: 'BD',
  startedDate: date,
  startedTime: time,
  endedDate: '',
  endedTime: '',
  details: '',
  technicianName: ''
})

const BreakdownForm = ({
  mode = 'add',
  initial = null,
  onSaved,
  onCancel,
  onRefresh = null,
  refreshing = false,

  /** Compact layout for dialog/modal use (no page header). */
  embedded = false
}) => {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { projects: projectsFromApi } = useProjects()
  const unitStore = useSelector(state => state.unit)
  const now = useMemo(() => localNow(), [])
  const start = initial?.startedAt ? splitStamp(initial.startedAt) : now
  const [projectId, setProjectId] = useState(initial?.projectCode ?? '')
  const [fleetUnitId, setFleetUnitId] = useState(initial?.fleetUnitId ? String(initial.fleetUnitId) : '')
  const [startedDate, setStartedDate] = useState(start.date)
  const [startedTime, setStartedTime] = useState(start.time)
  const [problem, setProblem] = useState(initial?.problem ?? '')
  const [hourMeter, setHourMeter] = useState(initial?.hourMeter == null ? '' : String(initial.hourMeter))
  const [hmHint, setHmHint] = useState('')
  const [serialNo, setSerialNo] = useState(initial?.serialNo ?? '')
  const [jobCategory, setJobCategory] = useState(initial?.jobCategory ?? '')
  const [jobCode, setJobCode] = useState(initial?.jobCode ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [operatorCode, setOperatorCode] = useState(initial?.operatorCode || '')
  const [mechanicLeaderCode, setMechanicLeaderCode] = useState(initial?.mechanicLeaderCode || '')
  const [assigneeCode, setAssigneeCode] = useState(initial?.assigneeUserId ? String(initial.assigneeUserId) : '')
  const [issueWorkOrder, setIssueWorkOrder] = useState(false)
  const [workOrder, setWorkOrder] = useState(initial?.workOrder ?? '')
  const [remark, setRemark] = useState(initial?.remark ?? '')
  const [componentCode, setComponentCode] = useState(initial?.componentCode ?? '')
  const [subComponentCode, setSubComponentCode] = useState(initial?.subComponentCode ?? '')
  const [subComponents, setSubComponents] = useState([])
  const [damageCode, setDamageCode] = useState(initial?.damageCode ?? '')
  const [failureCauseCode, setFailureCauseCode] = useState(initial?.failureCauseCode ?? '')
  const [activity, setActivity] = useState(() => emptyActivity(start.date, start.time))
  const [registerNo, setRegisterNo] = useState(initial?.registerNo ?? '')

  const [lookups, setLookups] = useState({
    activities: [],
    components: [],
    jobCategories: [],
    jobCodes: [],
    operators: [],
    mechanics: [],
    users: [],
    damages: [],
    causes: [],
    locations: []
  })
  const [saving, setSaving] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  /** Open BD-position episode on the selected unit — new record should default to AJ. */
  const [openBd, setOpenBd] = useState(null)

  const preparedByName = (user?.fullName || user?.username || '').trim().replace(/\s+/g, ' ').slice(0, 20)
  const mechanicName = lookups.mechanics.find(item => item.code === mechanicLeaderCode)?.name || ''
  const isEdit = mode === 'edit'
  const isClosed = Boolean(initial?.finishedAt || initial?.cancelledAt)
  const hasSapWo = Boolean(initial?.sapServiceCallId)
  const syncSapWo = hasSapWo || issueWorkOrder

  const steps = useMemo(() => {
    const base = isEdit ? WIZARD_STEPS.filter(step => step.key !== 'activity') : WIZARD_STEPS

    return base.map(step => {
      if (step.key !== 'sap' || !hasSapWo) return step

      return {
        ...step,
        title: 'Update SAP WO',
        subtitle: 'Perbarui work order SAP yang sudah terhubung'
      }
    })
  }, [isEdit, hasSapWo])
  const sapFieldsOff = isClosed || !syncSapWo

  const projectCodes = useMemo(
    () => (user?.projectCodes ?? []).map(code => String(code).trim().toUpperCase()).filter(Boolean),
    [user?.projectCodes]
  )
  const isHeadOffice = projectCodes.includes('000H') || projectCodes.includes('001H')
  const siteCodes = useMemo(() => projectCodes.filter(code => code !== '000H' && code !== '001H'), [projectCodes])
  const projectLocked = !isHeadOffice && siteCodes.length === 1

  const projectOptions = useMemo(() => {
    const list = projectsFromApi || []
    if (isHeadOffice) return list
    if (!siteCodes.length && !projectCodes.length) return []

    const allowed = new Set(siteCodes.length ? siteCodes : projectCodes)

    return list.filter(project =>
      allowed.has(
        String(project.value ?? '')
          .trim()
          .toUpperCase()
      )
    )
  }, [isHeadOffice, projectCodes, projectsFromApi, siteCodes])

  useEffect(() => {
    if (isEdit || !projectLocked) return
    const only = projectOptions[0]?.value
    if (only) setProjectId(String(only))
  }, [isEdit, projectLocked, projectOptions])

  const units = useMemo(() => {
    if (!projectId) return []
    const allUnits = unitStore.allData?.length ? unitStore.allData : unitStore.data || []

    return allUnits.filter(
      unit =>
        String(unit.projectId ?? unit.projectCode ?? '')
          .trim()
          .toUpperCase() === String(projectId).toUpperCase()
    )
  }, [projectId, unitStore.allData, unitStore.data])

  const selectedUnit = units.find(unit => String(unit.id) === String(fleetUnitId))

  useEffect(() => {
    dispatch(fetchUnits({}))
  }, [dispatch])

  useEffect(() => {
    let active = true
    arkaApi
      .get('/breakdowns/lookups')
      .then(response => {
        if (!active) return
        setLookups(prev => ({
          ...prev,
          activities: response.data?.activities ?? [],
          components: response.data?.components ?? [],
          jobCategories: response.data?.jobCategories ?? [],
          jobCodes: response.data?.jobCodes ?? [],
          damages: response.data?.damages ?? [],
          causes: response.data?.causes ?? [],
          locations: response.data?.locations ?? []
        }))
        const lookupErrors = response.data?.lookupErrors ?? {}
        Object.values(lookupErrors).forEach(message => {
          if (message) toast.error(message)
        })
      })
      .catch(() => {
        if (active) toast.error('Activity and component lists could not be loaded from SAP')
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!projectId) {
      setLookups(prev => ({ ...prev, operators: [], mechanics: [], users: [] }))
      setOperatorCode('')
      setMechanicLeaderCode('')
      setAssigneeCode('')

      return
    }

    let active = true
    setLookups(prev => ({ ...prev, operators: [], mechanics: [], users: [] }))
    arkaApi
      .get('/breakdowns/lookups', { params: { scope: 'staff', projectCode: projectId } })
      .then(response => {
        if (!active) return
        const operators = response.data?.operators ?? []
        const mechanics = response.data?.mechanics ?? []
        const users = response.data?.users ?? []
        setLookups(prev => ({ ...prev, operators, mechanics, users }))
        setOperatorCode(current => (operators.some(item => item.code === current) ? current : ''))
        setMechanicLeaderCode(current => (mechanics.some(item => item.code === current) ? current : ''))
        setAssigneeCode(current => (users.some(item => item.code === current) ? current : ''))
        const message = response.data?.lookupErrors?.staff
        if (message) toast.error(message)
      })
      .catch(() => {
        if (active) toast.error('Operator, mechanic, and assignee lists could not be loaded from SAP')
      })

    return () => {
      active = false
    }
  }, [projectId])

  useEffect(() => {
    if (isEdit || !fleetUnitId || !startedDate) {
      if (!isEdit) setHmHint('')

      return
    }

    let active = true
    arkaApi
      .get('/breakdowns/hour-meter', { params: { fleetUnitId, date: startedDate } })
      .then(response => {
        if (!active) return
        const reading = response.data?.hourMeter
        if (reading == null) {
          setHmHint('No hour meter reading for this unit yet. You can type one.')

          return
        }
        setHourMeter(String(reading))
        const readingDate = response.data?.readingDate
        setHmHint(
          readingDate && readingDate !== startedDate
            ? `Filled from the hour meter on ${readingDate}. You can change it.`
            : 'Filled from the hour meter on this date. You can change it.'
        )
      })
      .catch(() => {
        if (active) setHmHint('Hour meter could not be loaded. You can type it.')
      })

    return () => {
      active = false
    }
  }, [fleetUnitId, isEdit, startedDate])

  // Pratinjau register BD-{project}.{yymm}-{seq}; nomor final saat create.
  useEffect(() => {
    if (isEdit) return
    if (!projectId || !startedDate) {
      setRegisterNo('')

      return
    }
    let active = true
    arkaApi
      .get('/breakdowns/next-register', { params: { projectCode: projectId, startedDate } })
      .then(response => {
        if (active) setRegisterNo(response.data?.registerNo || '')
      })
      .catch(() => {
        if (active) setRegisterNo('')
      })

    return () => {
      active = false
    }
  }, [isEdit, projectId, startedDate])

  // Serial comes from the live ARKFleet equipment, not the local unit cache.
  useEffect(() => {
    if (!fleetUnitId) {
      setSerialNo('')

      return
    }

    let active = true
    arkaApi
      .get('/breakdowns/unit-serial', { params: { fleetUnitId } })
      .then(response => {
        if (active) setSerialNo(response.data?.serialNo || '')
      })
      .catch(() => {
        if (active) setSerialNo('')
      })

    return () => {
      active = false
    }
  }, [fleetUnitId])

  // One open BD-position per unit: warn and default first activity to AJ.
  useEffect(() => {
    if (isEdit || !fleetUnitId) {
      setOpenBd(null)

      return
    }

    let active = true
    arkaApi
      .get('/breakdowns/open-bd', { params: { fleetUnitId } })
      .then(response => {
        if (!active) return
        const row = response.data?.openBd || null
        setOpenBd(row)
        if (row) {
          setActivity(current => (current.position === 'BD' ? { ...current, position: 'AJ' } : current))
        }
      })
      .catch(() => {
        if (active) setOpenBd(null)
      })

    return () => {
      active = false
    }
  }, [fleetUnitId, isEdit])

  useEffect(() => {
    if (!componentCode) {
      setSubComponents([])

      return
    }

    let active = true
    arkaApi
      .get('/breakdowns/lookups', { params: { componentCode } })
      .then(response => {
        if (!active) return
        setSubComponents(response.data?.subComponents ?? [])
      })
      .catch(() => {
        if (active) setSubComponents([])
      })

    return () => {
      active = false
    }
  }, [componentCode])

  const setActivityField = (field, value) => {
    setActivity(current => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    if (!isEdit && !fleetUnitId) {
      toast.error('Choose a unit')

      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await arkaApi.patch(`/breakdowns/${initial.id}`, {
          problem,
          hourMeter,
          remark,
          startedDate,
          startedTime,
          jobCategory,
          jobCode,
          location,
          operatorCode,
          mechanicLeaderCode,
          assigneeCode,
          componentCode,
          subComponentCode,
          damageCode,
          failureCauseCode,
          preparedBy: preparedByName,
          issueWorkOrder: syncSapWo,
          workOrder
        })
        toast.success(syncSapWo ? 'Breakdown saved and sent to SAP' : 'Breakdown updated')
        onSaved(initial.id)
      } else {
        const response = await arkaApi.post('/breakdowns', {
          fleetUnitId: Number(fleetUnitId),
          startedDate,
          startedTime,
          problem,
          hourMeter,
          remark,
          jobCategory,
          jobCode,
          location,
          operatorCode,
          mechanicLeaderCode,
          assigneeCode,
          componentCode,
          subComponentCode,
          damageCode,
          failureCauseCode,
          preparedBy: preparedByName,
          issueWorkOrder: syncSapWo,
          workOrder,
          activity: { ...activity, technicianName: mechanicName.slice(0, 30) }
        })
        toast.success(syncSapWo ? 'Breakdown saved and SAP work order created' : 'Breakdown created')
        onSaved(response.data.id)
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not save the breakdown')
    } finally {
      setSaving(false)
    }
  }

  const stepIssue = key => {
    if (key === 'breakdown') {
      if (!projectId) return 'Choose a project'
      if (!isEdit && !fleetUnitId) return 'Choose a unit'
      if (!startedDate || !startedTime) return 'Start date and time are required'
      if (!problem.trim()) return 'Problem is required'
      if (
        operatorCode &&
        lookups.operators.length &&
        !lookups.operators.some(item => item.code === operatorCode)
      ) {
        return 'Choose a last operator from SAP'
      }
    }
    if (key === 'activity') {
      if (!activity.code) return 'Choose an activity code'
      if (!activity.startedDate || !activity.startedTime) return 'Activity start is required'
      if (!isEdit && openBd && activity.position === 'BD') {
        return 'This unit already has an open BD. Use AJ (additional job) or close the BD first.'
      }
    }
    if (key === 'sap' && syncSapWo) {
      if (!jobCategory) return 'Choose a job category'
      if (!jobCode) return 'Choose a job code'
      if (!location) return 'Choose a location'
      if (!operatorCode) return 'Choose a last operator'
      if (!mechanicLeaderCode) return isEdit ? 'Choose a mechanic leader' : 'Choose a mechanic on the activity step'
      if (!assigneeCode) return 'Choose handled by'
      if (!componentCode) return 'Choose a component'
      if (!subComponentCode) return 'Choose a sub component'
      if (!damageCode) return 'Choose a damage'
      if (!failureCauseCode) return 'Choose a failure cause'
      if (!preparedByName) return 'Signed-in user name is missing'
    }

    return ''
  }

  const goToStep = index => {
    if (index <= activeStep) {
      setActiveStep(index)

      return
    }
    for (let cursor = activeStep; cursor < index; cursor += 1) {
      const issue = stepIssue(steps[cursor].key)
      if (issue) {
        toast.error(issue)
        setActiveStep(cursor)

        return
      }
    }
    setActiveStep(index)
  }

  const unitLabel = selectedUnit?.code || selectedUnit?.unit_no || initial?.unitNo || '—'
  const modelLabel = selectedUnit?.model || initial?.modelName || '—'
  const current = steps[activeStep]
  const onLastStep = activeStep === steps.length - 1

  const stepBody = key => {
    if (key === 'breakdown') {
      return (
        <>
          <Grid item xs={12} md={6}>
            <SearchableSelect
              label='Project'
              value={projectId}
              disabled={isEdit || projectLocked}
              disableClearable={projectLocked || isEdit}
              onChange={event => {
                setProjectId(event.target.value)
                setFleetUnitId('')
              }}
              placeholder='Choose a project'
              options={projectOptions.map(project => ({
                value: project.value,
                label:
                  project.label && project.label !== project.value
                    ? `${project.value} · ${project.label}`
                    : project.value
              }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            {isEdit ? (
              <CustomTextField fullWidth label='Unit' value={initial?.unitNo || ''} disabled />
            ) : (
              <SearchableSelect
                label='Unit'
                value={fleetUnitId}
                disabled={!projectId}
                onChange={event => setFleetUnitId(event.target.value)}
                options={units.map(toUnitSearchOption)}
                placeholder={projectId ? 'Search unit…' : 'Choose a project first'}
              />
            )}
          </Grid>
          {!isEdit && openBd ? (
            <Grid item xs={12}>
              <Alert severity='info'>
                Unit ini masih punya breakdown terbuka dengan position BD
                {openBd.workOrder ? ` (WO ${openBd.workOrder})` : ''}. Record baru akan dijadikan{' '}
                <strong>AJ (additional job)</strong>. Tutup BD dulu bila ini mayor downtime baru.
              </Alert>
            </Grid>
          ) : null}
          <Grid item xs={12} md={6}>
            <CustomTextField
              fullWidth
              label='Model'
              value={modelLabel}
              helperText='From ARKFleet for this unit.'
              disabled
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <CustomTextField
              fullWidth
              label='Serial number'
              value={serialNo || '—'}
              helperText='From ARKFleet for this unit.'
              disabled
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <CustomTextField
              fullWidth
              label='Register no'
              value={registerNo || (isEdit ? '—' : '')}
              InputProps={{ readOnly: true }}
              helperText={
                isEdit
                  ? 'Assigned when the breakdown was created.'
                  : 'Preview — final number is assigned on save (BD-{project}.{yymm}-{seq}).'
              }
              placeholder={isEdit ? undefined : 'Select project and start date'}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <CustomTextField
              fullWidth
              type='date'
              label='Start date'
              value={startedDate}
              disabled={isClosed}
              onChange={event => {
                setStartedDate(event.target.value)
                if (!isEdit) setActivityField('startedDate', event.target.value)
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <CustomTextField
              fullWidth
              type='time'
              label='Start time'
              value={startedTime}
              disabled={isClosed}
              onChange={event => {
                setStartedTime(event.target.value)
                if (!isEdit) setActivityField('startedTime', event.target.value)
              }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <CustomTextField
              fullWidth
              type='number'
              label='Hour meter'
              value={hourMeter}
              disabled={isClosed}
              helperText={isEdit ? 'Saved hour meter. You can change it.' : hmHint || 'Choose a unit and start date'}
              onChange={event => setHourMeter(event.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SearchableSelect
              label='Component code'
              value={componentCode}
              disabled={isClosed}
              onChange={event => {
                setComponentCode(event.target.value)
                setSubComponentCode('')
              }}
              options={lookups.components.map(item => ({
                value: item.code,
                label: `${item.code} · ${item.name}`
              }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SearchableSelect
              label='Last operator'
              value={operatorCode}
              disabled={isClosed || !projectId}
              placeholder={projectId ? 'Search…' : 'Choose a project first'}
              onChange={event => setOperatorCode(event.target.value)}
              options={lookups.operators.map(item => ({
                value: item.code,
                label: `${item.code} · ${item.name}`
              }))}
              helperText='Active Production employees at this project, stored as NIK.'
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <CustomTextField
              fullWidth
              label='Remark'
              value={remark}
              disabled={isClosed}
              onChange={event => setRemark(event.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              multiline
              minRows={3}
              label='Problem'
              value={problem}
              disabled={isClosed}
              onChange={event => setProblem(event.target.value)}
            />
          </Grid>
        </>
      )
    }

    if (key === 'activity') {
      return (
        <>
          <Grid item xs={12} md={6}>
            <SearchableSelect
              label='Activity code'
              value={activity.code}
              onChange={event => setActivityField('code', event.target.value)}
              options={lookups.activities.map(item => ({
                value: item.code,
                label: `${item.code} · ${item.name}`
              }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SearchableSelect
              label='Position'
              value={activity.position}
              onChange={event => setActivityField('position', event.target.value)}
              options={POSITIONS}
              helperText={
                openBd
                  ? 'Unit sudah punya open BD — pilih AJ (atau OP/SB), jangan BD lagi.'
                  : undefined
              }
            />
          </Grid>
          {!isEdit && openBd && activity.position === 'BD' ? (
            <Grid item xs={12}>
              <Alert severity='warning'>
                Position BD ditolak selama masih ada open BD di unit ini. Ganti ke AJ atau tutup BD yang lama.
              </Alert>
            </Grid>
          ) : null}
          <Grid item xs={12} md={3}>
            <CustomTextField
              fullWidth
              type='date'
              label='Activity start'
              value={activity.startedDate}
              onChange={event => setActivityField('startedDate', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <CustomTextField
              fullWidth
              type='time'
              label='Start time'
              value={activity.startedTime}
              onChange={event => setActivityField('startedTime', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <CustomTextField
              fullWidth
              type='date'
              label='Activity end'
              value={activity.endedDate}
              onChange={event => setActivityField('endedDate', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <CustomTextField
              fullWidth
              type='time'
              label='End time'
              value={activity.endedTime}
              onChange={event => setActivityField('endedTime', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SearchableSelect
              label='Mechanic'
              value={mechanicLeaderCode}
              disabled={!projectId}
              placeholder={projectId ? 'Search…' : 'Choose a project first'}
              onChange={event => setMechanicLeaderCode(event.target.value)}
              options={lookups.mechanics.map(item => ({
                value: item.code,
                label: `${item.code} · ${item.name}`
              }))}
              helperText='Active Plant mechanic at this project. The name is saved on this activity.'
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <CustomTextField
              fullWidth
              label='Prepared by'
              value={preparedByName || '—'}
              helperText='Signed-in user. SAP stores up to 20 characters.'
              disabled
            />
          </Grid>
          <Grid item xs={12}>
            <CustomTextField
              fullWidth
              multiline
              minRows={2}
              label='Details'
              value={activity.details}
              onChange={event => setActivityField('details', event.target.value)}
              helperText='Leave blank to use the problem text'
            />
          </Grid>
        </>
      )
    }

    if (key === 'sap') {
      return (
        <>
          <Grid item xs={12}>
            <Typography variant='body2' sx={{ mb: 1, lineHeight: 1.154, color: 'text.primary' }}>
              WO number
            </Typography>
            {hasSapWo ? (
              <>
                <SapDocumentPicker key='linked-wo' type='wo' hideLabel value={workOrder} disabled readOnly onChange={() => undefined} />
                <Box sx={{ mt: 1 }}>
                  <Typography variant='caption' component='p' sx={{ color: 'text.primary', fontWeight: 600 }}>
                    Work order ini sudah terhubung ke SAP
                    {workOrder ? ` (${workOrder})` : ''}. Isian di bawah aktif. Saat disimpan, WO yang sama diperbarui.
                    Nomor WO tidak diganti.
                  </Typography>
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
                  <Box
                    component='label'
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 2,
                      m: 0,
                      whiteSpace: 'nowrap',
                      cursor: isClosed ? 'default' : 'pointer',
                      border: theme => `1px solid rgba(${theme.palette.customColors.main}, 0.2)`,
                      borderRight: 0,
                      borderRadius: '8px 0 0 8px',
                      color: 'text.primary'
                    }}
                  >
                    <Checkbox
                      size='small'
                      checked={issueWorkOrder}
                      disabled={isClosed}
                      onChange={event => {
                        const checked = event.target.checked
                        setIssueWorkOrder(checked)
                        if (checked) setWorkOrder('')
                      }}
                      sx={{ p: 0.5 }}
                    />
                    <Typography variant='body2'>Create WO SAP</Typography>
                  </Box>
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      '& .MuiInputBase-root': {
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0
                      }
                    }}
                  >
                    <SapDocumentPicker
                      key={issueWorkOrder ? 'create-sap' : 'manual-wo'}
                      type='wo'
                      hideLabel
                      value={issueWorkOrder ? '' : workOrder}
                      disabled={isClosed || issueWorkOrder}
                      readOnly={issueWorkOrder}
                      onChange={setWorkOrder}
                    />
                  </Box>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography
                    variant='caption'
                    component='p'
                    sx={{
                      color: issueWorkOrder ? 'text.primary' : 'text.secondary',
                      fontWeight: issueWorkOrder ? 600 : 400
                    }}
                  >
                    Dicentang: isian di bawah aktif dan wajib. Saat disimpan, SAP membuat work order dan mengisi
                    nomornya. Nomor WO dikosongkan dan dikunci. Breakdown tetap tersimpan di sini.
                  </Typography>
                  <Typography
                    variant='caption'
                    component='p'
                    sx={{
                      color: issueWorkOrder ? 'text.secondary' : 'text.primary',
                      fontWeight: issueWorkOrder ? 400 : 600
                    }}
                  >
                    Tidak dicentang: isian di bawah tidak aktif, tetapi tetap terlihat. Ketik atau cari nomor WO. Nomor
                    itu hanya disimpan di breakdown ini. SAP tidak dibuat dan tidak diubah.
                  </Typography>
                </Box>
              </>
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            <SearchableSelect
              label='Job category'
              value={jobCategory}
              disabled={sapFieldsOff}
              onChange={event => {
                setJobCategory(event.target.value)
                setJobCode('')
              }}
              options={lookups.jobCategories.map(item => ({
                value: item.code,
                label: `${item.code} · ${item.name}`
              }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <SearchableSelect
              label='Job code'
              value={jobCode}
              disabled={sapFieldsOff || !jobCategory}
              onChange={event => setJobCode(event.target.value)}
              options={lookups.jobCodes
                .filter(item => item.category === jobCategory)
                .map(item => ({
                  value: item.code,
                  label: `${item.code} · ${item.name}`
                }))}
              placeholder={jobCategory ? 'Search job code…' : 'Choose a job category first'}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <SearchableSelect
              label='Location'
              value={location}
              disabled={sapFieldsOff}
              onChange={event => setLocation(event.target.value)}
              options={lookups.locations.map(item => ({ value: item.code, label: item.name }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <SearchableSelect
              label='Sub component'
              value={subComponentCode}
              disabled={sapFieldsOff || !componentCode}
              onChange={event => setSubComponentCode(event.target.value)}
              options={subComponents.map(item => ({
                value: item.code,
                label: `${item.code} · ${item.name}`
              }))}
              placeholder={componentCode ? 'Search sub component…' : 'Choose a component first'}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <SearchableSelect
              label='Damage'
              value={damageCode}
              disabled={sapFieldsOff}
              onChange={event => setDamageCode(event.target.value)}
              options={lookups.damages.map(item => ({
                value: item.code,
                label: `${item.code} · ${item.name}`
              }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <SearchableSelect
              label='Failure cause'
              value={failureCauseCode}
              disabled={sapFieldsOff}
              onChange={event => setFailureCauseCode(event.target.value)}
              options={lookups.causes.map(item => ({
                value: item.code,
                label: `${item.code} · ${item.name}`
              }))}
            />
          </Grid>
          {isEdit ? (
            <Grid item xs={12} md={6}>
              <SearchableSelect
                label='Mechanic'
                value={mechanicLeaderCode}
                disabled={sapFieldsOff || !projectId}
                placeholder={projectId ? 'Search…' : 'Choose a project first'}
                onChange={event => setMechanicLeaderCode(event.target.value)}
                options={lookups.mechanics.map(item => ({
                  value: item.code,
                  label: `${item.code} · ${item.name}`
                }))}
                helperText='Active Plant mechanic at this project, stored as NIK.'
              />
            </Grid>
          ) : null}
          {isEdit ? (
            <Grid item xs={12} md={6}>
              <CustomTextField
                fullWidth
                label='Prepared by'
                value={preparedByName || '—'}
                helperText='Signed-in user. SAP stores up to 20 characters.'
                disabled
              />
            </Grid>
          ) : null}
          <Grid item xs={12} md={6}>
            <SearchableSelect
              label='Handled By'
              value={assigneeCode}
              disabled={sapFieldsOff || !projectId}
              placeholder={projectId ? 'Search…' : 'Choose a project first'}
              onChange={event => setAssigneeCode(event.target.value)}
              options={(lookups.users || []).map(item => ({
                value: item.code,
                label: item.name
              }))}
              helperText='Plant users at this project.'
            />
          </Grid>
        </>
      )
    }

    const positionLabel = POSITIONS.find(item => item.value === activity.position)?.label || activity.position

    return (
      <>
        <Grid item xs={12}>
          <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
            Breakdown
          </Typography>
        </Grid>
        <Fact label='Register no' value={registerNo} />
        <Fact label='Project' value={projectId} />
        <Fact label='Unit' value={unitLabel} />
        <Fact label='Model' value={modelLabel} />
        <Fact label='Serial number' value={serialNo} />
        <Fact label='Start' value={startedDate ? `${startedDate} ${startedTime || ''}` : ''} />
        <Fact label='Hour meter' value={hourMeter} />
        <Fact label='Component code' value={named(lookups.components, componentCode)} />
        <Fact label='Last operator' value={named(lookups.operators, operatorCode)} />
        <Fact label='Remark' value={remark} />
        <Grid item xs={12}>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            Problem
          </Typography>
          <Typography>{problem || '—'}</Typography>
        </Grid>
        {isEdit ? null : (
          <>
            <Grid item xs={12}>
              <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                Activity
              </Typography>
            </Grid>
            <Fact label='Activity' value={named(lookups.activities, activity.code)} />
            <Fact label='Position' value={positionLabel} />
            <Fact label='Mechanic' value={named(lookups.mechanics, mechanicLeaderCode)} />
            <Fact label='Prepared by' value={preparedByName} />
          </>
        )}
        <Grid item xs={12}>
          <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
            {hasSapWo ? 'Update SAP WO' : 'Create SAP WO'}
          </Typography>
        </Grid>
        <Fact label='Job category' value={named(lookups.jobCategories, jobCategory)} />
        <Fact
          label='Job code'
          value={named(
            lookups.jobCodes.filter(item => item.category === jobCategory),
            jobCode
          )}
        />
        <Fact label='Location' value={named(lookups.locations, location)} />
        {isEdit ? <Fact label='Mechanic' value={named(lookups.mechanics, mechanicLeaderCode)} /> : null}
        {isEdit ? <Fact label='Prepared by' value={preparedByName} /> : null}
        <Fact label='Handled By' value={named(lookups.users, assigneeCode)} />
        <Fact
          label='WO number'
          value={
            hasSapWo
              ? workOrder || initial?.workOrder || 'Tetap di SAP'
              : syncSapWo
                ? 'Diisi SAP saat simpan'
                : workOrder || 'Belum diisi'
          }
        />
        <Fact
          label={hasSapWo ? 'Update WO SAP' : 'Create WO SAP'}
          value={
            hasSapWo
              ? `Perbarui work order SAP${workOrder || initial?.workOrder ? ` ${workOrder || initial.workOrder}` : ''}`
              : syncSapWo
                ? 'Buat work order baru di SAP, lalu simpan di sini'
                : 'Tidak dicentang. Nomor yang diketik hanya disimpan di sini'
          }
        />
        <Fact label='Sub component' value={named(subComponents, subComponentCode)} />
        <Fact label='Damage' value={named(lookups.damages, damageCode)} />
        <Fact label='Failure cause' value={named(lookups.causes, failureCauseCode)} />
      </>
    )
  }

  const refreshButton =
    isEdit && onRefresh && initial?.sapServiceCallId ? (
      <Button
        variant='tonal'
        color='primary'
        size={embedded ? 'small' : 'medium'}
        startIcon={<Icon icon='tabler:refresh' />}
        disabled={refreshing || isClosed}
        onClick={onRefresh}
        sx={{ flexShrink: 0 }}
      >
        {refreshing ? 'Refreshing…' : 'Refresh WO'}
      </Button>
    ) : null

  return (
    <Grid container spacing={embedded ? 4 : 6}>
      {!embedded ? (
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 3 }}>
            <PageHeader
              title={
                <Typography variant='h4'>
                  {isEdit ? (initial?.workOrder ? `Edit WO ${initial.workOrder}` : 'Edit breakdown') : 'New breakdown'}
                </Typography>
              }
              subtitle={
                <Typography sx={{ color: 'text.secondary' }}>
                  {isEdit
                    ? hasSapWo
                      ? 'Project, unit, dan waktu mulai tetap. Simpan memperbarui work order SAP yang sama.'
                      : 'Project, unit, dan waktu mulai tetap. Centang Create WO SAP hanya bila WO baru dibuat di SAP.'
                    : 'Langkah Breakdown dan Activity cukup untuk disimpan. Create SAP WO diisi hanya bila work order SAP dibuat.'}
                </Typography>
              }
            />
            {refreshButton}
          </Box>
        </Grid>
      ) : refreshButton ? (
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {refreshButton}
        </Grid>
      ) : null}
      {isClosed ? (
        <Grid item xs={12}>
          <Alert severity='info'>This breakdown is already closed and cannot be edited.</Alert>
        </Grid>
      ) : null}
      <Grid item xs={12}>
        <Card
          elevation={embedded ? 0 : undefined}
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            ...(embedded
              ? { border: theme => `1px solid ${theme.palette.divider}`, boxShadow: 'none' }
              : {})
          }}
        >
          <StepperHeaderContainer sx={embedded ? { flex: { md: '0 0 14rem' } } : undefined}>
            <StepperWrapper sx={{ height: '100%' }}>
              <Stepper activeStep={activeStep} orientation='vertical' connector={<></>} sx={{ height: '100%' }}>
                {steps.map((step, index) => {
                  const RenderAvatar = activeStep >= index ? CustomAvatar : Avatar

                  return (
                    <Step key={step.key} completed={activeStep > index}>
                      <StepLabel onClick={() => goToStep(index)}>
                        <div className='step-label'>
                          <RenderAvatar
                            variant='rounded'
                            {...(activeStep >= index && { skin: 'light' })}
                            {...(activeStep === index && { skin: 'filled' })}
                            {...(activeStep >= index && { color: 'primary' })}
                            sx={{
                              ...(activeStep === index && { boxShadow: theme => theme.shadows[3] }),
                              ...(activeStep > index && { color: theme => hexToRGBA(theme.palette.primary.main, 0.4) })
                            }}
                          >
                            <Icon icon={step.icon} />
                          </RenderAvatar>
                          <div>
                            <Typography className='step-title'>{step.title}</Typography>
                            <Typography className='step-subtitle'>{step.subtitle}</Typography>
                          </div>
                        </div>
                      </StepLabel>
                    </Step>
                  )
                })}
              </Stepper>
            </StepperWrapper>
          </StepperHeaderContainer>
          <Divider sx={{ m: '0 !important' }} />
          <CardContent sx={{ width: '100%' }}>
            <Grid container spacing={5}>
              <Grid item xs={12}>
                <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {current.title}
                </Typography>
                <Typography variant='caption' component='p'>
                  Step {activeStep + 1} of {steps.length} · {current.subtitle}
                </Typography>
              </Grid>
              {stepBody(current.key)}
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button
                  variant='tonal'
                  color='secondary'
                  onClick={() => (activeStep === 0 ? onCancel() : setActiveStep(step => step - 1))}
                >
                  {activeStep === 0 ? 'Cancel' : 'Back'}
                </Button>
                <Button
                  variant='contained'
                  disabled={onLastStep && (saving || isClosed)}
                  onClick={() => (onLastStep ? handleSave() : goToStep(activeStep + 1))}
                >
                  {onLastStep
                    ? saving
                      ? 'Saving…'
                      : hasSapWo
                        ? 'Save and update WO'
                        : syncSapWo
                          ? 'Save and create WO'
                          : 'Save record'
                    : 'Next'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default BreakdownForm
