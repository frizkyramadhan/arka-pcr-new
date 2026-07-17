/**
 * Vuexy auth v2 cover layout — left illustration panel + right form column.
 */
import Box from '@mui/material/Box'
import useMediaQuery from '@mui/material/useMediaQuery'
import { styled, useTheme } from '@mui/material/styles'

import FooterIllustrationsV2 from 'src/views/pages/auth/FooterIllustrationsV2'

const CoverIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  maxHeight: 680,
  maxWidth: '92%',
  objectFit: 'contain',
  marginTop: theme.spacing(12),
  marginBottom: theme.spacing(12),
  [theme.breakpoints.down(1540)]: {
    maxHeight: 550
  },
  [theme.breakpoints.down('lg')]: {
    maxHeight: 500
  }
}))

const FormColumn = styled(Box)(({ theme }) => ({
  width: '100%',
  [theme.breakpoints.up('md')]: {
    maxWidth: 450
  },
  [theme.breakpoints.up('lg')]: {
    maxWidth: 600
  },
  [theme.breakpoints.up('xl')]: {
    maxWidth: 750
  }
}))

const AuthCoverLayout = ({ children }) => {
  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  const coverSrc = `/images/pages/arka-pcr-auth-cover-${theme.palette.mode}.png`

  return (
    <Box className='content-right' sx={{ backgroundColor: 'background.paper' }}>
      {!hidden ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            position: 'relative',
            alignItems: 'center',
            borderRadius: '20px',
            justifyContent: 'center',
            backgroundColor: 'customColors.bodyBg',
            margin: t => t.spacing(8, 0, 8, 8)
          }}
        >
          <CoverIllustration alt='ARKA PCR — planned component replacement monitoring' src={coverSrc} />
          <FooterIllustrationsV2 />
        </Box>
      ) : null}
      <FormColumn>
        <Box
          sx={{
            p: [6, 12],
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 400 }}>{children}</Box>
        </Box>
      </FormColumn>
    </Box>
  )
}

export default AuthCoverLayout
