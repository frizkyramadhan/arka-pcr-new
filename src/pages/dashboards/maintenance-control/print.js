/**
 * Print-friendly management report of the Fundamental Maintenance Control dashboard (spec section 14: PDF + print).
 * Opened from the dashboard's "Print / PDF" button with the same filters in the URL (?period=&view=&site=&program=).
 * A4 landscape, three pages: KPI cards + trend/backlog/program; KPI tables + top issues; program detail + reliability.
 * Always rendered in the light theme so the paper copy looks the same for every user. PDF = browser "Save as PDF".
 * Data: GET /api/dashboard/maintenance-control (same numbers as the dashboard).
 * Permission: maintenance-dashboard.export (route guard).
 */
import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { createTheme, responsiveFontSizes, ThemeProvider } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import { useSettings } from 'src/@core/hooks/useSettings'
import BlankLayout from 'src/@core/layouts/BlankLayout'
import themeOptions from 'src/@core/theme/ThemeOptions'
import themeConfig from 'src/configs/themeConfig'
import arkaApi from 'src/utils/arka-api'
import { withBasePath } from 'src/utils/base-path'
import { formatDisplayDate } from 'src/utils/date-format'

import { BacklogAging, CriticalFindingAging, PerformanceTrend, ProgramDonut, ReliabilityTrend } from 'src/views/dashboards/maintenance-control/ControlCharts'
import { KpiCategoryTables, ProgramDetailTable, TopIssues } from 'src/views/dashboards/maintenance-control/ControlTables'
import { filtersFromQuery, filtersToApiParams, filtersToQuery } from 'src/views/dashboards/maintenance-control/FilterBar'
import KpiCards from 'src/views/dashboards/maintenance-control/KpiCards'
import { formatDateTime, kpiMark, MARKS } from 'src/views/dashboards/maintenance-control/shared'

/** Printable width of A4 landscape (297 mm − 2 × 8 mm margin); the screen preview uses the same width so charts match. */
const PRINT_WIDTH = '281mm'

const LEGEND_ORDER = ['met', 'near', 'missed', 'monitor', 'noData', 'notBuilt']

/** Starts a new printed page. */
const PageBreak = () => <Box className='control-print-break' />

