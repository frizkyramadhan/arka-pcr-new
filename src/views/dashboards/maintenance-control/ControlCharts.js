/**
 * Chart panels for the Fundamental Maintenance Control dashboard (ApexCharts):
 * performance trend, backlog aging, program achievement donut, critical finding aging, reliability sparklines.
 */
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import ReactApexcharts from 'src/@core/components/react-apexcharts'

import { DetailButton, EmptyState, formatKpiValue, formatTarget, Panel, readinessOf, StatusMark } from './shared'

/** Hover lift for callout boxes that open a drill-down. */
const clickableSx = onClick =>
  onClick ? { cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } } : {}

/** Backlog / aging bucket colours, youngest to oldest. */
const useAgingColors = () => {
  const theme = useTheme()

  return [theme.palette.success.main, theme.palette.warning.light, '#FF9F43', theme.palette.error.main]
}

const AGING_LABELS = ['0–7', '8–14', '15–30', '> 30']

const hasValue = list => list.some(value => value != null)

/** PM Compliance, On-Time, QC Pass Rate per month of the year. */
export const PerformanceTrend = ({ trend, kpis }) => {
  const theme = useTheme()

  const series = [
    { name: 'PM Compliance', data: trend.map(row => row.pmCompliance) },
    { name: 'On-Time', data: trend.map(row => row.onTime) },
    { name: 'QC Pass', data: trend.map(row => row.qcPass) }
  ]
  const readiness = readinessOf([kpis.PM_COMPLIANCE, kpis.ON_TIME_COMPLIANCE, kpis.QC_PASS_RATE])

  const options = {
    chart: { toolbar: { show: false }, zoom: { enabled: false } },
    colors: [theme.palette.primary.main, theme.palette.success.main, '#FF9F43'],
    stroke: { width: 3, curve: 'straight' },
    markers: { size: 4 },
    xaxis: { categories: trend.map(row => row.label) },
    yaxis: { min: 0, max: 100, tickAmount: 4, labels: { formatter: value => `${Math.round(value)}%` } },
    legend: { position: 'top', horizontalAlign: 'right' },
    grid: { borderColor: theme.palette.divider },
    tooltip: { y: { formatter: value => (value == null ? 'No data' : `${value}%`) } },
    noData: { text: 'No data' }
  }

  return (
    <Panel
      title='Maintenance Performance Trend (YTD)'
      readiness={readiness}
      readinessNote='Monthly from dated plan rows. QC Pass needs QC status Pass/Fail on actuals.'
    >
      {series.some(item => hasValue(item.data)) ? (
        <ReactApexcharts type='line' height={250} options={options} series={series} />
      ) : (
        <EmptyState text='No dated plan rows this year yet' />
      )}
    </Panel>
  )
}

