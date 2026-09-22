/**
 * Drawer tambah / edit inspection — pola AddUserDrawer / AddComponentDrawer.
 * Photos: stage on create (upload on submit), immediate upload on edit.
 */
import { useEffect, useMemo, useRef, useState } from 'react'

import Drawer from '@mui/material/Drawer'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomTextField from 'src/@core/components/mui/text-field'

import useCan from 'src/hooks/useCan'
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'
import { toIsoDateOnly } from 'src/utils/date-format'

import EntityAttachmentsSection from 'src/views/fms/EntityAttachmentsSection'
import {
  INSPECTION_TYPE_CODES,
  INSPECTION_TYPE_OPTIONS
} from 'src/views/pcr/inspections/inspectionMeta'

const RATING_OPTIONS = ['A', 'B', 'C', 'X']

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(6),
  justifyContent: 'space-between'
}))

const extractModelComponents = data => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.rows)) return data.rows

  return []
}

const formatComponentOption = item => {
  const desc = item.comp?.compDesc ?? `Component #${item.idMod}`
  const type = item.comp?.compType ?? item.lifeType

  return type ? `${desc} (${type})` : desc
}

const buildSchema = () =>
  yup.object().shape({
    type: yup
      .string()
      .oneOf(INSPECTION_TYPE_CODES, 'Inspection type is required')
      .required('Inspection type is required'),
    idMod: yup.string().required('Component is required'),
    insDate: yup.string().required('Inspection date is required'),
    insHm: yup
      .string()
      .transform(value => (value === '' ? null : value))
      .nullable(),
    rating: yup.string().oneOf(RATING_OPTIONS).required('Rating is required')
  })

const mapInspectionToForm = record => ({
  type: record.type ?? '',
  idMod: record.idMod != null ? String(record.idMod) : '',
  insDate: toIsoDateOnly(record.insDate) ?? '',
  insHm: record.insHm != null && record.insHm !== '' ? String(record.insHm) : '',
  rating: record.rating ?? 'A'
})

const buildDefaultValues = (inspectionType, latestHmUnit) => ({
  type: inspectionType ?? '',
  idMod: '',
  insDate: toIsoDateOnly(new Date()) ?? '',
  insHm: latestHmUnit != null ? String(latestHmUnit) : '',
  rating: 'A'
})

