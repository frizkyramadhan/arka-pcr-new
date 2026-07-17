/**
 * Drawer tambah / edit inspection — pola AddUserDrawer / AddComponentDrawer.
 */
import { useEffect, useMemo, useState } from 'react'

import Drawer from '@mui/material/Drawer'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'

import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'

import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'
import { toIsoDateOnly } from 'src/utils/date-format'

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
  const isEdit = Boolean(inspection?.idIns)

  const [policies, setPolicies] = useState([])

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
    if (!open) return
    reset(
      isEdit
        ? mapInspectionToForm(inspection)
        : {
            ...buildDefaultValues(inspectionType, latestHmUnit),
            type: inspectionType ?? ''
          }
    )
  }, [open, inspection, isEdit, inspectionType, latestHmUnit, reset])

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

  const handleClose = () => {
    toggle()
    reset(buildDefaultValues(inspectionType, latestHmUnit))
  }

  const onSubmit = async data => {
    const payload = {
      fleetUnitId: Number(fleetUnitId),
      idMod: Number(data.idMod),
      type: data.type,
      insDate: data.insDate,
      insHm: data.insHm === '' || data.insHm == null ? null : Number(data.insHm),
      rating: data.rating
    }

    try {
      if (isEdit) {
        await arkaApi.put(`/inspections/${inspection.idIns}`, payload)
        toast.success('Inspection updated')
      } else {
        await arkaApi.post('/inspections', payload)
        toast.success('Inspection created')
      }
      onSaved?.()
      handleClose()
    } catch (error) {
      await notifyApiError(error, 'Save failed', msg => toast.error(msg))
    }
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleClose}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 420 } } }}
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
              <CustomTextField
                select
                fullWidth
                sx={{ mb: 4 }}
                label='Component'
                value={field.value}
                onChange={field.onChange}
                error={Boolean(errors.idMod)}
                helperText={errors.idMod?.message}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value='' disabled>
                  {fleetModelId ? 'Select component' : 'Unit model not available'}
                </MenuItem>
                {componentOptions.map(item => (
                  <MenuItem key={item.idMod} value={String(item.idMod)}>
                    {formatComponentOption(item)}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />

          <Controller
            name='type'
            control={control}
            render={({ field }) => (
              <CustomTextField
                select
                fullWidth
                sx={{ mb: 4 }}
                label='Inspection Type'
                value={field.value}
                onChange={field.onChange}
                error={Boolean(errors.type)}
                helperText={errors.type?.message}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value='' disabled>
                  Select type
                </MenuItem>
                {INSPECTION_TYPE_OPTIONS.map(item => (
                  <MenuItem key={item.code} value={item.code}>
                    {item.label}
                  </MenuItem>
                ))}
              </CustomTextField>
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
                inputProps={{ min: 0, step: 0.01 }}
              />
            )}
          />

          <Controller
            name='rating'
            control={control}
            render={({ field }) => (
              <CustomTextField
                select
                fullWidth
                sx={{ mb: 6 }}
                label='Rating'
                value={field.value}
                onChange={field.onChange}
                error={Boolean(errors.rating)}
                helperText={errors.rating?.message}
              >
                {RATING_OPTIONS.map(option => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button type='submit' variant='contained' sx={{ mr: 3 }}>
              {isEdit ? 'Update' : 'Submit'}
            </Button>
            <Button variant='tonal' color='secondary' onClick={handleClose}>
              Cancel
            </Button>
          </Box>
        </form>
      </Box>
    </Drawer>
  )
}

export default InspectionDrawer
