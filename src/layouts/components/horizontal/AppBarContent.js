// ** MUI Imports
import Box from '@mui/material/Box'

// ** Components
import Autocomplete from 'src/layouts/components/Autocomplete'
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
  const { hidden, settings, saveSettings } = props

  // ** Hook
  const auth = useAuth()

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {auth.user && <Autocomplete hidden={hidden} settings={settings} />}
      <ModeToggler settings={settings} saveSettings={saveSettings} />
      {auth.user && (
        <>
          <ShortcutsDropdown settings={settings} shortcuts={shortcuts} />
          <UserDropdown settings={settings} />
        </>
      )}
    </Box>
  )
}

export default AppBarContent
