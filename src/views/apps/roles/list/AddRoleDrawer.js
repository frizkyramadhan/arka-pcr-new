/**
 * Drawer tambah / edit role — permission dikelompokkan per modul (checkbox).
 */
import { useEffect, useMemo } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'

import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { Controller, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'

import PermissionCheckboxGroups from './PermissionCheckboxGroups'

const Header = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(6),
  justifyContent: 'space-between'
}))

const defaultValues = {
  name: '',
  description: '',
  isActive: true,
  permissionIds: []
}

const schema = yup.object().shape({
  name: yup.string().trim().min(2).max(50).required('Role name is required'),
  description: yup.string().trim().max(255).nullable(),
  isActive: yup.boolean(),
  permissionIds: yup.array().of(yup.number())
})

const mapRoleToForm = role => ({
  name: role.name ?? '',
  description: role.description ?? '',
  isActive: role.isActive ?? true,
  permissionIds: Array.isArray(role.permissionIds) ? role.permissionIds : []
})

const AddRoleDrawer = ({ open, toggle, role, permissions, onSaved }) => {
  const isEdit = Boolean(role?.idRole)

  const activePermissions = useMemo(
    () => permissions.filter(permission => permission.isActive !== false),
    [permissions]
  )
  const activePermissionIds = useMemo(
    () => new Set(activePermissions.map(permission => permission.idPermission)),
    [activePermissions]
  )

  const {
    reset,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues,
    mode: 'onChange',
    resolver: yupResolver(schema)
  })

  const permissionIds = watch('permissionIds')

  useEffect(() => {
    if (!open) return

    if (isEdit) {
      const form = mapRoleToForm(role)
      form.permissionIds = form.permissionIds.filter(id => activePermissionIds.has(id))
      reset(form)
    } else {
      reset(defaultValues)
    }
  }, [open, role, isEdit, reset, activePermissionIds])

  const handleClose = () => {
    toggle()
    reset(defaultValues)
  }

  const onSubmit = async data => {
    const payload = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      isActive: data.isActive,
      permissionIds: data.permissionIds ?? []
    }

    try {
      if (isEdit) {
        await arkaApi.put(`/roles/${role.idRole}`, payload)
        toast.success('Role updated')
      } else {
        await arkaApi.post('/roles', payload)
        toast.success('Role created')
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
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 520 } } }}
    >
      <Header>
        <Typography variant='h5'>{isEdit ? 'Edit Role' : 'Add Role'}</Typography>
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
            name='name'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                sx={{ mb: 4 }}
                label='Role Name'
                placeholder='Admin'
                error={Boolean(errors.name)}
                helperText={errors.name?.message}
              />
            )}
          />
          <Controller
            name='description'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                multiline
                minRows={2}
                sx={{ mb: 4 }}
                label='Description'
                placeholder='Role description'
                error={Boolean(errors.description)}
                helperText={errors.description?.message}
              />
            )}
          />
          <Controller
            name='isActive'
            control={control}
            render={({ field }) => (
              <FormControlLabel
                sx={{ mb: 4, display: 'flex' }}
                label='Active'
                control={<Switch checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
              />
            )}
          />

          <Typography variant='body2' sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
            Permissions
          </Typography>
          <Box
            sx={{
              mb: 4,
              maxHeight: 360,
              overflowY: 'auto',
              pr: 1,
              border: theme => `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              p: 3
            }}
          >
            <PermissionCheckboxGroups
              permissions={activePermissions}
              selectedIds={permissionIds}
              onChange={ids => setValue('permissionIds', ids, { shouldDirty: true })}
            />
          </Box>

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

export default AddRoleDrawer
