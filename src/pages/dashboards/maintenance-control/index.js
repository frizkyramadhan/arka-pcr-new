/**
 * Fundamental Maintenance Control dashboard — new layout from the control design (separate from /dashboards/maintenance).
 * Global filters (spec section 5): period, MTD/YTD, site, program — kept in the URL query so a view can be shared.
 * Clicking a program in the donut or the detail table drills down to it. Every KPI carries a status mark
 * (target met / near / not met) and panels show whether their data is live, partly available, or not available yet.
 * Clicking a KPI card, KPI table row, or a panel's Detail button opens the detail list (spec section 13) in DrilldownDialog.
 * Data: GET /api/dashboard/maintenance-control (+ /drilldown for the detail lists).
 * Permissions: maintenance-dashboard.read (page), .drilldown (detail lists), .export (Excel + Print/PDF).
 * The old dashboard (/dashboards/maintenance) has no menu entry; the "Old Dashboard" button links to it.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import useCan from 'src/hooks/useCan'
import useProjects from 'src/hooks/useProjects'
import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate } from 'src/utils/date-format'

import { BacklogAging, CriticalFindingAging, PerformanceTrend, ProgramDonut, ReliabilityTrend } from 'src/views/dashboards/maintenance-control/ControlCharts'
import { KpiCategoryTables, ProgramDetailTable, TopIssues } from 'src/views/dashboards/maintenance-control/ControlTables'
import DrilldownDialog from 'src/views/dashboards/maintenance-control/DrilldownDialog'
import FilterBar, {
  DEFAULT_FILTERS,
  filtersFromQuery,
  filtersToApiParams,
  filtersToQuery
} from 'src/views/dashboards/maintenance-control/FilterBar'
import KpiCards from 'src/views/dashboards/maintenance-control/KpiCards'
import ReportActions from 'src/views/dashboards/maintenance-control/ReportActions'
import { DRILLDOWNS, kpiMark, MARKS } from 'src/views/dashboards/maintenance-control/shared'

/** Order of the coverage legend chips. */
const LEGEND_ORDER = ['met', 'near', 'missed', 'monitor', 'noData', 'notBuilt']

