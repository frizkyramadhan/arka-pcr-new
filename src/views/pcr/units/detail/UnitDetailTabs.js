/**
 * Unit detail tabs — PCR Forecast, Actual, Inspection, SOS, Condition.
 */
import { useRouter } from 'next/router'

import Card from '@mui/material/Card'
import Tab from '@mui/material/Tab'
import { styled } from '@mui/material/styles'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'

import Icon from 'src/@core/components/icon'

import UnitActualTabPanel from 'src/views/pcr/units/detail/UnitActualTabPanel'
import UnitConditionTabPanel from 'src/views/pcr/units/detail/UnitConditionTabPanel'
import UnitForecastTabPanel from 'src/views/pcr/units/detail/UnitForecastTabPanel'
import UnitInspectionTabPanel from 'src/views/pcr/units/detail/UnitInspectionTabPanel'
import UnitSosTabPanel from 'src/views/pcr/units/detail/UnitSosTabPanel'

const UNIT_TABS = [
  { value: 'forecast', label: 'PCR Forecast', icon: 'tabler:chart-dots' },
  { value: 'actual', label: 'PCR Actual', icon: 'tabler:tool' },
  { value: 'inspection', label: 'Inspection', icon: 'tabler:clipboard-check' },
  { value: 'sos', label: 'SOS', icon: 'tabler:droplet' },
  { value: 'condition', label: 'Condition', icon: 'tabler:activity' }
]

const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: 48,
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.9375rem',
  flexDirection: 'row',
  gap: theme.spacing(1.5),
  '& svg': { margin: 0, fontSize: '1.25rem' }
}))

const StyledTabList = styled(TabList)(({ theme }) => ({
  minHeight: 56,
  px: 2,
  borderBottom: `1px solid ${theme.palette.divider}`,
  '& .MuiTabs-indicator': {
    height: 3,
    borderRadius: '3px 3px 0 0'
  }
}))

const VALID_TAB_SET = new Set(UNIT_TABS.map(t => t.value))

const UnitDetailTabs = ({ fleetId, unit }) => {
  const router = useRouter()
  const tabQuery = typeof router.query.tab === 'string' ? router.query.tab : 'forecast'
  const activeTab = VALID_TAB_SET.has(tabQuery) ? tabQuery : 'forecast'

  const handleTabChange = (_event, value) => {
    router.replace({ pathname: router.pathname, query: { ...router.query, tab: value } }, undefined, {
      shallow: true
    })
  }

  return (
    <Card>
      <TabContext value={activeTab}>
        <StyledTabList variant='scrollable' scrollButtons='auto' onChange={handleTabChange}>
          {UNIT_TABS.map(tab => (
            <StyledTab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={<Icon icon={tab.icon} fontSize='1.25rem' />}
              iconPosition='start'
            />
          ))}
        </StyledTabList>

        {UNIT_TABS.map(tab => (
          <TabPanel key={tab.value} value={tab.value} sx={{ p: 0 }}>
            {activeTab === tab.value && tab.value === 'forecast' ? (
              <UnitForecastTabPanel fleetId={fleetId} unit={unit} isActive />
            ) : null}
            {activeTab === tab.value && tab.value === 'actual' ? (
              <UnitActualTabPanel fleetId={fleetId} unit={unit} isActive />
            ) : null}
            {activeTab === tab.value && tab.value === 'inspection' ? (
              <UnitInspectionTabPanel fleetId={fleetId} unit={unit} isActive />
            ) : null}
            {activeTab === tab.value && tab.value === 'sos' ? (
              <UnitSosTabPanel fleetId={fleetId} unit={unit} isActive />
            ) : null}
            {activeTab === tab.value && tab.value === 'condition' ? (
              <UnitConditionTabPanel fleetId={fleetId} isActive />
            ) : null}
          </TabPanel>
        ))}
      </TabContext>
    </Card>
  )
}

export default UnitDetailTabs
