/**
 * Dialog ganti password mandiri — current / new / confirm; POST /api/auth/change-password.
 */
import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import toast from 'react-hot-toast'
import * as yup from 'yup'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import arkaApi from 'src/utils/arka-api'

const defaultValues = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: ''
}

const schema = yup.object().shape({
  currentPassword: yup.string().required('Current password is required'),
  newPassword: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('New password is required')
    .test('different', 'New password must be different from current password', function (value) {
      return !value || value !== this.parent.currentPassword
    }),
  confirmNewPassword: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
})

const passwordFieldSx = { mb: 4 }

const ChangePasswordDialog = ({ open, onClose }) => {
  const [saving, setSaving] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues,
    resolver: yupResolver(schema),
    mode: 'onBlur'
  })

  useEffect(() => {
    if (open) {
      reset(defaultValues)
      setShowCurrent(false)
      setShowNew(false)
      setShowConfirm(false)
    }
  }, [open, reset])

  const handleClose = () => {
    if (saving) return
    onClose()
  }

  const onSubmit = async data => {
    setSaving(true)
    try {
      await arkaApi.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmNewPassword: data.confirmNewPassword
      })
      toast.success('Password changed successfully')
      reset(defaultValues)
      onClose()
    } catch {
      // Error toast handled by arkaApi interceptor
    } finally {
      setSaving(false)
    }
  }

  const eyeAdornment = (visible, onToggle) => (
    <InputAdornment position='end'>
      <IconButton edge='end' onMouseDown={e => e.preventDefault()} onClick={onToggle} disabled={saving}>
        <Icon fontSize='1.25rem' icon={visible ? 'tabler:eye' : 'tabler:eye-off'} />
      </IconButton>
    </InputAdornment>
  )

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='xs' disableEscapeKeyDown={saving}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
        Change Password
        <IconButton size='small' onClick={handleClose} disabled={saving} aria-label='Close'>
          <Icon icon='tabler:x' fontSize='1.25rem' />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: theme => `${theme.spacing(4)} !important` }}>
        <Box component='form' id='change-password-form' noValidate onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name='currentPassword'
            control={control}
            render={({ field: { value, onChange, onBlur } }) => (
              <CustomTextField
                fullWidth
                autoFocus
                value={value}
                onBlur={onBlur}
                onChange={onChange}
                disabled={saving}
                label='Current Password'
                placeholder='············'
                id='change-password-current'
                error={Boolean(errors.currentPassword)}
                type={showCurrent ? 'text' : 'password'}
                sx={passwordFieldSx}
                {...(errors.currentPassword && { helperText: errors.currentPassword.message })}
                InputProps={{ endAdornment: eyeAdornment(showCurrent, () => setShowCurrent(v => !v)) }}
              />
            )}
          />
          <Controller
            name='newPassword'
            control={control}
            render={({ field: { value, onChange, onBlur } }) => (
              <CustomTextField
                fullWidth
                value={value}
                onBlur={onBlur}
                onChange={onChange}
                disabled={saving}
                label='New Password'
                placeholder='············'
                id='change-password-new'
                error={Boolean(errors.newPassword)}
                type={showNew ? 'text' : 'password'}
                sx={passwordFieldSx}
                {...(errors.newPassword && { helperText: errors.newPassword.message })}
                InputProps={{ endAdornment: eyeAdornment(showNew, () => setShowNew(v => !v)) }}
              />
            )}
          />
          <Controller
            name='confirmNewPassword'
            control={control}
            render={({ field: { value, onChange, onBlur } }) => (
              <CustomTextField
                fullWidth
                value={value}
                onBlur={onBlur}
                onChange={onChange}
                disabled={saving}
                label='Confirm New Password'
                placeholder='············'
                id='change-password-confirm'
                error={Boolean(errors.confirmNewPassword)}
                type={showConfirm ? 'text' : 'password'}
                {...(errors.confirmNewPassword && { helperText: errors.confirmNewPassword.message })}
                InputProps={{ endAdornment: eyeAdornment(showConfirm, () => setShowConfirm(v => !v)) }}
              />
            )}
          />
        </Box>
      </DialogContent>
      <DialogActions className='dialog-actions-dense' sx={{ px: 5, py: 3.5 }}>
        <Button onClick={handleClose} disabled={saving} color='secondary'>
          Cancel
        </Button>
        <Button
          type='submit'
          form='change-password-form'
          variant='contained'
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color='inherit' /> : null}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ChangePasswordDialog
