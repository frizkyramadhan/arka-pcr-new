/**
 * Dashboard Maintenance FMS — widget KPI + tabs achievement.
 * Port dari arka-fms; auth via arkaApi (NextAuth session).
 */
import { useState, useEffect } from 'react'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import arkaApi from 'src/utils/arka-api'
import MaintenanceDashboardTabs from 'src/views/dashboards/maintenance/MaintenanceDashboardTabs'
import WidgetCompliance from 'src/views/dashboards/maintenance/WidgetCompliance'
import WidgetDueThisMonth from 'src/views/dashboards/maintenance/WidgetDueThisMonth'
import WidgetOverdue from 'src/views/dashboards/maintenance/WidgetOverdue'
import WidgetTotalUnits from 'src/views/dashboards/maintenance/WidgetTotalUnits'

const MaintenanceDashboard = () => {
  const currentYear = new Date().getFullYear()
  const [stats, setStats] = useState(null)
  const [achievement, setAchievement] = useState(null)
  const [achievementYear, setAchievementYear] = useState(currentYear)
  const [achievementProjectId, setAchievementProjectId] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingAchievement, setLoadingAchievement] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const fetchStats = async () => {
      try {
        setLoadingStats(true)
        setError(null)
        const { data } = await arkaApi.get('/dashboard/stats')
        if (!cancelled) setStats(data)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load statistics')
      } finally {
        if (!cancelled) setLoadingStats(false)
      }
    }
    fetchStats()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const params = { year: achievementYear }
    if (achievementProjectId) params.projectId = achievementProjectId

    const fetchAchievement = async () => {
      try {
        setLoadingAchievement(true)
        const { data } = await arkaApi.get('/dashboard/achievement', { params })
        if (!cancelled) setAchievement(data)
      } catch (e) {
        if (!cancelled) setAchievement(null)
      } finally {
        if (!cancelled) setLoadingAchievement(false)
      }
    }
    fetchAchievement()

    return () => {
      cancelled = true
    }
  }, [achievementYear, achievementProjectId])

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color='error'>Failed to load statistics: {error}</Typography>
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Typography variant='h4' sx={{ mb: 1 }}>
          Maintenance Monitoring
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Summary of units, total plan/actual this month, variance, and achievement program per site
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <WidgetTotalUnits data={stats} loading={loadingStats} />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <WidgetDueThisMonth data={stats} loading={loadingStats} />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <WidgetCompliance data={stats} loading={loadingStats} />
      </Grid>
      <Grid item xs={12} sm={6} lg={3}>
        <WidgetOverdue data={stats} loading={loadingStats} />
      </Grid>
      <Grid item xs={12}>
        <MaintenanceDashboardTabs
          achievement={achievement}
          loadingAchievement={loadingAchievement}
          achievementYear={achievementYear}
          onAchievementYearChange={setAchievementYear}
          achievementProjectId={achievementProjectId}
          onAchievementProjectChange={setAchievementProjectId}
        />
      </Grid>
    </Grid>
  )
}

MaintenanceDashboard.acl = {
  action: 'read',
  subject: 'maintenance-plan'
}

export default MaintenanceDashboard
