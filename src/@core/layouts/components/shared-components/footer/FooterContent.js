// ** Next Import
import Link from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'

const StyledCompanyName = styled(Link)(({ theme }) => ({
  fontWeight: 500,
  textDecoration: 'none',
  color: `${theme.palette.primary.main} !important`
}))

const LinkStyled = styled(Link)(({ theme }) => ({
  textDecoration: 'none',
  color: `${theme.palette.text.secondary} !important`,
  '&:hover': {
    color: `${theme.palette.primary.main} !important`
  }
}))

const FooterContent = () => {
  // ** Var
  const hidden = useMediaQuery(theme => theme.breakpoints.down('md'))

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography sx={{ mr: 2, display: 'flex', alignItems: 'center', color: 'text.secondary', flexWrap: 'wrap' }}>
        {`© ${new Date().getFullYear()} `}
        <Typography
          sx={{ ml: 1, fontWeight: 500 }}
          target='_blank'
          href='https://arka.co.id'
          component={StyledCompanyName}
          rel='noopener'
        >
          PT Arkananta Apta Pratista
        </Typography>
        <span style={{ marginLeft: 8, marginRight: 8 }}>|</span>
        <span>Planned Component Replacement</span>
      </Typography>
      {hidden ? null : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', '& :not(:last-child)': { mr: 4 } }}>
          {/* <Typography target='_blank' component={LinkStyled} href='https://themeforest.net/licenses/standard'>
            License
          </Typography>
          <Typography target='_blank' component={LinkStyled} href='https://1.envato.market/pixinvent_portfolio'>
            More Themes
          </Typography>
          <Typography
            target='_blank'
            component={LinkStyled}
            href='https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation'
          >
            Documentation
          </Typography>
          <Typography target='_blank' component={LinkStyled} href='https://pixinvent.ticksy.com'>
            Support
          </Typography> */}
        </Box>
      )}
    </Box>
  )
}

export default FooterContent