const MaintenanceControlPrint = () => {
  const router = useRouter()
  const { settings } = useSettings()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const filters = useMemo(() => (router.isReady ? filtersFromQuery(router.query) : null), [router.isReady, router.query])

  // Light theme regardless of the user's mode; bordered cards print cleaner than shadows.
  const theme = useMemo(() => {
    const base = createTheme(themeOptions({ ...settings, mode: 'light', skin: 'bordered' }, 'light'))

    return themeConfig.responsiveFontSizes ? responsiveFontSizes(base) : base
  }, [settings])

  useEffect(() => {
    if (!filters) return
    let cancelled = false
    arkaApi
      .get('/dashboard/maintenance-control', { params: filtersToApiParams(filters) })
      .then(res => {
        if (!cancelled) setData(res.data)
      })
      .catch(err => {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || 'Failed to load report')
      })

    return () => {
      cancelled = true
    }
  }, [filters])

  const coverage = useMemo(() => {
    const counts = Object.fromEntries(LEGEND_ORDER.map(key => [key, 0]))
    for (const kpi of Object.values(data?.kpis ?? {})) counts[kpiMark(kpi)] += 1

    return counts
  }, [data])

  const kpis = data?.kpis ?? {}
  const period = data?.period
  const scopeLabel = period?.mode === 'MTD' ? '(MTD)' : '(YTD)'

  const filterItems = period
    ? [
        ['Period', `${period.label} · ${period.mode}`],
        ['Range', `${formatDisplayDate(period.start)} – ${formatDisplayDate(period.end)}`],
        ['Cut-off', formatDisplayDate(period.cutoff)],
        ['Site', period.projectId || 'All sites'],
        ['Program', period.programName || 'All programs'],
        ['Data updated', formatDateTime(period.dataUpdatedAt)]
      ]
    : []

  return (
    <ThemeProvider theme={theme}>
      <Head>
        <title>Maintenance Control Report{period ? ` — ${period.label} ${period.mode}` : ''}</title>
        <style>{`
          body { background: #eef0f3 !important; }
          .layout-wrapper, .app-content { height: auto !important; min-height: auto !important; overflow: visible !important; }
          .control-print-break { break-before: page; page-break-before: always; height: 0; }
          .control-print-root .MuiCard-root { break-inside: avoid; page-break-inside: avoid; }
          @page { size: A4 landscape; margin: 8mm; }
          @media print {
            html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
            .control-print-toolbar { display: none !important; }
            .control-print-root { margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
            .control-print-root * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </Head>

      {/* Toolbar: screen only */}
      <Box
        className='control-print-toolbar'
        sx={{ width: PRINT_WIDTH, mx: 'auto', py: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}
      >
        <Button
          component={Link}
          href={{ pathname: '/dashboards/maintenance-control', query: filters ? filtersToQuery(filters) : {} }}
          variant='tonal'
          color='secondary'
          startIcon={<Icon icon='tabler:arrow-left' />}
        >
          Dashboard
        </Button>
        <Typography variant='body2' sx={{ color: 'text.secondary', flex: 1 }}>
          A4 landscape. To save a PDF, choose “Save as PDF” as the printer and turn on “Background graphics”.
        </Typography>
        <Button variant='contained' disabled={!data} onClick={() => window.print()} startIcon={<Icon icon='tabler:printer' />}>
          Print / Save as PDF
        </Button>
      </Box>

      <Box
        className='control-print-root'
        sx={{
          width: PRINT_WIDTH,
          mx: 'auto',
          mb: 6,
          p: 4,
          bgcolor: '#fff',
          color: 'text.primary',
          boxShadow: 3,
          '& .MuiTypography-h4': { fontSize: '1.5rem' },
          '& .MuiTypography-h6': { fontSize: '0.95rem' }
        }}
      >
        {!data && !error && <LinearProgress />}
        {error && <Alert severity='error'>{error}</Alert>}

        {data && (
          <>
            {/* Page 1: header, KPI cards, trend / backlog / program */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, pb: 2, mb: 3, borderBottom: '2px solid', borderColor: 'primary.main' }}>
              <Box component='img' src={withBasePath('/images/arka-logo.png')} alt='ARKA' sx={{ height: 34, width: 'auto' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant='h5' sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.2 }}>
                  Fundamental Maintenance Control
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  Management report · Right Work · Right Time · Right Quality · Higher Reliability
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 2, rowGap: 0.25 }}>
                {filterItems.map(([label, value]) => (
                  <Box key={label} sx={{ display: 'contents' }}>
                    <Typography variant='caption' sx={{ color: 'text.secondary', textAlign: 'right' }}>
                      {label}
                    </Typography>
                    <Typography variant='caption' sx={{ fontWeight: 700 }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
              {LEGEND_ORDER.map(key => (
                <Box key={key} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: `${MARKS[key].mui}.main` }}>
                  <Icon icon={MARKS[key].icon} fontSize='1rem' />
                  <Typography variant='caption' sx={{ color: 'text.primary' }}>
                    {MARKS[key].label}: <b>{coverage[key]}</b>
                  </Typography>
                </Box>
              ))}
            </Box>

            <KpiCards kpis={kpis} columns={9} />

            <Grid container spacing={3} sx={{ mt: 0 }}>
              <Grid item xs={4}>
                <PerformanceTrend trend={data.trend} kpis={kpis} />
              </Grid>
              <Grid item xs={4}>
                <BacklogAging
                  backlogTrend={data.backlogTrend}
                  kpi={kpis.BACKLOG_GT30}
                  criticalKpi={kpis.CRITICAL_BACKLOG}
                  criticalAging={data.criticalBacklogAging}
                />
              </Grid>
              <Grid item xs={4}>
                <ProgramDonut programs={data.programs} overall={data.overallAchievement} title={`Program Achievement ${scopeLabel}`} />
              </Grid>
            </Grid>

            {/* Page 2: KPI tables by category, top issues */}
            <PageBreak />
            <Grid container spacing={3}>
              <Grid item xs={8}>
                <KpiCategoryTables kpis={kpis} />
              </Grid>
              <Grid item xs={4}>
                <TopIssues issues={data.topIssues} mode={period.mode} />
              </Grid>
            </Grid>

            {/* Page 3: program detail, critical finding aging, reliability */}
            <PageBreak />
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <ProgramDetailTable programs={data.programs} kpis={kpis} title={`Program Performance Detail ${scopeLabel}`} />
              </Grid>
              <Grid item xs={6}>
                <CriticalFindingAging criticalAging={data.criticalAging} kpi={kpis.CRITICAL_FAILURE} />
              </Grid>
              <Grid item xs={6}>
                <ReliabilityTrend trend={data.trend} kpis={kpis} />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                Data from the ARKA PCR maintenance system · Cut-off {formatDisplayDate(period.cutoff)} · Data last updated{' '}
                {formatDateTime(period.dataUpdatedAt)} · Loaded {formatDateTime(period.loadedAt)}
              </Typography>
              <Typography variant='caption' sx={{ fontStyle: 'italic', color: 'primary.main' }}>
                Reliable Unit – Sustainable Operation – Higher Productivity
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </ThemeProvider>
  )
}

MaintenanceControlPrint.getLayout = page => <BlankLayout>{page}</BlankLayout>
MaintenanceControlPrint.authGuard = true

MaintenanceControlPrint.acl = {
  action: 'read',
  subject: 'maintenance-dashboard'
}

export default MaintenanceControlPrint
