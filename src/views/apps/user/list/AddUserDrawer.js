/**
 * Drawer tambah / edit user — roles + project scope (RBAC).
 */
import { useEffect, useMemo } from 'react'

import Drawer from '@mui/material/Drawer'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import FormGroup from '@mui/material/FormGroup'

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

  const toggleRole = (idRole, checked) => {
    const next = new Set(selectedSet)
    if (checked) next.add(idRole)
    else next.delete(idRole)
    setValue('roleIds', Array.from(next), { shouldDirty: true, shouldValidate: true })
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
    <Drawer
      open={open}
      anchor='right'
      variant='temporary'
      onClose={handleClose}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: 300, sm: 480 } } }}
    >
      <Header>
        <Typography variant='h5'>{isEdit ? 'Edit User' : 'Add User'}</Typography>
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

          <Typography variant='body2' sx={{ mb: 2, fontWeight: 600 }}>
            Roles
          </Typography>
          <FormGroup sx={{ mb: errors.roleIds ? 1 : 4, maxHeight: 200, overflowY: 'auto' }}>
            {activeRoles.map(role => (
              <FormControlLabel
                key={role.idRole}
                label={
                  <Box>
                    <Typography variant='body2'>{role.name}</Typography>
                    {role.description ? (
                      <Typography variant='caption' color='text.secondary'>
                        {role.description}
                      </Typography>
                    ) : null}
                  </Box>
                }
                control={
                  <Checkbox
                    checked={selectedSet.has(role.idRole)}
                    onChange={e => toggleRole(role.idRole, e.target.checked)}
                  />
                }
              />
            ))}
          </FormGroup>
          {errors.roleIds ? (
            <Typography variant='caption' color='error' sx={{ mb: 4, display: 'block' }}>
              {errors.roleIds.message}
            </Typography>
          ) : null}

          {effectivePermissions.length > 0 ? (
            <Box sx={{ mb: 4 }}>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                Effective permissions (preview)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {effectivePermissions.slice(0, 12).map(code => (
                  <Chip key={code} size='small' label={code} skin='light' color='primary' />
                ))}
                {effectivePermissions.length > 12 ? (
                  <Chip size='small' label={`+${effectivePermissions.length - 12}`} skin='light' />
                ) : null}
              </Box>
            </Box>
          ) : null}

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
                sx={{ mb: 6 }}
                label='Active'
                control={<Checkbox checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
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

export default AddUserDrawer
