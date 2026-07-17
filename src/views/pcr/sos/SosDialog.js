/**
 * Modal besar tambah / edit SOS — tabbed form (pola CannibalDialog).
 */
import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'

import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'
import { toIsoDateOnly } from 'src/utils/date-format'

import {
  extractModelComponents,
  formatComponentOptionLabel
} from 'src/views/pcr/inspections/componentOptions'
import { SOS_EVAL_OPTIONS } from 'src/views/pcr/sos/sosEvalOptions'

const GROUPS = [
  {
    id: 'general',
    title: 'Sample & Evaluation',
    fields: [
      { name: 'sampleDate', label: 'Sample Date', type: 'date' },
      { name: 'labName', label: 'Lab Name' },
      { name: 'labNo', label: 'Lab No' },
      { name: 'oilType', label: 'Oil Type' },
      { name: 'hOil', label: 'Hour Oil', type: 'number' },
      { name: 'hUnit', label: 'Hour Unit', type: 'number' },
      { name: 'evalCode', label: 'Evaluation Code', select: SOS_EVAL_OPTIONS },
      { name: 'oilChange', label: 'Oil Change', boolean: true },
      { name: 'oilAdded', label: 'Oil Added (L)', type: 'number', requiresOilChange: true },
      { name: 'recommendation', label: 'Recommendation', multiline: true, fullWidth: true }
    ]
  },
  {
    id: 'wear',
    title: 'Wear Metals',
    fields: ['fe', 'cu', 'cr', 'si', 'al', 'ni', 'sn', 'pb', 'pq'].map(name => ({
      name,
      label: name.toUpperCase(),
      type: 'number'
    }))
  },
  {
    id: 'contaminants',
    title: 'Contaminants',
    fields: ['soot', 'oxid', 'nitr', 'sox'].map(name => ({ name, label: name, type: 'number' }))
  },
  {
    id: 'particles',
    title: 'Particles',
    fields: [
      { name: 'p4um', label: '4µm', type: 'number' },
      { name: 'p6um', label: '6µm', type: 'number' },
      { name: 'p14um', label: '14µm', type: 'number' },
      { name: 'p15um', label: '15µm', type: 'number' },
      { name: 'iso4406', label: 'ISO 4406' },
      { name: 'iso14', label: 'ISO 14' },
      { name: 'iso6', label: 'ISO 6' }
    ]
  },
  {
    id: 'additives',
    title: 'Additives',
    fields: ['ca', 'zn', 'mo', 'bo', 'p', 'na', 'k', 'mg'].map(name => ({
      name,
      label: name.toUpperCase(),
      type: 'number'
    }))
  },
  {
    id: 'physical',
    title: 'Physical',
    fields: ['visc', 'tbn', 'tan', 'gly', 'water', 'dilution'].map(name => ({
      name,
      label: name,
      type: 'number'
    }))
  }
]

const emptyForm = latestHmUnit => ({
  idMod: '',
  sampleDate: toIsoDateOnly(new Date()) ?? '',
  labName: '',
  labNo: '',
  oilType: '',
  hOil: '',
  hUnit: latestHmUnit != null ? String(latestHmUnit) : '',
  evalCode: 'A',
  recommendation: '',
  oilChange: 'false',
  oilAdded: '',
  fe: '',
  cu: '',
  cr: '',
  si: '',
  al: '',
  ni: '',
  sn: '',
  pb: '',
  pq: '',
  soot: '',
  oxid: '',
  nitr: '',
  sox: '',
  p4um: '',
  p6um: '',
  p14um: '',
  p15um: '',
  iso4406: '',
  iso14: '',
  iso6: '',
  ca: '',
  zn: '',
  mo: '',
  bo: '',
  p: '',
  na: '',
  k: '',
  mg: '',
  visc: '',
  tbn: '',
  tan: '',
  gly: '',
  water: '',
  dilution: ''
})

const mapSosToForm = (record, latestHmUnit) => {
  const next = emptyForm(latestHmUnit)

  Object.keys(next).forEach(key => {
    if (record[key] !== undefined && record[key] !== null) {
      if (key === 'oilChange') {
        next[key] = String(Boolean(record[key]))
      } else if (key === 'oilAdded') {
        next[key] = record.oilAdded != null && record.oilAdded !== '' ? String(record.oilAdded) : ''
      } else if (key === 'sampleDate') {
        next[key] = toIsoDateOnly(record.sampleDate) ?? ''
      } else {
        next[key] = String(record[key])
      }
    }
  })

  next.idMod = record.idMod != null ? String(record.idMod) : ''

  return next
}

