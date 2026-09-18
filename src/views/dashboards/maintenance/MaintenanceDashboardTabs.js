/**
 * Dashboard Maintenance dengan multi-tab (pola seperti UserProfile.js).
 * Tab 1: Achievement (tabel); Tab 2: Grafik per Site; Tab 3: placeholder.
 */
import { useState } from 'react'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import TabPanel from '@mui/lab/TabPanel'
import TabContext from '@mui/lab/TabContext'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import MuiTabList from '@mui/lab/TabList'
import Icon from 'src/@core/components/icon'
import AchievementTable from 'src/views/dashboards/maintenance/AchievementTable'
import AchievementChartsGrid from 'src/views/dashboards/maintenance/AchievementChartsGrid'
import AchievementAverageAllProgramCharts from 'src/views/dashboards/maintenance/AchievementAverageAllProgramCharts'
import AchievementYTDDonutCharts from 'src/views/dashboards/maintenance/AchievementYTDDonutCharts'

const StyledTabList = styled(MuiTabList)(({ theme }) => ({
  borderBottom: '0 !important',
  '&, & .MuiTabs-scroller': {
    boxSizing: 'content-box',
    padding: theme.spacing(1.25, 1.25, 2),
    margin: `${theme.spacing(-1.25, -1.25, -2)} !important`
  },
  '& .MuiTabs-indicator': {
    display: 'none'
  },
  '& .Mui-selected': {
    boxShadow: theme.shadows[2],
    backgroundColor: theme.palette.primary.main,
    color: `${theme.palette.common.white} !important`
  },
  '& .MuiTab-root': {
    minWidth: 65,
    minHeight: 38,
    lineHeight: 1,
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      color: theme.palette.primary.main
    },
    [theme.breakpoints.up('sm')]: {
      minWidth: 130
    }
  }
}))

const MaintenanceDashboardTabs = ({
  achievement,
  loadingAchievement,
  achievementYear,
  onAchievementYearChange,
  achievementProjectId,
  onAchievementProjectChange
}) => {
  const [activeTab, setActiveTab] = useState('achievement')
  const hideText = useMediaQuery(theme => theme.breakpoints.down('sm'))

  const handleChange = (event, value) => {
    setActiveTab(value)
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <TabContext value={activeTab}>
          <Grid container spacing={6}>
            <Grid item xs={12}>
              <StyledTabList
                variant='scrollable'
                scrollButtons='auto'
                onChange={handleChange}
                aria-label='Dashboard Maintenance tabs'
              >
                <Tab
                  value='achievement'
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', ...(!hideText && { '& svg': { mr: 2 } }) }}>
                      <Icon fontSize='1.125rem' icon='tabler:clipboard-data' />
                      {!hideText && 'Raw Data'}
                    </Box>
                  }
                />
                <Tab
                  value='charts-grid'
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', ...(!hideText && { '& svg': { mr: 2 } }) }}>
                      <Icon fontSize='1.125rem' icon='tabler:chart-bar' />
                      {!hideText && 'Achievement Program'}
                    </Box>
                  }
                />
                <Tab
                  value='tab3'
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', ...(!hideText && { '& svg': { mr: 2 } }) }}>
                      <Icon fontSize='1.125rem' icon='tabler:chart-bar' />
                      {!hideText && 'MTD'}
                    </Box>
                  }
                />
                <Tab
                  value='tab4'
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', ...(!hideText && { '& svg': { mr: 2 } }) }}>
                      <Icon fontSize='1.125rem' icon='tabler:chart-donut' />
                      {!hideText && 'YTD'}
                    </Box>
                  }
                />
              </StyledTabList>
            </Grid>
            <Grid item xs={12}>
              <TabPanel sx={{ p: 0 }} value='achievement'>
                <AchievementTable
                  data={achievement}
                  loading={loadingAchievement}
                  year={achievementYear}
                  onYearChange={onAchievementYearChange}
                  projectId={achievementProjectId}
                  onProjectChange={onAchievementProjectChange}
                />
              </TabPanel>
              <TabPanel sx={{ p: 0 }} value='charts-grid'>
                <AchievementChartsGrid
                  data={achievement}
                  loading={loadingAchievement}
                  year={achievementYear}
                  onYearChange={onAchievementYearChange}
                  projectId={achievementProjectId}
                  onProjectChange={onAchievementProjectChange}
                />
              </TabPanel>
              <TabPanel sx={{ p: 0 }} value='tab3'>
                <AchievementAverageAllProgramCharts
                  data={achievement}
                  loading={loadingAchievement}
                  year={achievementYear}
                  onYearChange={onAchievementYearChange}
                  projectId={achievementProjectId}
                  onProjectChange={onAchievementProjectChange}
                />
              </TabPanel>
              <TabPanel sx={{ p: 0 }} value='tab4'>
                <AchievementYTDDonutCharts
                  data={achievement}
                  loading={loadingAchievement}
                  year={achievementYear}
                  onYearChange={onAchievementYearChange}
                  projectId={achievementProjectId}
                  onProjectChange={onAchievementProjectChange}
                />
              </TabPanel>
            </Grid>
          </Grid>
        </TabContext>
      </Grid>
    </Grid>
  )
}

export default MaintenanceDashboardTabs
