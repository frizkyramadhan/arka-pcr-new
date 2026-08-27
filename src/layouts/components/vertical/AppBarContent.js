// ** MUI Imports
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Components
import ModeToggler from 'src/@core/layouts/components/shared-components/ModeToggler'
import UserDropdown from 'src/@core/layouts/components/shared-components/UserDropdown'
import ShortcutsDropdown from 'src/@core/layouts/components/shared-components/ShortcutsDropdown'

// ** Hook Import
import { useAuth } from 'src/hooks/useAuth'

const shortcuts = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: 'tabler:smart-home',
    subtitle: 'PCR Overview'
  },
  {
    title: 'Maintenance',
    url: '/dashboards/maintenance',
    icon: 'tabler:layout-dashboard',
    subtitle: 'Dashboard Maintenance'
  },
  {
    title: 'Units',
    url: '/units',
    icon: 'tabler:truck',
    subtitle: 'Fleet Units'
  },
  {
    title: 'PCR Forecast',
    url: '/forecasts',
    icon: 'tabler:chart-dots',
    subtitle: 'Replacement Forecast'
  },
  {
    title: 'Users',
    icon: 'tabler:users',
    url: '/users',
    subtitle: 'User Management'
  },
  {
    url: '/roles',
    icon: 'tabler:shield',
    subtitle: 'Role Management',
    title: 'Roles'
  }
]

const AppBarContent = props => {
  // ** Props
  const { hidden, settings, saveSettings, toggleNavVisibility } = props

  // ** Hook
  const auth = useAuth()

  return (
    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box className='actions-left' sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
        {hidden && !settings.navHidden ? (
          <IconButton color='inherit' sx={{ ml: -2.75 }} onClick={toggleNavVisibility}>
            <Icon fontSize='1.5rem' icon='tabler:menu-2' />
          </IconButton>
        ) : null}
      </Box>
      <Box className='actions-right' sx={{ display: 'flex', alignItems: 'center' }}>
        <ModeToggler settings={settings} saveSettings={saveSettings} />
        {auth.user && (
          <>
            <ShortcutsDropdown settings={settings} shortcuts={shortcuts} />
            <UserDropdown settings={settings} />
          </>
        )}
      </Box>
    </Box>
  )
}

export default AppBarContent
