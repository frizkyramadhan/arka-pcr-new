/**
 * Modal besar tambah / edit permission — assign role via checkbox list.
 */
import { useEffect } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'

import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { Controller, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'

const defaultValues = {
  code: '',
  description: '',
  isActive: true,
  roleIds: []
}

const schema = yup.object().shape({
  code: yup.string().trim().min(3).max(100).required('Permission code is required'),
  description: yup.string().trim().max(255).nullable(),
  isActive: yup.boolean(),
  roleIds: yup.array().of(yup.number())
})

const mapPermissionToForm = permission => ({
  code: permission.code ?? '',
  description: permission.description ?? '',
  isActive: permission.isActive ?? true,
  roleIds: Array.isArray(permission.roleIds) ? permission.roleIds : []
})

const AddPermissionDrawer = ({ open, toggle, permission, roles, onSaved }) => {
  const isEdit = Boolean(permission?.idPermission)

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

  const roleIds = watch('roleIds')
  const selectedSet = new Set(roleIds ?? [])

  useEffect(() => {
    if (!open) return
    reset(isEdit ? mapPermissionToForm(permission) : defaultValues)
  }, [open, permission, isEdit, reset])

  const handleClose = () => {
    toggle()
    reset(defaultValues)
  }

  const toggleRole = (idRole, checked) => {
    const next = new Set(selectedSet)
    if (checked) next.add(idRole)
    else next.delete(idRole)
    setValue('roleIds', Array.from(next), { shouldDirty: true })
  }

  const onSubmit = async data => {
    const payload = {
      code: data.code.trim(),
      description: data.description?.trim() || null,
      isActive: data.isActive,
      roleIds: data.roleIds ?? []
    }

    try {
      if (isEdit) {
        await arkaApi.put(`/permissions/${permission.idPermission}`, payload)
        toast.success('Permission updated')
      } else {
        await arkaApi.post('/permissions', payload)
        toast.success('Permission created')
      }
      onSaved?.()
      handleClose()
    } catch (error) {
      await notifyApiError(error, 'Save failed', msg => toast.error(msg))
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='lg' fullWidth scroll='paper'>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pr: 2 }}>
        <Box>
          <Typography variant='h5'>{isEdit ? 'Edit Permission' : 'Add Permission'}</Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
            Permission catalog entry and role assignment
          </Typography>
        </Box>
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
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Controller
                name='code'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    sx={{ mb: 4 }}
                    label='Permission Code'
                    placeholder='component.create'
                    error={Boolean(errors.code)}
                    helperText={errors.code?.message ?? 'Format: module.action'}
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
                    minRows={3}
                    sx={{ mb: 4 }}
                    label='Description'
                    placeholder='Permission description'
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
                    label='Active'
                    control={<Switch checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant='body2' sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                Assigned Roles
              </Typography>
              <FormGroup
                sx={{
                  maxHeight: 320,
                  overflowY: 'auto',
                  pr: 1,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 3,
                  bgcolor: 'background.paper'
                }}
              >
                {roles.map(role => (
                  <FormControlLabel
                    key={role.idRole}
                    label={role.name}
                    control={
                      <Checkbox
                        checked={selectedSet.has(role.idRole)}
                        onChange={e => toggleRole(role.idRole, e.target.checked)}
                      />
                    }
                  />
                ))}
              </FormGroup>
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 6 }}>
            <Button type='submit' variant='contained' sx={{ mr: 3 }}>
              {isEdit ? 'Update' : 'Submit'}
            </Button>
            <Button variant='tonal' color='secondary' onClick={handleClose}>
              Cancel
            </Button>
          </Box>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddPermissionDrawer
