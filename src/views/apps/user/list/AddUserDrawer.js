/**
 * Modal besar tambah / edit user — roles + project scope (RBAC).
 */
import { useEffect, useMemo } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import * as yup from 'yup'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm, Controller } from 'react-hook-form'
import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomTextField from 'src/@core/components/mui/text-field'
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'

import UserRolePicker from './UserRolePicker'

const defaultValues = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  projectCodes: [],
  isActive: true,
  roleIds: []
}

const passwordSchema = isEdit =>
  isEdit
    ? yup
        .string()
        .transform(value => (value === '' || value == null ? undefined : value))
        .notRequired()
        .min(6, 'Password must be at least 6 characters')
    : yup.string().min(6, 'Password must be at least 6 characters').required('Password is required')

const buildSchema = isEdit =>
  yup.object().shape({
    username: yup.string().trim().min(3).max(50).required('Username is required'),
    email: yup
      .string()
      .trim()
      .transform(value => (value === '' ? null : value))
      .nullable()
      .email('Invalid email address')
      .max(255),
    password: passwordSchema(isEdit),
    fullName: yup.string().trim().max(100).nullable(),
    projectCodes: yup.array().of(yup.string().trim().max(10)),
    isActive: yup.boolean(),
    roleIds: yup.array().of(yup.number()).min(1, 'Select at least one role')
  })

const mapUserToForm = user => ({
  username: user.username ?? '',
  email: user.email ?? '',
  password: '',
  fullName: user.fullName ?? '',
  projectCodes: Array.isArray(user.projectCodes) ? user.projectCodes : [],
  isActive: user.isActive ?? true,
  roleIds: Array.isArray(user.roleIds) ? user.roleIds : []
})

/** API roles return permissions as `{ idPermission, code }` or plain strings. */
const permissionCode = perm => (typeof perm === 'string' ? perm : perm?.code)

const collectPermissionCodes = roleList =>
  roleList.flatMap(role => (role.permissions ?? []).map(permissionCode).filter(Boolean))

const AddUserDrawer = props => {
  const { open, toggle, user, projects, roles, onSaved } = props
  const isEdit = Boolean(user?.idUser)

  const activeRoles = useMemo(() => roles.filter(role => role.isActive !== false), [roles])
  const activeRoleIds = useMemo(() => new Set(activeRoles.map(role => role.idRole)), [activeRoles])

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
    resolver: yupResolver(buildSchema(isEdit))
  })

  const roleIds = watch('roleIds')
  const selectedSet = useMemo(() => new Set(roleIds ?? []), [roleIds])

  const effectivePermissions = useMemo(() => {
    const selectedRoles = activeRoles.filter(role => selectedSet.has(role.idRole))

    return [...new Set(collectPermissionCodes(selectedRoles))].sort()
  }, [activeRoles, selectedSet])

  useEffect(() => {
    if (!open) return

    if (isEdit) {
      const form = mapUserToForm(user)
      form.roleIds = form.roleIds.filter(id => activeRoleIds.has(id))
      reset(form)
    } else {
      reset(defaultValues)
    }
  }, [open, user, isEdit, reset, activeRoleIds])

  const handleClose = () => {
    toggle()
    reset(defaultValues)
  }

  const onSubmit = async data => {
    const payload = {
      username: data.username,
      email: data.email || null,
      fullName: data.fullName || null,
      projectCodes: data.projectCodes ?? [],
      isActive: data.isActive,
      roleIds: data.roleIds ?? []
    }

    const newPassword = typeof data.password === 'string' ? data.password.trim() : ''
    if (newPassword) {
      payload.password = newPassword
    }

    try {
      if (isEdit) {
        await arkaApi.put(`/users/${user.idUser}`, payload)
        toast.success('User updated')
      } else {
        await arkaApi.post('/users', payload)
        toast.success('User created')
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
          <Typography variant='h5'>{isEdit ? 'Edit User' : 'Add User'}</Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
            Account details, roles, and project data scope
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
                name='fullName'
                control={control}
                render={({ field }) => (
                  <CustomTextField {...field} fullWidth sx={{ mb: 4 }} label='Full Name' placeholder='John Doe' />
                )}
              />
              <Controller
                name='username'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    sx={{ mb: 4 }}
                    label='Username'
                    placeholder='johndoe'
                    error={Boolean(errors.username)}
                    helperText={errors.username?.message}
                  />
                )}
              />
              <Controller
                name='email'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    type='email'
                    sx={{ mb: 4 }}
                    label='Email'
                    placeholder='john.doe@company.com (optional)'
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message}
                  />
                )}
              />
              <Controller
                name='password'
                control={control}
                render={({ field }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    type='password'
                    sx={{ mb: 4 }}
                    label={isEdit ? 'New Password (optional)' : 'Password'}
                    error={Boolean(errors.password)}
                    helperText={errors.password?.message}
                  />
                )}
              />
              <Controller
                name='projectCodes'
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    multiple
                    name={field.name}
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    onBlur={field.onBlur}
                    sx={{ mb: 4 }}
                    label='Projects (data scope)'
                    helperText='000H = all projects (head office). Role eksekutif (Plant Manager / PGM, OGM, Directors): wajib pilih 000H.'
                    options={projects.map(project => ({
                      value: project.project_code,
                      label: `${project.project_code} - ${project.bowheer}`
                    }))}
                  />
                )}
              />
              <Controller
                name='isActive'
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    label='Active'
                    control={<Checkbox checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant='body2' sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                Roles
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 2 }}>
                Click a card to assign or remove a role
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Controller
                  name='roleIds'
                  control={control}
                  render={({ field }) => (
                    <UserRolePicker
                      roles={activeRoles}
                      value={field.value}
                      onChange={ids => setValue('roleIds', ids, { shouldDirty: true, shouldValidate: true })}
                      error={errors.roleIds?.message}
                    />
                  )}
                />
              </Box>

              {effectivePermissions.length > 0 ? (
                <Box>
                  <Typography variant='body2' sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                    Effective permissions (preview)
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 200,
                      overflowY: 'auto',
                      pr: 1,
                      border: theme => `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      p: 3,
                      bgcolor: 'background.paper',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1
                    }}
                  >
                    {effectivePermissions.map(code => (
                      <Chip key={code} size='small' label={code} skin='light' color='primary' />
                    ))}
                  </Box>
                </Box>
              ) : null}
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

export default AddUserDrawer