/** Open plan rows by age at each month end, plus the > 30 days and Critical Backlog callouts. */
export const BacklogAging = ({ backlogTrend, kpi, criticalKpi, criticalAging, onDrill }) => {
  const theme = useTheme()
  const colors = useAgingColors()
  const keys = ['b0_7', 'b8_14', 'b15_30', 'gt30']
  const series = keys.map((key, index) => ({ name: AGING_LABELS[index], data: backlogTrend.map(row => row[key]) }))

  const options = {
    chart: { stacked: true, toolbar: { show: false } },
    colors,
    plotOptions: { bar: { columnWidth: '45%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: backlogTrend.map(row => row.label) },
    yaxis: { labels: { formatter: value => Math.round(value) } },
    legend: { position: 'top', horizontalAlign: 'left' },
    grid: { borderColor: theme.palette.divider },
    annotations: {
      points: backlogTrend.map(row => ({
        x: row.label,
        y: row.total,
        marker: { size: 0 },
        label: { text: String(row.total), borderWidth: 0, offsetY: -4, style: { background: 'transparent', fontWeight: 700 } }
      }))
    }
  }

  return (
    <Panel
      title='Backlog Aging'
      readiness={kpi?.state === 'ready' ? 'live' : 'empty'}
      readinessNote={kpi?.note}
      action={<DetailButton onClick={onDrill ? () => onDrill('TOTAL_BACKLOG') : null} label='All backlog' />}
    >
      <Grid container spacing={3} sx={{ flex: 1 }}>
        <Grid item xs={12} sm={8}>
          {backlogTrend.length ? (
            <ReactApexcharts type='bar' height={240} options={options} series={series} />
          ) : (
            <EmptyState text='No dated plan rows yet' />
          )}
        </Grid>
        <Grid item xs={12} sm={4} sx={{ display: 'flex' }}>
          <Box
            sx={{
              flex: 1,
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 1,
              bgcolor: theme => `${theme.palette.error.main}14`,
              border: theme => `1px solid ${theme.palette.error.main}33`
            }}
          >
            <Tooltip arrow title={onDrill ? 'Click for the jobs > 30 days with aging and reason' : ''}>
              <Box
                onClick={onDrill ? () => onDrill('BACKLOG_GT30') : undefined}
                sx={{ borderRadius: 1, py: 1, display: 'flex', flexDirection: 'column', gap: 1, ...clickableSx(onDrill) }}
              >
                <Typography variant='body2' sx={{ fontWeight: 700, color: 'error.main' }}>
                  Backlog &gt; 30 Days
                </Typography>
                <Typography variant='h3' sx={{ fontWeight: 700, color: 'error.main' }}>
                  {formatKpiValue(kpi)}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                  (Target {formatTarget(kpi)})
                </Typography>
                <Box>
                  <StatusMark kpi={kpi} size='1.6rem' />
                </Box>
              </Box>
            </Tooltip>
            {criticalKpi && (
              <Tooltip
                arrow
                title={
                  criticalAging
                    ? `Days past due: ${AGING_LABELS.map((label, index) => `${label}: ${criticalAging[['b0_7', 'b8_14', 'b15_30', 'gt30'][index]]}`).join(' · ')}`
                    : ''
                }
              >
                <Box
                  onClick={onDrill ? () => onDrill('CRITICAL_BACKLOG') : undefined}
                  sx={{
                    mt: 1,
                    pt: 2,
                    pb: 1,
                    borderRadius: 1,
                    borderTop: theme => `1px dashed ${theme.palette.error.main}55`,
                    cursor: 'help',
                    ...clickableSx(onDrill)
                  }}
                >
                  <Typography variant='caption' sx={{ display: 'block', fontWeight: 700, color: 'error.main' }}>
                    Critical Backlog
                  </Typography>
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant='h5' sx={{ fontWeight: 700, color: 'error.main' }}>
                      {formatKpiValue(criticalKpi)}
                    </Typography>
                    <StatusMark kpi={criticalKpi} size='1.1rem' />
                  </Box>
                </Box>
              </Tooltip>
            )}
          </Box>
        </Grid>
      </Grid>
    </Panel>
  )
}

/** Achievement per program; slice size = plan rows, label = achievement %. Clicking a slice or legend row filters by it. */
export const ProgramDonut = ({ programs, overall, title, onSelectProgram, onDetail }) => {
  const theme = useTheme()
  const rows = programs.filter(row => row.plan > 0)

  // Distinct hue per program; de-duplicated because the theme primary may equal one of the fixed colours
  const palette = [
    ...new Set([
      theme.palette.primary.main,
      '#FF9F43',
      theme.palette.success.main,
      '#E83E8C',
      theme.palette.info.main,
      '#FFC107',
      theme.palette.error.main,
      '#795548',
      '#3D5AFE',
      '#607D8B'
    ])
  ]

  const options = {
    chart: {
      events: {
        dataPointSelection: (_event, _context, { dataPointIndex }) => {
          const row = rows[dataPointIndex]
          if (row && onSelectProgram) onSelectProgram(row.typeId)
        }
      }
    },
    states: { active: { filter: { type: 'none' } } },
    labels: rows.map(row => row.name),
    colors: palette,
    legend: { show: false },
    stroke: { width: 2, colors: [theme.palette.background.paper] },
    dataLabels: {
      enabled: true,
      formatter: (value, { seriesIndex }) => `${rows[seriesIndex]?.achievement ?? 0}%`
    },
    tooltip: {
      y: { formatter: (value, { seriesIndex }) => `${rows[seriesIndex]?.actual} of ${value} plan rows` }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '58%',
          labels: {
            show: true,
            value: { fontSize: '1.4rem', fontWeight: 700, formatter: () => (overall == null ? '—' : `${overall}%`) },
            total: { show: true, label: 'Overall', formatter: () => (overall == null ? '—' : `${overall}%`) }
          }
        }
      }
    }
  }

  return (
    <Panel
      title={title}
      readiness={rows.length ? 'live' : 'empty'}
      readinessNote='Achievement = actual ÷ plan rows per program. Click a program to filter by it.'
      action={<DetailButton onClick={onDetail} />}
    >
      {rows.length ? (
        <Grid container spacing={2} alignItems='center' sx={{ flex: 1 }}>
          <Grid item xs={12} sm={7}>
            <ReactApexcharts type='donut' height={240} options={options} series={rows.map(row => row.plan)} />
          </Grid>
          <Grid item xs={12} sm={5}>
            {rows.map((row, index) => (
              <Box
                key={row.typeId}
                onClick={() => onSelectProgram?.(row.typeId)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 1,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: onSelectProgram ? 'pointer' : 'default',
                  '&:hover': onSelectProgram ? { bgcolor: 'action.hover' } : undefined
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: palette[index % palette.length] }} />
                <Typography variant='body2' sx={{ flex: 1 }}>
                  {row.name}
                </Typography>
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  {row.achievement == null ? '—' : `${row.achievement}%`}
                </Typography>
              </Box>
            ))}
          </Grid>
        </Grid>
      ) : (
        <EmptyState text='No dated plan rows in this period' />
      )}
    </Panel>
  )
}