const SosDialog = ({ open, toggle, record, fleetUnitId, fleetModelId, latestHmUnit = null, onSaved }) => {
  const isEdit = Boolean(record?.idSos)
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState(emptyForm(latestHmUnit))
  const [policies, setPolicies] = useState([])
  const [saving, setSaving] = useState(false)

  const componentOptions = useMemo(() => {
    const sorted = [...policies].sort((a, b) =>
      (a.comp?.compDesc ?? '').localeCompare(b.comp?.compDesc ?? '', 'id')
    )

    if (isEdit && record?.idMod) {
      const id = String(record.idMod)
      if (!sorted.some(item => String(item.idMod) === id)) {
        const existing = policies.find(item => String(item.idMod) === id)
        if (existing) return [existing, ...sorted]
      }
    }

    return sorted
  }, [policies, isEdit, record?.idMod])

  useEffect(() => {
    if (!open) return

    if (isEdit) {
      setForm(mapSosToForm(record, latestHmUnit))
    } else {
      setForm(emptyForm(latestHmUnit))
    }
    setTab(0)
  }, [open, record, isEdit, latestHmUnit])

  useEffect(() => {
    if (!fleetModelId || !open) {
      setPolicies([])

      return
    }

    arkaApi
      .get('/model-components', { params: { fleetModelId, pageSize: 100 } })
      .then(res => setPolicies(extractModelComponents(res.data)))
      .catch(() => setPolicies([]))
  }, [fleetModelId, open])

  const activeGroup = GROUPS[tab]

  const handleClose = () => {
    toggle()
    setForm(emptyForm(latestHmUnit))
    setTab(0)
  }

  const handleChange = field => event => {
    const value = event.target.value

    if (field === 'oilChange' && value === 'false') {
      setForm(prev => ({ ...prev, oilChange: value, oilAdded: '' }))

      return
    }

    setForm(prev => ({ ...prev, [field]: value }))
  }

  const buildPayload = () => {
    const payload = {
      fleetUnitId: Number(fleetUnitId),
      idMod: Number(form.idMod),
      sampleDate: form.sampleDate,
      labName: form.labName || null,
      labNo: form.labNo || null,
      oilType: form.oilType || null,
      evalCode: form.evalCode || null,
      recommendation: form.recommendation || null,
      oilChange: form.oilChange === 'true',
      oilAdded:
        form.oilChange === 'true' && form.oilAdded !== '' ? Number(form.oilAdded) : null,
      iso4406: form.iso4406 || null,
      iso14: form.iso14 || null,
      iso6: form.iso6 || null
    }

    const numericFields = [
      'hOil',
      'hUnit',
      'fe',
      'cu',
      'cr',
      'si',
      'al',
      'ni',
      'sn',
      'pb',
      'pq',
      'soot',
      'oxid',
      'nitr',
      'sox',
      'p4um',
      'p6um',
      'p14um',
      'p15um',
      'ca',
      'zn',
      'mo',
      'bo',
      'p',
      'na',
      'k',
      'mg',
      'visc',
      'tbn',
      'tan',
      'gly',
      'water',
      'dilution'
    ]

    numericFields.forEach(field => {
      payload[field] = form[field] === '' ? null : Number(form[field])
    })

    return payload
  }

  const handleSubmit = async () => {
    if (!form.idMod) {
      toast.error('Component is required')

      return
    }

    setSaving(true)
    try {
      const payload = buildPayload()

      if (isEdit) {
        await arkaApi.put(`/sos/${record.idSos}`, payload)
        toast.success('SOS updated')
      } else {
        await arkaApi.post('/sos', payload)
        toast.success('SOS created')
      }

      onSaved?.()
      handleClose()
    } catch (error) {
      await notifyApiError(error, 'Save failed', msg => toast.error(msg))
    } finally {
      setSaving(false)
    }
  }

  const renderField = field => {
    if (field.boolean) {
      return (
        <CustomTextField select fullWidth label={field.label} value={form[field.name]} onChange={handleChange(field.name)}>
          <MenuItem value='false'>No</MenuItem>
          <MenuItem value='true'>Yes</MenuItem>
        </CustomTextField>
      )
    }

    if (field.select) {
      return (
        <CustomTextField select fullWidth label={field.label} value={form[field.name]} onChange={handleChange(field.name)}>
          {field.select.map(option => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </CustomTextField>
      )
    }

    return (
      <CustomTextField
        fullWidth
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        label={field.label}
        value={form[field.name]}
        onChange={handleChange(field.name)}
        multiline={field.multiline}
        minRows={field.multiline ? 4 : undefined}
        placeholder={field.name === 'oilAdded' ? 'Liters' : undefined}
        InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
        inputProps={
          field.type === 'number'
            ? { step: field.name === 'oilAdded' ? 0.1 : 0.001, min: field.name === 'oilAdded' ? 0 : undefined }
            : undefined
        }
      />
    )
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth='lg' scroll='paper'>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
        <Typography variant='h5' component='span'>
          {isEdit ? 'Edit SOS' : 'Add SOS'}
        </Typography>
        <IconButton
          size='small'
          onClick={handleClose}
          disabled={saving}
          sx={{
            color: 'text.primary',
            backgroundColor: 'action.selected',
            '&:hover': {
              backgroundColor: theme => `rgba(${theme.palette.customColors.main}, 0.16)`
            }
          }}
        >
          <Icon icon='tabler:x' fontSize='1.125rem' />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: theme => `${theme.spacing(4)} !important` }}>
        <CustomTextField
          select
          fullWidth
          sx={{ mb: 4 }}
          label='Component'
          value={form.idMod}
          onChange={handleChange('idMod')}
          SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value='' disabled>
            {fleetModelId ? 'Select component' : 'Unit model not available'}
          </MenuItem>
          {componentOptions.map(item => (
            <MenuItem key={item.idMod} value={String(item.idMod)}>
              {formatComponentOptionLabel(item)}
            </MenuItem>
          ))}
        </CustomTextField>

        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant='scrollable'
          scrollButtons='auto'
          sx={{ mb: 4 }}
        >
          {GROUPS.map(group => (
            <Tab key={group.id} label={group.title} />
          ))}
        </Tabs>

        <Grid container spacing={4}>
          {activeGroup.fields
            .filter(field => !field.requiresOilChange || form.oilChange === 'true')
            .map(field => (
            <Grid item xs={12} sm={field.fullWidth ? 12 : 6} md={field.fullWidth ? 12 : 4} key={field.name}>
              {renderField(field)}
            </Grid>
          ))}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 6, py: 4 }}>
        <Button variant='tonal' color='secondary' onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={saving || !form.idMod}>
          {isEdit ? 'Update' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SosDialog