const MaintenanceControlDashboard = () => {
  const router = useRouter()
  const { projects } = useProjects()
  const { can } = useCan()
  const canDrill = can('maintenance-dashboard.drilldown')
  const canExport = can('maintenance-dashboard.export')
  const [filters, setFilters] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Read the filters once the router has the query string.
  useEffect(() => {
    if (router.isReady && !filters) setFilters(filtersFromQuery(router.query))
  }, [router.isReady, router.query, filters])

  /** Apply new filters and mirror them into the URL without a page reload. */
  const changeFilters = next => {
    setFilters(next)
    router.replace({ pathname: router.pathname, query: filtersToQuery(next) }, undefined, { shallow: true })
  }

  /** Program drill-down from a chart or table; picking the selected program again goes back to all. */
  const selectProgram = typeId => changeFilters({ ...filters, programId: filters.programId === typeId ? '' : typeId })

  /**
   * Open detail list (spec section 13): { kind, options } from DRILLDOWNS or a panel's own list.
   * Without the drilldown permission the handlers stay undefined, so cards/rows are not clickable and Detail buttons hide.
   */
  const [drill, setDrill] = useState(null)

  const drillKpi = canDrill
    ? code => DRILLDOWNS[code] && setDrill({ ...DRILLDOWNS[code], label: data?.kpis?.[code]?.label })
    : undefined
  const detailOf = request => (canDrill ? () => setDrill(request) : undefined)
  const kpiDetailOf = code => (canDrill ? () => drillKpi(code) : undefined)

  useEffect(() => {
    if (!filters) return
    const params = filtersToApiParams(filters)
    if (!params.year || !params.month) return
    let cancelled = false
    setLoading(true)
    setError(null)
    arkaApi
      .get('/dashboard/maintenance-control', { params })
      .then(res => {
        if (!cancelled) setData(res.data)
      })
      .catch(err => {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || 'Failed to load dashboard')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filters])

  /** How many KPIs fall into each status, for the coverage strip. */
  const coverage = useMemo(() => {
    const counts = Object.fromEntries(LEGEND_ORDER.map(key => [key, 0]))
    for (const kpi of Object.values(data?.kpis ?? {})) counts[kpiMark(kpi)] += 1

    return counts
  }, [data])

  const kpis = data?.kpis ?? {}
  const totalKpis = Object.keys(kpis).length
  const withData = totalKpis - coverage.noData - coverage.notBuilt
  const mode = filters?.mode ?? DEFAULT_FILTERS.mode
  const scopeLabel = mode === 'YTD' ? '(YTD)' : '(MTD)'

  return (
    <Grid container spacing={5}>
      {/* Header: title */}
      <Grid item xs={12} sx={{ display: 'flex', alignItems: 'flex-start', gap: 4, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Typography variant='h4' sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Fundamental Maintenance Control
          </Typography>
          <Typography sx={{ color: 'text.secondary' }}>Right Work · Right Time · Right Quality · Higher Reliability</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            component={Link}
            href='/dashboards/maintenance'
            variant='tonal'
            color='secondary'
            startIcon={<Icon icon='tabler:clipboard-data' />}
          >
            Old Dashboard
          </Button>
          {filters && canExport && <ReportActions filters={filters} disabled={!data} />}
        </Box>
      </Grid>

      {/* Global filters */}
      {filters && (
        <Grid item xs={12}>
          <FilterBar
            filters={filters}
            onChange={changeFilters}
            projects={projects}
            programOptions={data?.programOptions ?? []}
            period={data?.period}
            loading={loading}
          />
        </Grid>
      )}

      {loading && (
        <Grid item xs={12} sx={{ pt: '0 !important' }}>
          <LinearProgress />
        </Grid>
      )}

      {error && (
        <Grid item xs={12}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      )}

      {data && (
        <>
          {/* Coverage strip: which KPIs meet target and which have no data yet */}
          <Grid item xs={12}>
            <Card sx={{ px: 4, py: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Icon icon='tabler:list-check' fontSize='1.25rem' />
              <Typography variant='body2' sx={{ fontWeight: 600, mr: 2 }}>
                {withData} of {totalKpis} KPIs have data
              </Typography>
              {LEGEND_ORDER.map(key => (
                <CustomChip
                  key={key}
                  size='small'
                  skin='light'
                  color={MARKS[key].mui}
                  icon={<Icon icon={MARKS[key].icon} fontSize='0.95rem' />}
                  label={`${MARKS[key].label}: ${coverage[key]}`}
                  sx={{ '& .MuiChip-icon': { ml: 1 } }}
                />
              ))}
              <Typography variant='caption' sx={{ color: 'text.secondary', ml: 'auto' }}>
                Hover any icon for the reason
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <KpiCards kpis={kpis} onDrill={drillKpi} />
          </Grid>

          {/* Trend, backlog aging, program achievement */}
          <Grid item xs={12} lg={4}>
            <PerformanceTrend trend={data.trend} kpis={kpis} />
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <BacklogAging
              backlogTrend={data.backlogTrend}
              kpi={kpis.BACKLOG_GT30}
              criticalKpi={kpis.CRITICAL_BACKLOG}
              criticalAging={data.criticalBacklogAging}
              onDrill={drillKpi}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={4}>
            <ProgramDonut
              programs={data.programs}
              overall={data.overallAchievement}
              title={`Maintenance Program Achievement ${scopeLabel}`}
              onSelectProgram={selectProgram}
              onDetail={detailOf({ kind: 'program', label: 'Program Achievement' })}
            />
          </Grid>

          {/* KPI tables by category, top issues */}
          <Grid item xs={12} lg={8}>
            <KpiCategoryTables kpis={kpis} onDrill={drillKpi} />
          </Grid>
          <Grid item xs={12} lg={4}>
            <TopIssues issues={data.topIssues} mode={mode} />
          </Grid>

          {/* Program detail, critical finding aging, reliability trend */}
          <Grid item xs={12} lg={6}>
            <ProgramDetailTable
              programs={data.programs}
              kpis={kpis}
              title={`Program Performance Detail ${scopeLabel}`}
              onSelectProgram={selectProgram}
              selectedProgramId={filters?.programId}
              onDetail={detailOf({ kind: 'program', label: 'Program Performance by Site' })}
            />
          </Grid>
          <Grid item xs={12} md={5} lg={3}>
            <CriticalFindingAging
              criticalAging={data.criticalAging}
              kpi={kpis.CRITICAL_FAILURE}
              onDetail={kpiDetailOf('CRITICAL_FAILURE')}
            />
          </Grid>
          <Grid item xs={12} md={7} lg={3}>
            <ReliabilityTrend trend={data.trend} kpis={kpis} onDetail={kpiDetailOf('MTBF')} />
          </Grid>

          <DrilldownDialog request={drill} filters={filters} onClose={() => setDrill(null)} />

          {/* Footer */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, color: 'text.secondary' }}>
              <Typography variant='caption'>
                Data from the ARKA PCR maintenance system · MTD: {data.period.label} · YTD: {data.period.ytdLabel} · Cut-off:{' '}
                {formatDisplayDate(data.period.cutoff)}
              </Typography>
              <Typography variant='caption' sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                Reliable Unit – Sustainable Operation – Higher Productivity
              </Typography>
            </Box>
          </Grid>
        </>
      )}
    </Grid>
  )
}

MaintenanceControlDashboard.acl = {
  action: 'read',
  subject: 'maintenance-dashboard'
}

MaintenanceControlDashboard.pageTitle = 'Fundamental Maintenance Control'

export default MaintenanceControlDashboard
