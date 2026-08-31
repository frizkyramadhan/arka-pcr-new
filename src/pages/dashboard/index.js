/**
 * PCR Dashboard — KPI, achievement charts/table, operational queues.
 */

import { useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import PageHeader from 'src/@core/components/page-header'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import ApexChartWrapper from 'src/@core/styles/libs/react-apexcharts'
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'
import DashboardSkeleton from 'src/views/pcr/common/DashboardSkeleton'
import AchievementPcrTable from 'src/views/pcr/dashboard/AchievementPcrTable'
import AchTrendChart from 'src/views/pcr/dashboard/AchTrendChart'
import DashboardKpiRow from 'src/views/pcr/dashboard/DashboardKpiRow'
import DashboardOperationalPanels from 'src/views/pcr/dashboard/DashboardOperationalPanels'
import DashboardSummaryReports from 'src/views/pcr/dashboard/DashboardSummaryReports'
import KebutuhanCloseOpenChart from 'src/views/pcr/dashboard/KebutuhanCloseOpenChart'

const currentYear = new Date().getFullYear()

/** Year options: current year ± 2, plus years that may have plan data. */
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

const PcrDashboardPage = () => {
  const [year, setYear] = useState(currentYear)
  const [stats, setStats] = useState(null)
  const [achievement, setAchievement] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async selectedYear => {
    setLoading(true)
    try {
      const [statsRes, achRes] = await Promise.all([
        arkaApi.get('/dashboard/stats', { params: { year: selectedYear } }),
        arkaApi.get('/dashboard/achievement', { params: { year: selectedYear } })
      ])
      setStats(statsRes.data)
      setAchievement(achRes.data)
    } catch (error) {
      notifyApiError(error, 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard(year)
  }, [fetchDashboard, year])

  if (loading && !stats) {
    return (
      <Grid container spacing={6}>
        <PageHeader
          title={<Typography variant='h4'>PCR Dashboard</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              PCR achievement analytics, forecasts, approvals, and critical components
            </Typography>
          }
        />
        <Grid item xs={12}>
          <DashboardSkeleton />
        </Grid>
      </Grid>
    )
  }

  return (
    <ApexChartWrapper>
      <Grid container spacing={6}>
        <PageHeader
          title={<Typography variant='h4'>PCR Dashboard</Typography>}
          subtitle={
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 3,
                mt: 1
              }}
            >
              <Typography sx={{ color: 'text.secondary' }}>
                PCR achievement analytics, forecasts, approvals, and critical components
              </Typography>
              <SearchableSelect
                size='small'
                label='Tahun'
                value={year}
                disableClearable
                onChange={event => setYear(Number(event.target.value))}
                options={YEAR_OPTIONS.map(option => ({ value: option, label: String(option) }))}
                sx={{ minWidth: 120 }}
              />
            </Box>
          }
        />

        <DashboardKpiRow loading={loading} stats={stats} ytdAch={achievement?.ytd?.ach} />

        <DashboardSummaryReports />

        <Grid item xs={12} md={6}>
          <AchTrendChart year={year} months={achievement?.months} grandTotal={achievement?.grandTotal} />
        </Grid>
        <Grid item xs={12} md={6}>
          <KebutuhanCloseOpenChart year={year} months={achievement?.months} grandTotal={achievement?.grandTotal} />
        </Grid>

        <Grid item xs={12}>
          <AchievementPcrTable
            year={year}
            months={achievement?.months}
            projects={achievement?.projects}
            grandTotal={achievement?.grandTotal}
          />
        </Grid>

        <DashboardOperationalPanels year={year} loading={loading} stats={stats} />
      </Grid>
    </ApexChartWrapper>
  )
}

PcrDashboardPage.authGuard = true

export default PcrDashboardPage
