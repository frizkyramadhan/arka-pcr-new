/**
 * Drawer tambah / edit PCR component — compType select (MAJOR, MINOR, dll).
 */
import { useEffect, useMemo } from 'react'

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

const COMP_TYPE_OPTIONS = ['MAJOR', 'MINOR', 'MID LIFE', 'TYRE', 'UNDER CARRIAGE']

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(6),
  justifyContent: 'space-between'
}))

const defaultValues = {
  compDesc: '',
  compType: '',
  status: 'Active'
}

const schema = yup.object().shape({
  compDesc: yup.string().trim().min(1, 'Description is required').max(50).required('Description is required'),
  compType: yup.string().trim().max(50).nullable(),
  status: yup.string().oneOf(['Active', 'Inactive']).required()
})

const mapComponentToForm = component => ({
  compDesc: component.compDesc ?? '',
  compType: component.compType ?? '',
  status: component.status ?? 'Active'
})

const AddComponentDrawer = props => {
  const { open, toggle, component, onSaved } = props
  const isEdit = Boolean(component?.idComp)

  const typeOptions = useMemo(() => {
    const existingType = component?.compType?.trim()
    if (existingType && !COMP_TYPE_OPTIONS.includes(existingType)) {
      return [existingType, ...COMP_TYPE_OPTIONS]
    }

    return COMP_TYPE_OPTIONS
  }, [component?.compType])

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
    reset(isEdit ? mapComponentToForm(component) : defaultValues)
  }, [open, component, isEdit, reset])

  const handleClose = () => {
    toggle()
    reset(defaultValues)
  }

  const onSubmit = async data => {
    const payload = {
      compDesc: data.compDesc,
      compType: data.compType || null,
      status: data.status
    }

    try {
      if (isEdit) {
        await arkaApi.put(`/components/${component.idComp}`, payload)
        toast.success('Component updated')
      } else {
        await arkaApi.post('/components', payload)
        toast.success('Component created')
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
        <Typography variant='h5'>{isEdit ? 'Edit Component' : 'Add Component'}</Typography>
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
            name='compDesc'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                sx={{ mb: 4 }}
                label='Component Description'
                placeholder='Engine Oil Filter'
                error={Boolean(errors.compDesc)}
                helperText={errors.compDesc?.message}
              />
            )}
          />
          <Controller
            name='compType'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                sx={{ mb: 4 }}
                label='Component Type'
                error={Boolean(errors.compType)}
                helperText={errors.compType?.message}
                options={[
                  { value: '', label: 'Select type' },
                  ...typeOptions.map(type => ({ value: type, label: type }))
                ]}
              />
            )}
          />
          <Controller
            name='status'
            control={control}
            render={({ field }) => (
              <SearchableSelect
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                sx={{ mb: 6 }}
                label='Status'
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' }
                ]}
                disableClearable
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

export default AddComponentDrawer