const InspectionDrawer = ({
  open,
  toggle,
  inspection,
  fleetUnitId,
  fleetModelId,
  inspectionType = null,
  latestHmUnit = null,
  onSaved
}) => {
  const { can } = useCan()
  const canUploadAttachments = can('inspections.create') || can('inspections.update')
  const canDeleteAttachments = can('inspections.update') || can('inspections.create')
  const attachmentsRef = useRef(null)

  const isEdit = Boolean(inspection?.idIns)

  const [policies, setPolicies] = useState([])
  const [saving, setSaving] = useState(false)

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: buildDefaultValues(inspectionType, latestHmUnit),
    mode: 'onChange',
    resolver: yupResolver(buildSchema())
  })

  const componentOptions = useMemo(() => {
    const sorted = [...policies].sort((a, b) =>
      (a.comp?.compDesc ?? '').localeCompare(b.comp?.compDesc ?? '', 'id')
    )

    if (isEdit && inspection?.idMod) {
      const id = String(inspection.idMod)
      if (!sorted.some(item => String(item.idMod) === id)) {
        const existing = policies.find(item => String(item.idMod) === id)
        if (existing) return [existing, ...sorted]
      }
    }

    return sorted
  }, [policies, isEdit, inspection?.idMod])

  useEffect(() => {
    if (!open) {
      attachmentsRef.current?.clearPending?.()

      return
    }
    reset(
      isEdit
        ? mapInspectionToForm(inspection)
        : {
            ...buildDefaultValues(inspectionType, latestHmUnit),
            type: inspectionType ?? ''
          }
    )
    if (!isEdit) {
      attachmentsRef.current?.clearPending?.()
    }
  }, [open, inspection, isEdit, inspectionType, latestHmUnit, reset])

  useEffect(() => {
    if (!fleetModelId || !open) {
      setPolicies([])

      return
    }

    arkaApi
      .get('/model-components', { params: { fleetModelId } })
      .then(res => setPolicies(extractModelComponents(res.data)))
      .catch(() => setPolicies([]))
  }, [fleetModelId, open])

  const handleClose = () => {
    attachmentsRef.current?.clearPending?.()
    toggle()
    reset(buildDefaultValues(inspectionType, latestHmUnit))
  }

  const onSubmit = async data => {
    const unitId = Number(fleetUnitId)
    if (!Number.isFinite(unitId) || unitId <= 0) {
      toast.error('Unit is missing — refresh the page and try again')

      return
    }

    const hmRaw = data.insHm === '' || data.insHm == null ? null : Number(data.insHm)

    const payload = {
      fleetUnitId: unitId,
      idMod: Number(data.idMod),
      type: data.type,
      insDate: data.insDate,
      insHm: hmRaw == null || !Number.isFinite(hmRaw) ? null : Math.round(hmRaw),
      rating: data.rating
    }

    setSaving(true)

    try {
      if (isEdit) {
        await arkaApi.put(`/inspections/${inspection.idIns}`, payload)
        toast.success('Inspection updated')
        onSaved?.()
        handleClose()

        return
      }

      const res = await arkaApi.post('/inspections', payload)
      const created = res.data
      const idIns = created?.idIns

      if (idIns && attachmentsRef.current?.hasPending?.()) {
        try {
          await attachmentsRef.current.flushPending(idIns)
        } catch {
          toast.success('Inspection created, but some photos failed to upload')
          onSaved?.()

          return
        }
      }

      toast.success('Inspection created')
      onSaved?.()
      handleClose()
    } catch (error) {
      await notifyApiError(error, 'Save failed', msg => toast.error(msg))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleClose}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 480 } } }}
    >
      <Header>
        <Typography variant='h5'>{isEdit ? 'Edit Inspection' : 'Add Inspection'}</Typography>
        <IconButton
          size='small'
          onClick={handleClose}
          sx={{
            p: '0.438rem',
            borderRadius: 1,
            color: 'text.primary',
            backgroundColor: 'action.selected',
            '&:hover': {
              backgroundColor: theme => `rgba(${theme.palette.customColors.main}, 0.16)`
            }
          }}
        >
          <Icon icon='tabler:x' fontSize='1.125rem' />
        </IconButton>
      </Header>
      <Box sx={{ p: theme => theme.spacing(0, 6, 6) }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name='idMod'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                sx={{ mb: 4 }}
                label='Component'
                error={Boolean(errors.idMod)}
                helperText={errors.idMod?.message}
                options={[
                  {
                    value: '',
                    label: fleetModelId ? 'Select component' : 'Unit model not available',
                    disabled: true
                  },
                  ...componentOptions.map(item => ({
                    value: String(item.idMod),
                    label: formatComponentOption(item)
                  }))
                ]}
              />
            )}
          />

          <Controller
            name='type'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                sx={{ mb: 4 }}
                label='Inspection Type'
                error={Boolean(errors.type)}
                helperText={errors.type?.message}
                options={[
                  { value: '', label: 'Select type', disabled: true },
                  ...INSPECTION_TYPE_OPTIONS.map(item => ({ value: item.code, label: item.label }))
                ]}
              />
            )}
          />

          <Controller
            name='insDate'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                type='date'
                sx={{ mb: 4 }}
                label='Inspection Date'
                InputLabelProps={{ shrink: true }}
                error={Boolean(errors.insDate)}
                helperText={errors.insDate?.message}
              />
            )}
          />

          <Controller
            name='insHm'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                type='number'
                sx={{ mb: 4 }}
                label='HM at Inspection'
                inputProps={{ step: 'any' }}
              />
            )}
          />

          <Controller
            name='rating'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                sx={{ mb: 4 }}
                label='Rating'
                error={Boolean(errors.rating)}
                helperText={errors.rating?.message}
                options={RATING_OPTIONS.map(option => ({ value: option, label: option }))}
                disableClearable
              />
            )}
          />

          <EntityAttachmentsSection
            ref={attachmentsRef}
            entityType='INSPECTION'
            entityId={isEdit ? inspection?.idIns : null}
            canUpload={canUploadAttachments}
            canDelete={canDeleteAttachments}
            allowPending={!isEdit}
            imagesOnly
            title='Inspection photos (optional)'
          />

          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Button type='submit' variant='contained' disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Submit'}
            </Button>
            <Button variant='tonal' color='secondary' onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
          </Box>
        </form>
      </Box>
    </Drawer>
  )
}

export default InspectionDrawer
