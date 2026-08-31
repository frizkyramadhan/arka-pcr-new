/**
 * Cannibal Dashboard — KPI pipeline, achievement charts/table, approval backlog.
 */

import { useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import SearchableSelect from 'src/@core/components/mui/searchable-select'
import PageHeader from 'src/@core/components/page-header'
import ApexChartWrapper from 'src/@core/styles/libs/react-apexcharts'
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'
import DashboardSkeleton from 'src/views/pcr/common/DashboardSkeleton'
import AchievementPcrTable from 'src/views/pcr/dashboard/AchievementPcrTable'
import AchTrendChart from 'src/views/pcr/dashboard/AchTrendChart'
import KebutuhanCloseOpenChart from 'src/views/pcr/dashboard/KebutuhanCloseOpenChart'
import CannibalKpiRow from 'src/views/pcr/dashboard/cannibal/CannibalKpiRow'
import CannibalOperationalPanels from 'src/views/pcr/dashboard/cannibal/CannibalOperationalPanels'
import CannibalStatusMixChart from 'src/views/pcr/dashboard/cannibal/CannibalStatusMixChart'
import CannibalSummaryLinks from 'src/views/pcr/dashboard/cannibal/CannibalSummaryLinks'

const currentYear = new Date().getFullYear()

const CANNIBAL_CATEGORY_ROWS = [
  { key: 'total', label: 'Total BA', field: 'total' },
  { key: 'close', label: 'Close', field: 'close' },
  { key: 'open', label: 'Open', field: 'open' },
  { key: 'ach', label: 'Ach', field: 'ach', isAch: true }
]

const CannibalDashboardPage = () => {
  const [year, setYear] = useState(currentYear)
  const [yearOptions, setYearOptions] = useState([currentYear])
  const [stats, setStats] = useState(null)
  const [achievement, setAchievement] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async selectedYear => {
    setLoading(true)
    try {
      const [statsRes, achRes] = await Promise.all([
        arkaApi.get('/dashboard/cannibal-stats', { params: { year: selectedYear } }),
        arkaApi.get('/dashboard/cannibal-achievement', { params: { year: selectedYear } })
      ])
      setStats(statsRes.data)
      setAchievement(achRes.data)

      const yearsFromApi = Array.isArray(statsRes.data?.availableYears) ? statsRes.data.availableYears : []

      const merged = [...new Set([...yearsFromApi, selectedYear, currentYear])]
        .filter(y => Number.isFinite(Number(y)))
        .map(Number)
        .sort((a, b) => b - a)
      setYearOptions(merged.length ? merged : [currentYear])
    } catch (error) {
      notifyApiError(error, 'Failed to load cannibal dashboard')
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
          title={<Typography variant='h4'>Cannibal Dashboard</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Cannibal BA pipeline, achievement, and approval backlog
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
          title={<Typography variant='h4'>Cannibal Dashboard</Typography>}
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
                Cannibal BA pipeline, achievement, and approval backlog
              </Typography>
              <SearchableSelect
                size='small'
                label='Year'
                value={yearOptions.includes(year) ? year : yearOptions[0] ?? year}
                onChange={event => setYear(Number(event.target.value))}
                options={yearOptions.map(option => ({ value: option, label: String(option) }))}
                disableClearable
                sx={{ minWidth: 120 }}
              />
            </Box>
          }
        />

        <CannibalKpiRow loading={loading} stats={stats} ytdAch={achievement?.ytd?.ach} />

        <CannibalSummaryLinks />

        <Grid item xs={12} md={4}>
          <CannibalStatusMixChart year={year} statusMix={stats?.statusMix} />
        </Grid>
        <Grid item xs={12} md={4}>
          <AchTrendChart
            year={year}
            months={achievement?.months}
            grandTotal={achievement?.grandTotal}
            title={`Trend Achievement Cannibal ${year}`}
            subheader='Grand Total Ach % per month (Closed / Total BA)'
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <KebutuhanCloseOpenChart
            year={year}
            months={achievement?.months}
            grandTotal={achievement?.grandTotal}
            title={`BA Volume ${year}`}
            subheader='Total, Close, and Open BA by posting month'
            totalSeriesName='Total BA'
          />
        </Grid>

        <Grid item xs={12}>
          <AchievementPcrTable
            year={year}
            months={achievement?.months}
            projects={achievement?.projects}
            grandTotal={achievement?.grandTotal}
            title={`Achievement Cannibal ${year}`}
            subheader='Total BA, Close, Open, and Ach% by project × posting month'
            emptyMessage={`No cannibal BA data for ${year}.`}
            footerLabel='Grand Total Ach Cannibal'
            categoryRows={CANNIBAL_CATEGORY_ROWS}
          />
        </Grid>

        <CannibalOperationalPanels loading={loading} stats={stats} />
      </Grid>
    </ApexChartWrapper>
  )
}

CannibalDashboardPage.acl = {
  action: 'read',
  subject: 'cannibals'
}
CannibalDashboardPage.authGuard = true

export default CannibalDashboardPage
