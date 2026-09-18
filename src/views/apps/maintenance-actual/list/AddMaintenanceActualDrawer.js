/**
 * Drawer tambah Maintenance Actual.
 * Form: Plan (select), Unit (select), Date, Time (optional), Hour Meter, Remarks (optional), Mechanics (optional).
 * Date & Time pakai Vuexy react-datepicker. createdById dari user login (hidden).
 */
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import Drawer from '@mui/material/Drawer'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import { styled } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import DatePicker from 'react-datepicker'

import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import DatePickerWrapper from 'src/@core/styles/libs/react-datepicker'
import PickersCustomInput from 'src/views/forms/form-elements/pickers/PickersCustomInput'
import { useDispatch } from 'react-redux'
import { addMaintenanceActual } from 'src/store/apps/maintenanceActual'
import { useAuth } from 'src/hooks/useAuth'

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(6),
  justifyContent: 'space-between'
}))

const MONTH_NAMES = [
  '',
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const schema = yup.object().shape({
  maintenancePlanId: yup.string().required('Plan is required'),
  unitId: yup.string().required('Unit is required'),
  maintenanceDate: yup.string().required('Date is required'),
  maintenanceTime: yup.string(),
  hourMeter: yup.number().min(0).required('Hour meter is required'),
  remarks: yup.string(),
  mechanics: yup.string()
})

const defaultValues = {
  maintenancePlanId: '',
  unitId: '',
  maintenanceDate: new Date().toISOString().slice(0, 10),
  maintenanceTime: '',
  hourMeter: 0,
  remarks: '',
  mechanics: ''
}

const AddMaintenanceActualDrawer = props => {
  const { open, toggle, plans = [], units = [] } = props
  const theme = useTheme()
  const popperPlacement = theme.direction === 'ltr' ? 'bottom-start' : 'bottom-end'
  const dispatch = useDispatch()
  const { user } = useAuth()

  const {
    reset,
    control,
    setError,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues,
    mode: 'onChange',
    resolver: yupResolver(schema)
  })

  const onSubmit = async data => {
    if (!user?.id) {
      setError('maintenancePlanId', { message: 'User not logged in' })
      
return
    }
    try {
      await dispatch(
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
      toggle()
      reset(defaultValues)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to add actual'
      setError('maintenancePlanId', { message: msg })
    }
  }

  const handleClose = () => {
    reset(defaultValues)
    toggle()
  }

  return (
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleClose}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 320, sm: 420 } } }}
    >
      <Header>
        <Typography variant='h5'>Add Maintenance Actual</Typography>
        <IconButton
          size='small'
          onClick={handleClose}
          sx={{
            p: '0.438rem',
            borderRadius: 1,
            color: 'text.primary',
            backgroundColor: 'action.selected',
            '&:hover': { backgroundColor: theme => `rgba(${theme.palette.customColors.main}, 0.16)` }
          }}
        >
          <Icon icon='tabler:x' fontSize='1.125rem' />
        </IconButton>
      </Header>
      <Box sx={{ p: theme => theme.spacing(0, 6, 6) }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name='maintenancePlanId'
            control={control}
            render={({ field: { value, onChange } }) => (
              <CustomTextField
                fullWidth
                select
                label='Maintenance Plan'
                value={value}
                sx={{ mb: 4 }}
                onChange={onChange}
                error={Boolean(errors.maintenancePlanId)}
                {...(errors.maintenancePlanId && { helperText: errors.maintenancePlanId.message })}
              >
                <MenuItem value=''>
                  <em>Select plan</em>
                </MenuItem>
                {(plans || []).map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.projectId} | {p.year} {MONTH_NAMES[p.month]} | {p.maintenanceTypeName || p.maintenanceType?.name || ''}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='unitId'
            control={control}
            render={({ field: { value, onChange } }) => (
              <CustomTextField
                fullWidth
                select
                label='Unit'
                value={value}
                sx={{ mb: 4 }}
                onChange={onChange}
                error={Boolean(errors.unitId)}
                {...(errors.unitId && { helperText: errors.unitId.message })}
              >
                <MenuItem value=''>
                  <em>Select unit</em>
                </MenuItem>
                {(units || []).map(u => {
                  const desc = [u.model, u.description, u.projectName].filter(Boolean).join(' · ') || '—'
                  
return (
                    <MenuItem key={u.id} value={u.id}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', py: 0.5 }}>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>
                          {u.code || u.id}
                        </Typography>
                        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                          {desc}
                        </Typography>
                      </Box>
                    </MenuItem>
                  )
                })}
              </CustomTextField>
            )}
          />
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, mb: 4, flexWrap: 'wrap' }}>
            <Controller
              name='maintenanceDate'
              control={control}
              render={({ field: { value, onChange } }) => (
                <DatePickerWrapper sx={{ flex: 1, minWidth: 140, '& .MuiFormControl-root': { width: '100%' } }}>
                  <DatePicker
                    selected={value ? new Date(value) : null}
                    id='add-actual-date'
                    dateFormat='yyyy-MM-dd'
                    placeholderText='Select date'
                    popperPlacement={popperPlacement}
                    onChange={date => onChange(date ? date.toISOString().slice(0, 10) : '')}
                    customInput={
                      <PickersCustomInput
                        label='Maintenance Date'
                        error={Boolean(errors.maintenanceDate)}
                        {...(errors.maintenanceDate && { helperText: errors.maintenanceDate.message })}
                      />
                    }
                  />
                </DatePickerWrapper>
              )}
            />
            <Controller
              name='maintenanceTime'
              control={control}
              render={({ field: { value, onChange } }) => (
                <DatePickerWrapper sx={{ flex: 1, minWidth: 140, '& .MuiFormControl-root': { width: '100%' } }}>
                  <DatePicker
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={15}
                    timeCaption='Time'
                    dateFormat='HH:mm'
                    id='add-actual-time'
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
                    onChange={date => onChange(date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '')}
                    customInput={<PickersCustomInput label='Time (optional)' />}
                  />
                </DatePickerWrapper>
              )}
            />
          </Box>
          <Controller
            name='hourMeter'
            control={control}
            render={({ field: { value, onChange } }) => (
              <CustomTextField
                fullWidth
                type='number'
                label='Hour Meter'
                value={value}
                sx={{ mb: 4 }}
                onChange={onChange}
                error={Boolean(errors.hourMeter)}
                {...(errors.hourMeter && { helperText: errors.hourMeter.message })}
                inputProps={{ min: 0 }}
              />
            )}
          />
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
                sx={{ mb: 4 }}
                onChange={onChange}
              />
            )}
          />
          <Controller
            name='mechanics'
            control={control}
            render={({ field: { value, onChange } }) => (
              <CustomTextField
                fullWidth
                label='Mechanics (optional)'
                placeholder='e.g. Budi, Andi'
                value={value}
                sx={{ mb: 4 }}
                onChange={onChange}
              />
            )}
          />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button type='submit' variant='contained' sx={{ mr: 3 }} disabled={!user?.id}>
              Save
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

export default AddMaintenanceActualDrawer
