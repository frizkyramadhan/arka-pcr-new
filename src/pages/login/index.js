// ** React Imports
import { useState } from 'react'

// ** Next Import
import Link from 'next/link'
import { useRouter } from 'next/router'

// ** MUI Components
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import InputAdornment from '@mui/material/InputAdornment'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Third Party Imports
import * as yup from 'yup'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'

// ** Hooks
import { useAuth } from 'src/hooks/useAuth'

// ** Configs
import themeConfig from 'src/configs/themeConfig'

// ** Layout Import
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** Auth Imports
import AuthCoverLayout from 'src/views/pages/auth/AuthCoverLayout'
import AuthFormBrand from 'src/views/pages/auth/AuthFormBrand'

const LinkStyled = styled(Link)(({ theme }) => ({
  textDecoration: 'none',
  color: `${theme.palette.primary.main} !important`
}))

const schema = yup.object().shape({
  username: yup.string().required('Username is required'),
  password: yup.string().min(5).required()
})

const defaultValues = {
  password: 'admin123',
  username: 'admin'
}

const LoginPage = () => {
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const auth = useAuth()
  const router = useRouter()
  const registered = router.query.registered === '1'

  const {
    control,
    setError,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues,
    mode: 'onBlur',
    resolver: yupResolver(schema)
  })

  const onSubmit = data => {
    const { username, password } = data
    auth.login({ username, password, rememberMe }, () => {
      setError('username', {
        type: 'manual',
        message: 'Username or Password is invalid'
      })
    })
  }

  return (
    <AuthCoverLayout>
      <AuthFormBrand />
      <Box sx={{ mb: 6 }}>
        <Typography variant='h3' sx={{ mb: 1.5 }}>
          {`Welcome to ${themeConfig.templateName}! 👋🏻`}
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>Sign in with your username and password</Typography>
      </Box>
      {registered ? (
        <Alert severity='success' sx={{ mb: 4 }}>
          Registration received. Your account will be inactive until activated by an administrator.
        </Alert>
      ) : null}

      <form noValidate autoComplete='off' onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ mb: 4 }}>
          <Controller
            name='username'
            control={control}
            rules={{ required: true }}
            render={({ field: { value, onChange, onBlur } }) => (
              <CustomTextField
                autoFocus
                fullWidth
                label='Username'
                value={value}
                onBlur={onBlur}
                onChange={onChange}
                placeholder='admin'
                error={Boolean(errors.username)}
                {...(errors.username && { helperText: errors.username.message })}
              />
            )}
          />
        </Box>
        <Box sx={{ mb: 1.5 }}>
          <Controller
            name='password'
            control={control}
            rules={{ required: true }}
            render={({ field: { value, onChange, onBlur } }) => (
              <CustomTextField
                fullWidth
                value={value}
                onBlur={onBlur}
                label='Password'
                onChange={onChange}
                id='auth-login-password'
                placeholder='············'
                error={Boolean(errors.password)}
                {...(errors.password && { helperText: errors.password.message })}
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
        <Button fullWidth type='submit' variant='contained' sx={{ mb: 4 }}>
          Login
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Typography sx={{ color: 'text.secondary', mr: 2 }}>New on our platform?</Typography>
          <Typography component={LinkStyled} href='/register'>
            Create an account
          </Typography>
        </Box>
      </form>
    </AuthCoverLayout>
  )
}

LoginPage.getLayout = page => <BlankLayout>{page}</BlankLayout>
LoginPage.guestGuard = true

export default LoginPage
