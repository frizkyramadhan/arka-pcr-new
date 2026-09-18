// ** React Imports
import { useState } from 'react'

// ** MUI Imports
import Drawer from '@mui/material/Drawer'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import { styled } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Third Party Imports
import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm, Controller } from 'react-hook-form'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Store Imports
import { useDispatch } from 'react-redux'
import { addMaintenancePlan } from 'src/store/apps/maintenancePlan'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'
import useProjects from 'src/hooks/useProjects'

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(6),
  justifyContent: 'space-between'
}))

const currentYear = new Date().getFullYear()

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
]

const schema = yup.object().shape({
  projectId: yup.string().required('Project is required'),
  year: yup.number().min(2000).max(2100).required('Year is required'),
  month: yup.number().min(1).max(12).required('Month is required'),
  maintenanceTypeId: yup.string().required('Maintenance type is required'),
  sumPlan: yup.number().min(0).required('Total plan is required')
})

const defaultValues = {
  projectId: '',
  year: currentYear,
  month: new Date().getMonth() + 1,
  maintenanceTypeId: '',
  sumPlan: 0
}

const AddMaintenancePlanDrawer = props => {
  const { open, toggle, maintenanceTypes = [] } = props
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { projects, loading: projectsLoading } = useProjects()

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
      setError('projectId', { message: 'User not logged in' })
      
return
    }
    try {
      await dispatch(
        addMaintenancePlan({
          projectId: data.projectId,
          year: Number(data.year),
          month: Number(data.month),
          maintenanceTypeId: data.maintenanceTypeId,
          sumPlan: Number(data.sumPlan),
          createdById: user.id
        })
      ).unwrap()
      toggle()
      reset(defaultValues)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to add plan'
      setError('projectId', { message: msg })
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
        <Typography variant='h5'>Add Maintenance Plan</Typography>
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
            name='projectId'
            control={control}
            render={({ field: { value, onChange } }) => (
              <CustomTextField
                fullWidth
                select
                label='Project'
                value={value}
                sx={{ mb: 4 }}
                onChange={onChange}
                disabled={projectsLoading}
                error={Boolean(errors.projectId)}
                {...(errors.projectId && { helperText: errors.projectId.message })}
              >
                <MenuItem value=''>
                  <em>Select project</em>
                </MenuItem>
                {(projects || []).map(p => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            <Controller
              name='year'
              control={control}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  fullWidth
                  type='number'
                  label='Year'
                  value={value}
                  onChange={onChange}
                  error={Boolean(errors.year)}
                  {...(errors.year && { helperText: errors.year.message })}
                  inputProps={{ min: 2000, max: 2100 }}
                />
              )}
            />
            <Controller
              name='month'
              control={control}
              render={({ field: { value, onChange } }) => (
                <CustomTextField
                  fullWidth
                  select
                  label='Month'
                  value={value}
                  onChange={onChange}
                  error={Boolean(errors.month)}
                  {...(errors.month && { helperText: errors.month.message })}
                >
                  {MONTH_OPTIONS.map(m => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              )}
            />
          </Box>
          <Controller
            name='maintenanceTypeId'
            control={control}
            render={({ field: { value, onChange } }) => (
              <CustomTextField
                fullWidth
                select
                label='Maintenance Type'
                value={value}
                sx={{ mb: 4 }}
                onChange={onChange}
                error={Boolean(errors.maintenanceTypeId)}
                {...(errors.maintenanceTypeId && { helperText: errors.maintenanceTypeId.message })}
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
          <Controller
            name='sumPlan'
            control={control}
            render={({ field: { value, onChange } }) => (
              <CustomTextField
                fullWidth
                type='number'
                label='Total Plan'
                value={value}
                sx={{ mb: 4 }}
                onChange={onChange}
                error={Boolean(errors.sumPlan)}
                {...(errors.sumPlan && { helperText: errors.sumPlan.message })}
                inputProps={{ min: 0 }}
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

export default AddMaintenancePlanDrawer
