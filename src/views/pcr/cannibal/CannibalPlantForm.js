/**
 * Cannibal plant form — create/edit fields (document, failure, plant, requestor, status, transfer).
 */
import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import { cannibalPlantCreateSchema } from '@/lib/validations/cannibal'
import arkaApi from 'src/utils/arka-api'
import { getFieldError, validateFormFields } from 'src/utils/api-error-message'
import {
  flagsFromPlantStatement,
  isComponentStatusOther,
  plantStatementFromFlags,
  PLANT_STATEMENT_OPTIONS,
  statusesForNewForm
} from 'src/utils/cannibal-form-lookups'
import { CANNIBAL_REQUEST_ROLE_OPTIONS, formatRequestorUser } from 'src/utils/cannibal-requestor'
import { unwrapListPayload } from 'src/utils/unwrap-list-payload'
import { buildTransferPayload, emptyTransfer, equipmentsForProject, getSingleTransfer } from 'src/utils/cannibal-transfer-form'

import CustomTextField from 'src/@core/components/mui/text-field'
import CannibalSectionCard from 'src/views/pcr/cannibal/CannibalSectionCard'
import CannibalStatementFields from 'src/views/pcr/cannibal/CannibalStatementFields'
import CannibalTransferForm from 'src/views/pcr/cannibal/CannibalTransferForm'

const emptyForm = () => ({
  projectCode: '',
  postingDate: new Date().toISOString().slice(0, 10),
  symptom: '',
  failure: '',
  idCaused: '',
  causedOther: '',
  idStatus: '',
  statusOther: '',
  plantStatement: '',
  plantOtherText: '',
  cannibalRequestRole: '',
  requestedBy: '',
  transfer: emptyTransfer()
})

const isProjectInList = (projects, code) =>
  Boolean(code) && projects.some(project => project.project_code === code)

const resolveProjectCode = (projects, preferred) => {
  if (!projects.length) return ''
  if (preferred && isProjectInList(projects, preferred)) return preferred

  return projects[0]?.project_code ?? ''
}

