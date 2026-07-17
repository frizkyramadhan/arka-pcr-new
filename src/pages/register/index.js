// ** React Imports
import { useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Components
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import { styled, useTheme } from '@mui/material/styles'
import InputAdornment from '@mui/material/InputAdornment'

// ** Third Party Imports
import * as yup from 'yup'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import toast from 'react-hot-toast'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Layout Import
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** Utils
import arkaApi from 'src/utils/arka-api'

// ** Auth Imports
import AuthCoverLayout from 'src/views/pages/auth/AuthCoverLayout'
import AuthFormBrand from 'src/views/pages/auth/AuthFormBrand'

const LinkStyled = styled(Link)(({ theme }) => ({
  textDecoration: 'none',
  color: `${theme.palette.primary.main} !important`
}))

const schema = yup.object().shape({
  fullName: yup.string().trim().min(1, 'Full name is required').max(100),
  username: yup.string().trim().min(3, 'Username must be at least 3 characters').max(50),
  email: yup
    .string()
    .trim()
    .transform(value => (value === '' ? null : value))
    .nullable()
    .email('Invalid email address')
    .max(255),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required')
})

const defaultValues = {
  fullName: '',
  username: '',
  email: '',
  password: ''
}

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const theme = useTheme()

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues,
    mode: 'onBlur',
    resolver: yupResolver(schema)
  })

  const onSubmit = async data => {
    setSubmitting(true)
    try {
      await arkaApi.post('/auth/register', {
        fullName: data.fullName,
        username: data.username,
        email: data.email || null,
        password: data.password
      })
      toast.success('Registration submitted. Please wait for admin activation.')
      router.push('/login?registered=1')
    } catch (error) {
      const message =
        error.response?.data?.error ??
        error.userMessage ??
        'Registration failed. Please check your details and try again.'
      toast.error(typeof message === 'string' ? message : 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCoverLayout>
      <AuthFormBrand />
      <Box sx={{ mb: 4 }}>
        <Typography variant='h3' sx={{ mb: 1.5 }}>
          Create your account
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Sign in later with your username and password. Account will be inactive until activated by admin.
        </Typography>
      </Box>
      <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ mb: 4 }}>
          <Controller
            name='fullName'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                autoFocus
                fullWidth
                label='Full Name'
                placeholder='John Doe'
                error={Boolean(errors.fullName)}
                helperText={errors.fullName?.message}
              />
            )}
          />
        </Box>
        <Box sx={{ mb: 4 }}>
          <Controller
            name='username'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                label='Username'
                placeholder='johndoe'
                error={Boolean(errors.username)}
                helperText={errors.username?.message}
              />
            )}
          />
        </Box>
        <Box sx={{ mb: 4 }}>
          <Controller
            name='email'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                type='email'
                label='Email'
                placeholder='john.doe@company.com (optional)'
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
              />
            )}
          />
        </Box>
        <Box sx={{ mb: 4 }}>
          <Controller
            name='password'
            control={control}
            render={({ field }) => (
              <CustomTextField
                {...field}
                fullWidth
                label='Password'
                placeholder='············'
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                type={showPassword ? 'text' : 'password'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        edge='end'
                        onClick={() => setShowPassword(!showPassword)}
                        onMouseDown={e => e.preventDefault()}
                        aria-label='toggle password visibility'
                      >
                        <Icon fontSize='1.25rem' icon={showPassword ? 'tabler:eye' : 'tabler:eye-off'} />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            )}
          />
        </Box>
        <Button fullWidth type='submit' variant='contained' disabled={submitting} sx={{ mb: 4 }}>
          {submitting ? 'Submitting…' : 'Sign up'}
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Typography sx={{ color: 'text.secondary', mr: 2 }}>Already have an account?</Typography>
          <Typography component={LinkStyled} href='/login' sx={{ fontSize: theme.typography.body1.fontSize }}>
            Sign in instead
          </Typography>
        </Box>
      </form>
    </AuthCoverLayout>
  )
}

RegisterPage.getLayout = page => <BlankLayout>{page}</BlankLayout>
RegisterPage.guestGuard = true

export default RegisterPage
