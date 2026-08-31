/**
 * Drawer tambah / edit hour meter — equipment select + HM fields.
 */
import { useEffect } from 'react'

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
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(6),
  justifyContent: 'space-between'
}))

const defaultValues = {
  fleetUnitId: '',
  hmUnit: '',
  whDay: '8',
  dateHm: ''
}

const schema = yup.object().shape({
  fleetUnitId: yup.string().trim().required('Equipment is required'),
  hmUnit: yup
    .number()
    .typeError('HM Unit must be a number')
    .min(0, 'HM Unit must be 0 or greater')
    .required('HM Unit is required'),
  whDay: yup
    .number()
    .typeError('WH/Day must be a number')
    .integer('WH/Day must be a whole number')
    .min(0)
    .max(24)
    .required('WH/Day is required'),
  dateHm: yup.string().trim().required('Date is required')
})

const mapHourMeterToForm = hourMeter => ({
  fleetUnitId: String(hourMeter.fleetUnitId ?? ''),
  hmUnit: hourMeter.hmUnit ?? '',
  whDay: String(hourMeter.whDay ?? '8'),
  dateHm: hourMeter.dateHm ? String(hourMeter.dateHm).slice(0, 10) : ''
})

const AddHourMeterDrawer = props => {
  const { open, toggle, hourMeter, equipments, onSaved } = props
  const isEdit = Boolean(hourMeter?.idHm)

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues,
    mode: 'onChange',
    resolver: yupResolver(schema)
  })

  useEffect(() => {
    if (!open) return
    reset(isEdit ? mapHourMeterToForm(hourMeter) : defaultValues)
  }, [open, hourMeter, isEdit, reset])

  const handleClose = () => {
    toggle()
    reset(defaultValues)
  }

  const onSubmit = async data => {
    const payload = {
      fleetUnitId: Number(data.fleetUnitId),
      hmUnit: Number(data.hmUnit),
      whDay: Number(data.whDay),
      dateHm: data.dateHm
    }

    try {
      if (isEdit) {
        await arkaApi.put(`/hour-meters/${hourMeter.idHm}`, payload)
        toast.success('Hour meter updated')
      } else {
        await arkaApi.post('/hour-meters', payload)
        toast.success('Hour meter created')
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
        <Typography variant='h5'>{isEdit ? 'Edit Hour Meter' : 'Add Hour Meter'}</Typography>
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
            name='fleetUnitId'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                sx={{ mb: 4 }}
                label='Equipment'
                error={Boolean(errors.fleetUnitId)}
                helperText={errors.fleetUnitId?.message}
                options={equipments.map(item => ({
                  value: String(item.id),
                  label: `${item.unit_no} — ${item.description}`
                }))}
              />
            )}
          />
          <Controller
            name='hmUnit'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                type='number'
                sx={{ mb: 4 }}
                label='HM Unit'
                inputProps={{ min: 0, step: 0.01 }}
                error={Boolean(errors.hmUnit)}
                helperText={errors.hmUnit?.message}
              />
            )}
          />
          <Controller
            name='whDay'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                type='number'
                sx={{ mb: 4 }}
                label='WH / Day'
                inputProps={{ min: 0, max: 24 }}
                error={Boolean(errors.whDay)}
                helperText={errors.whDay?.message}
              />
            )}
          />
          <Controller
            name='dateHm'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                type='date'
                sx={{ mb: 6 }}
                label='Date HM'
                InputLabelProps={{ shrink: true }}
                error={Boolean(errors.dateHm)}
                helperText={errors.dateHm?.message}
              />
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

export default AddHourMeterDrawer
