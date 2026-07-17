/**
 * CannibalDialog — create/edit plant section (English labels, no planning on create).
 */
import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
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
  sortComponentStatuses
} from 'src/utils/cannibal-form-lookups'
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
  transfer: emptyTransfer()
})

const isProjectInList = (projects, code) =>
  Boolean(code) && projects.some(project => project.project_code === code)

const resolveProjectCode = (projects, preferred) => {
  if (!projects.length) return ''
  if (preferred && isProjectInList(projects, preferred)) return preferred

  return projects[0]?.project_code ?? ''
}

const CannibalDialog = ({ open, onClose, onSave, initialData, defaultProjectCode }) => {
  const [form, setForm] = useState(emptyForm)
  const [lookups, setLookups] = useState({ caused: [], actions: [], statuses: [] })
  const [projects, setProjects] = useState([])
  const [equipments, setEquipments] = useState([])
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const sortedStatuses = useMemo(() => sortComponentStatuses(lookups.statuses), [lookups.statuses])

  const pairLines = initialData?.pairs?.[0]

  const projectEquipments = useMemo(
    () => equipmentsForProject(equipments, form.projectCode, form.transfer, pairLines),
    [equipments, form.projectCode, form.transfer, pairLines]
  )

  const selectedStatus = useMemo(
    () => sortedStatuses.find(item => item.idStatus === Number(form.idStatus)),
    [sortedStatuses, form.idStatus]
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
    if (!open) return

    Promise.all([arkaApi.get('/ba-lookups'), arkaApi.get('/fleet/projects')])
      .then(([lookupRes, projectRes]) => {
        setLookups(lookupRes.data ?? {})
        setProjects(unwrapListPayload(projectRes.data))
      })
      .catch(() => {
        setLookups({ caused: [], actions: [], statuses: [] })
        setProjects([])
      })
  }, [open])

  useEffect(() => {
    if (!open || !form.projectCode) {
      setEquipments([])

      return
    }

    arkaApi
      .get('/fleet/units', { params: { projectCode: form.projectCode, pageSize: 500 } })
      .then(res => setEquipments(unwrapListPayload(res.data)))
      .catch(() => setEquipments([]))
  }, [open, form.projectCode])

  useEffect(() => {
    if (!open) return

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
        transfer: getSingleTransfer(initialData)
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, initialData])

  useEffect(() => {
    if (!open || initialData || projects.length === 0) return

    setForm(prev => {
      if (isProjectInList(projects, prev.projectCode)) return prev

      const nextCode = resolveProjectCode(projects, defaultProjectCode)
      if (!nextCode || nextCode === prev.projectCode) return prev

      return { ...prev, projectCode: nextCode }
    })
  }, [open, initialData, projects, defaultProjectCode])

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
        return { ...prev, [name]: value }
      }

      return {
        ...prev,
        projectCode: value,
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
    const statusItem = sortedStatuses.find(item => String(item.idStatus) === idStatus)
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
    const symptom = form.symptom?.trim() || form.failure.trim()

    return {
      projectCode: form.projectCode,
      postingDate: form.postingDate,
      symptom,
      failure: form.failure,
      idCaused: Number(form.idCaused),
      causedOther: form.causedOther,
      idStatus: Number(form.idStatus),
      statusOther: statusIsOther ? form.statusOther : '',
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
  const idCausedError = getFieldError(fieldErrors, 'idCaused')
  const failureError = getFieldError(fieldErrors, 'failure')
  const idStatusError = getFieldError(fieldErrors, 'idStatus')
  const statusOtherError = getFieldError(fieldErrors, 'statusOther')
  const plantStatementError = getFieldError(fieldErrors, 'plantP1UnitRfu')
  const plantOtherError = getFieldError(fieldErrors, 'plantOtherText')

  return (
    <Dialog open={open} onClose={onClose} maxWidth='lg' fullWidth scroll='paper'>
      <DialogTitle sx={{ pb: 2 }}>
        {initialData ? 'Edit Plant Section' : 'Create Cannibal BA'}
        <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
          One BA per component — REMOVE from source unit and INSTALL to target unit.
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <Box sx={{ py: 1 }}>
          <CannibalSectionCard title='Document Information' icon='tabler:file-description' iconColor='info'>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
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
              <Grid item xs={12} sm={4}>
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
              <Grid item xs={12} sm={4}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Failure Cause'
                  name='idCaused'
                  value={form.idCaused}
                  onChange={handleHeaderChange}
                  error={Boolean(idCausedError)}
                  helperText={idCausedError || undefined}
                >
                  {lookups.caused?.map(item => (
                    <MenuItem key={item.idCaused} value={item.idCaused}>
                      {item.caused}
                    </MenuItem>
                  ))}
                </CustomTextField>
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
            <Grid item xs={12} md={6}>
              <CannibalSectionCard
                title='Plant Statement'
                subtitle='Select one justification'
                icon='tabler:building-factory-2'
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
            <Grid item xs={12} md={6}>
              <CannibalSectionCard title='Cannibalized Component Status' icon='tabler:puzzle' iconColor='secondary' sx={{ mb: 0 }}>
                <RadioGroup value={String(form.idStatus)} onChange={handleStatusChange}>
                  {sortedStatuses.map(item => (
                    <FormControlLabel
                      key={item.idStatus}
                      value={String(item.idStatus)}
                      control={<Radio size='small' />}
                      label={item.status}
                      sx={{ mb: 0.25 }}
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
                  sx={{ mt: 1.5 }}
                  label='Other (Component Status)'
                  name='statusOther'
                  value={statusIsOther ? form.statusOther : ''}
                  onChange={handleHeaderChange}
                  disabled={!statusIsOther}
                  placeholder={statusIsOther ? 'Specify other status' : 'Select Other to enable'}
                  error={Boolean(statusOtherError)}
                  helperText={statusIsOther ? statusOtherError || undefined : undefined}
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
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 6, py: 3 }}>
        <Button variant='tonal' color='secondary' onClick={onClose}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CannibalDialog