const CannibalPlantForm = ({
  active = true,
  onSave,
  onCancel,
  initialData,
  defaultProjectCode,
  submitLabel = 'Save',
  cancelLabel = 'Cancel'
}) => {
  const [form, setForm] = useState(emptyForm)
  const [lookups, setLookups] = useState({ caused: [], actions: [], statuses: [] })
  const [projects, setProjects] = useState([])
  const [equipments, setEquipments] = useState([])
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [requestors, setRequestors] = useState([])

  const formStatuses = useMemo(
    () => statusesForNewForm(lookups.statuses, form.idStatus),
    [lookups.statuses, form.idStatus]
  )

  const requestorOptions = useMemo(() => {
    const rows = [...requestors]
    const selectedId = Number(form.requestedBy)
    if (selectedId && !rows.some(item => item.idUser === selectedId) && initialData?.requestor) {
      rows.unshift({
        idUser: initialData.requestor.idUser ?? selectedId,
        username: initialData.requestor.username,
        fullName: initialData.requestor.fullName
      })
    }

    return rows
  }, [requestors, form.requestedBy, initialData])

  const pairLines = initialData?.pairs?.[0]

  const projectEquipments = useMemo(
    () => equipmentsForProject(equipments, form.projectCode, form.transfer, pairLines),
    [equipments, form.projectCode, form.transfer, pairLines]
  )

  const selectedStatus = useMemo(
    () => formStatuses.find(item => item.idStatus === Number(form.idStatus)),
    [formStatuses, form.idStatus]
  )

  const statusIsOther = isComponentStatusOther(selectedStatus)

  const projectSelectOptions = useMemo(() => {
    const options = [...projects]

    if (form.projectCode && !isProjectInList(options, form.projectCode)) {
      options.unshift({ project_code: form.projectCode, bowheer: '' })
    }

    return options
  }, [projects, form.projectCode])

  const projectSelectValue = useMemo(() => {
    if (!form.projectCode) return ''

    return isProjectInList(projectSelectOptions, form.projectCode) ? form.projectCode : ''
  }, [form.projectCode, projectSelectOptions])

  useEffect(() => {
    if (!active) return

    Promise.all([arkaApi.get('/ba-lookups'), arkaApi.get('/fleet/projects')])
      .then(([lookupRes, projectRes]) => {
        setLookups(lookupRes.data ?? {})
        setProjects(unwrapListPayload(projectRes.data))
      })
      .catch(() => {
        setLookups({ caused: [], actions: [], statuses: [] })
        setProjects([])
      })
  }, [active])

  useEffect(() => {
    if (!active || !form.projectCode) {
      setEquipments([])

      return
    }

    arkaApi
      .get('/fleet/units', { params: { projectCode: form.projectCode, pageSize: 500 } })
      .then(res => setEquipments(unwrapListPayload(res.data)))
      .catch(() => setEquipments([]))
  }, [active, form.projectCode])

  useEffect(() => {
    if (!active || !form.cannibalRequestRole || !form.projectCode) {
      setRequestors([])

      return
    }

    arkaApi
      .get('/cannibals/requestors', {
        params: { role: form.cannibalRequestRole, projectCode: form.projectCode }
      })
      .then(res => setRequestors(res.data?.rows ?? []))
      .catch(() => setRequestors([]))
  }, [active, form.cannibalRequestRole, form.projectCode])

  useEffect(() => {
    if (!active) return

    setFieldErrors({})

    if (initialData) {
      setForm({
        projectCode: initialData.projectCode,
        postingDate: initialData.postingDate ? String(initialData.postingDate).slice(0, 10) : '',
        symptom: initialData.symptom ?? '',
        failure: initialData.failure ?? '',
        idCaused: initialData.idCaused ?? '',
        causedOther: initialData.causedOther ?? '',
        idStatus: initialData.idStatus ?? '',
        statusOther: initialData.statusOther ?? '',
        plantStatement: plantStatementFromFlags(initialData),
        plantOtherText: initialData.plantOtherText ?? '',
        cannibalRequestRole: initialData.cannibalRequestRole ?? '',
        requestedBy: initialData.requestedBy ?? '',
        transfer: getSingleTransfer(initialData)
      })
    } else {
      setForm(emptyForm())
    }
  }, [active, initialData])

  useEffect(() => {
    if (!active || initialData || projects.length === 0) return

    setForm(prev => {
      if (isProjectInList(projects, prev.projectCode)) return prev

      const nextCode = resolveProjectCode(projects, defaultProjectCode)
      if (!nextCode || nextCode === prev.projectCode) return prev

      return { ...prev, projectCode: nextCode }
    })
  }, [active, initialData, projects, defaultProjectCode])

  const clearFieldError = (...paths) => {
    setFieldErrors(prev => {
      const next = { ...prev }
      let changed = false

      for (const path of paths) {
        const key = Array.isArray(path) ? path.join('.') : path
        if (next[key]) {
          delete next[key]
          changed = true
        }
      }

      return changed ? next : prev
    })
  }

  const handleHeaderChange = event => {
    const { name, value } = event.target
    clearFieldError(name)
    setForm(prev => {
      if (name !== 'projectCode' || value === prev.projectCode) {
        if (name === 'cannibalRequestRole' && value !== prev.cannibalRequestRole) {
          return { ...prev, cannibalRequestRole: value, requestedBy: '' }
        }

        return { ...prev, [name]: value }
      }

      return {
        ...prev,
        projectCode: value,
        requestedBy: '',
        transfer: {
          remove: { ...prev.transfer.remove, fleetUnitId: '' },
          install: { ...prev.transfer.install, fleetUnitId: '' }
        }
      }
    })
  }

  const handleStatusChange = event => {
    const idStatus = event.target.value
    clearFieldError('idStatus', 'statusOther')
    const statusItem = formStatuses.find(item => String(item.idStatus) === idStatus)
    const isOther = isComponentStatusOther(statusItem)

    setForm(prev => ({
      ...prev,
      idStatus,
      statusOther: isOther ? prev.statusOther : ''
    }))
  }

  const handlePlantStatementChange = value => {
    clearFieldError('plantP1UnitRfu', 'plantOtherText')
    setForm(prev => ({
      ...prev,
      plantStatement: value,
      plantOtherText: value === 'other' ? prev.plantOtherText : ''
    }))
  }

  const handleTransferChange = transfer => {
    setFieldErrors(prev => {
      const next = { ...prev }
      let changed = false

      Object.keys(next).forEach(key => {
        if (key.startsWith('pairs.0.')) {
          delete next[key]
          changed = true
        }
      })

      return changed ? next : prev
    })
    setForm(prev => ({ ...prev, transfer }))
  }

  const buildPayload = () => {
    const plantFlags = flagsFromPlantStatement(form.plantStatement, form.plantOtherText)
    const built = buildTransferPayload(form.transfer)

    return {
      projectCode: form.projectCode,
      postingDate: form.postingDate,
      symptom: '',
      failure: form.failure,
      idCaused: form.idCaused ? Number(form.idCaused) : null,
      causedOther: form.causedOther,
      idStatus: Number(form.idStatus),
      statusOther: statusIsOther ? form.statusOther : '',
      cannibalRequestRole: form.cannibalRequestRole,
      requestedBy: form.requestedBy ? Number(form.requestedBy) : '',
      ...plantFlags,
      pairs: [built]
    }
  }

  const handleSubmit = async () => {
    const payload = buildPayload()
    const result = validateFormFields(cannibalPlantCreateSchema, payload)
    const nextFieldErrors = result.success ? {} : { ...result.fieldErrors }

    if (statusIsOther && !form.statusOther.trim()) {
      nextFieldErrors.statusOther = 'Component status Other description is required'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      const firstMessage =
        nextFieldErrors.statusOther ||
        result.message ||
        Object.values(nextFieldErrors)[0] ||
        'Validation failed'
      toast.error(firstMessage)

      return
    }

    setFieldErrors({})
    setSaving(true)
    try {
      await onSave(result.data)
    } finally {
      setSaving(false)
    }
  }

  const projectCodeError = getFieldError(fieldErrors, 'projectCode')
  const postingDateError = getFieldError(fieldErrors, 'postingDate')
  const failureError = getFieldError(fieldErrors, 'failure')
  const idStatusError = getFieldError(fieldErrors, 'idStatus')
  const statusOtherError = getFieldError(fieldErrors, 'statusOther')
  const plantStatementError = getFieldError(fieldErrors, 'plantP1UnitRfu')
  const plantOtherError = getFieldError(fieldErrors, 'plantOtherText')
  const requestRoleError = getFieldError(fieldErrors, 'cannibalRequestRole')
  const requestedByError = getFieldError(fieldErrors, 'requestedBy')

  return (
    <Box>
      <CannibalSectionCard title='Document Information' icon='tabler:file-description' iconColor='info'>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              select
              fullWidth
              size='small'
              label='Project Code'
              name='projectCode'
              value={projectSelectValue}
              onChange={handleHeaderChange}
              error={Boolean(projectCodeError)}
              helperText={projectCodeError || undefined}
              SelectProps={{
                displayEmpty: true,
                renderValue: selected => {
                  if (!selected) return 'Select project'
                  const project = projectSelectOptions.find(item => item.project_code === selected)

                  return project ? `${project.project_code}${project.bowheer ? ` — ${project.bowheer}` : ''}` : selected
                }
              }}
            >
              <MenuItem value=''>Select project</MenuItem>
              {projectSelectOptions.map(project => (
                <MenuItem key={project.project_code} value={project.project_code}>
                  {project.project_code}
                  {project.bowheer ? ` — ${project.bowheer}` : ''}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <CustomTextField
              fullWidth
              size='small'
              type='date'
              label='Posting Date'
              name='postingDate'
              value={form.postingDate}
              onChange={handleHeaderChange}
              InputLabelProps={{ shrink: true }}
              error={Boolean(postingDateError)}
              helperText={postingDateError || undefined}
            />
          </Grid>
        </Grid>
      </CannibalSectionCard>

      <CannibalSectionCard title='Failure Description' icon='tabler:alert-triangle' iconColor='warning'>
        <CustomTextField
          fullWidth
          multiline
          minRows={3}
          maxRows={3}
          size='small'
          label='Failure Description'
          name='failure'
          value={form.failure}
          onChange={handleHeaderChange}
          error={Boolean(failureError)}
          helperText={failureError || undefined}
        />
      </CannibalSectionCard>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <CannibalSectionCard
            title='Plant Statement'
            subtitle='Select one justification'
            icon='tabler:building-factory-2'
            fullHeight
            sx={{ mb: 0 }}
          >
            <CannibalStatementFields
              options={PLANT_STATEMENT_OPTIONS}
              value={form.plantStatement}
              onChange={handlePlantStatementChange}
              otherLabel='Other (Plant)'
              otherValue={form.plantOtherText}
              onOtherChange={value => {
                clearFieldError('plantOtherText')
                setForm(prev => ({ ...prev, plantOtherText: value }))
              }}
              statementError={plantStatementError}
              otherError={plantOtherError}
            />
          </CannibalSectionCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <CannibalSectionCard
            title='Cannibal Request By'
            subtitle='Select role then the requestor who must confirm'
            icon='tabler:user-check'
            iconColor='primary'
            fullHeight
            sx={{ mb: 0 }}
          >
            <RadioGroup name='cannibalRequestRole' value={form.cannibalRequestRole} onChange={handleHeaderChange}>
              {CANNIBAL_REQUEST_ROLE_OPTIONS.map(option => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio size='small' />}
                  label={option.label}
                />
              ))}
            </RadioGroup>
            {requestRoleError ? (
              <Typography variant='caption' color='error' sx={{ display: 'block', mt: 0.5 }}>
                {requestRoleError}
              </Typography>
            ) : null}
            <CustomTextField
              select
              fullWidth
              size='small'
              sx={{ mt: 2 }}
              label='Requestor'
              name='requestedBy'
              value={form.requestedBy}
              onChange={handleHeaderChange}
              disabled={!form.cannibalRequestRole || !form.projectCode}
              error={Boolean(requestedByError)}
              helperText={requestedByError || (!form.cannibalRequestRole ? 'Select role first' : undefined)}
              SelectProps={{
                displayEmpty: true,
                renderValue: selected => {
                  if (!selected) return 'Select requestor'
                  const user = requestorOptions.find(item => String(item.idUser) === String(selected))

                  return user ? formatRequestorUser(user) : selected
                }
              }}
            >
              <MenuItem value=''>Select requestor</MenuItem>
              {requestorOptions.map(user => (
                <MenuItem key={user.idUser} value={user.idUser}>
                  {formatRequestorUser(user)}
                  {user.username ? ` (${user.username})` : ''}
                </MenuItem>
              ))}
            </CustomTextField>
          </CannibalSectionCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <CannibalSectionCard
            title='Cannibalized Component Status'
            icon='tabler:puzzle'
            iconColor='secondary'
            fullHeight
            sx={{ mb: 0 }}
          >
            <RadioGroup value={String(form.idStatus)} onChange={handleStatusChange}>
              {formStatuses.map(item => (
                <FormControlLabel
                  key={item.idStatus}
                  value={String(item.idStatus)}
                  control={<Radio size='small' />}
                  label={item.status}
                />
              ))}
            </RadioGroup>
            {idStatusError ? (
              <Typography variant='caption' color='error' sx={{ display: 'block', mt: 0.5 }}>
                {idStatusError}
              </Typography>
            ) : null}
            <CustomTextField
              fullWidth
              size='small'
              sx={{ mt: 2 }}
              label='Other (Component Status)'
              name='statusOther'
              value={statusIsOther ? form.statusOther : ''}
              onChange={handleHeaderChange}
              InputProps={{ readOnly: !statusIsOther }}
              placeholder={statusIsOther ? 'Specify other reason' : 'Select Other to enable'}
              error={Boolean(statusOtherError)}
              helperText={statusOtherError || undefined}
            />
          </CannibalSectionCard>
        </Grid>
      </Grid>

      <CannibalSectionCard
        title='Component Transfer'
        subtitle='REMOVE / INSTALL details per unit'
        icon='tabler:arrows-left-right'
        iconColor='primary'
        sx={{ mb: 0 }}
      >
        <CannibalTransferForm
          transfer={form.transfer}
          equipments={projectEquipments}
          projectCode={form.projectCode}
          onTransferChange={handleTransferChange}
          fieldErrors={fieldErrors}
        />
      </CannibalSectionCard>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
        <Button variant='tonal' color='secondary' onClick={onCancel} disabled={saving}>
          {cancelLabel}
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </Box>
    </Box>
  )
}

export default CannibalPlantForm