/** Open critical findings at the cut-off by age. */
export const CriticalFindingAging = ({ criticalAging, kpi, onDetail }) => {
  const theme = useTheme()
  const colors = useAgingColors()
  const order = ['gt30', 'b15_30', 'b8_14', 'b0_7']
  const labels = ['> 30 Days', '15 – 30 Days', '8 – 14 Days', '0 – 7 Days']
  const values = order.map(key => criticalAging?.[key] ?? 0)

  const options = {
    chart: { toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, distributed: true, barHeight: '55%' } },
    colors: [colors[3], colors[2], colors[1], colors[0]],
    dataLabels: { enabled: true, style: { colors: [theme.palette.text.primary] }, offsetX: 18 },
    legend: { show: false },
    xaxis: { categories: labels, labels: { formatter: value => Math.round(value) } },
    grid: { borderColor: theme.palette.divider },
    tooltip: { y: { formatter: value => `${value} open critical` } }
  }

  return (
    <Panel
      title='Critical Finding Aging'
      readiness='live'
      readinessNote='Critical findings still open at the cut-off date, by days since finding date'
      action={
        <>
          <DetailButton onClick={onDetail} />
          <StatusMark kpi={kpi} />
        </>
      }
    >
      <ReactApexcharts type='bar' height={220} options={options} series={[{ name: 'Open critical', data: values }]} />
    </Panel>
  )
}

/** Small line for one reliability KPI. */
const Sparkline = ({ label, kpi, data, color }) => {
  const theme = useTheme()

  const options = {
    chart: { sparkline: { enabled: true } },
    colors: [color],
    stroke: { width: 2.5 },
    markers: { size: 3 },
    tooltip: { x: { show: false }, y: { title: { formatter: () => '' } } },
    xaxis: { categories: data.map(row => row.label) }
  }
  const values = data.map(row => row.value)

  return (
    <Box sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <StatusMark kpi={kpi} size='1rem' />
      </Box>
      <Typography variant='h5' sx={{ fontWeight: 700, color: kpi?.value == null ? 'text.disabled' : 'primary.main' }}>
        {formatKpiValue(kpi)}
      </Typography>
      {hasValue(values) ? (
        <ReactApexcharts type='line' height={60} options={options} series={[{ name: label, data: values }]} />
      ) : (
        <Typography variant='caption' sx={{ color: 'text.disabled', display: 'block', mt: 2 }}>
          No monthly data yet
        </Typography>
      )}
    </Box>
  )
}

/** PA, MTBF, MTTR month by month. */
export const ReliabilityTrend = ({ trend, kpis, onDetail }) => {
  const theme = useTheme()

  const items = [
    { label: 'PA / Availability', code: 'PA_AVAILABILITY', key: 'pa', color: theme.palette.success.main },
    { label: 'MTBF', code: 'MTBF', key: 'mtbf', color: theme.palette.success.main },
    { label: 'MTTR', code: 'MTTR', key: 'mttr', color: theme.palette.primary.main }
  ]

  return (
    <Panel
      title='Reliability Trend'
      readiness={readinessOf(items.map(item => kpis[item.code]))}
      readinessNote='PA = calendar hours × active units minus finding downtime; MTBF needs hour meter readings in the period'
      action={<DetailButton onClick={onDetail} label='By unit' />}
    >
      <Grid container spacing={2} sx={{ flex: 1 }}>
        {items.map(item => (
          <Grid item xs={12} sm={4} key={item.code}>
            <Sparkline
              label={item.label}
              kpi={kpis[item.code]}
              color={item.color}
              data={trend.map(row => ({ label: row.label, value: row[item.key] }))}
            />
          </Grid>
        ))}
      </Grid>
    </Panel>
  )
}
