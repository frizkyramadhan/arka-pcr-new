/**
 * Shared pieces for the Fundamental Maintenance Control dashboard:
 * KPI status marks (target met / near / not met / no data / not built), panel wrapper with a data readiness chip,
 * and value/target formatters. KPI objects come from GET /api/dashboard/maintenance-control.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'

/** How a KPI looks for each outcome. `mui` is the theme palette key. */
export const MARKS = {
  met: { icon: 'tabler:circle-check', mui: 'success', label: 'Target met' },
  near: { icon: 'tabler:alert-circle', mui: 'warning', label: 'Near target' },
  missed: { icon: 'tabler:circle-x', mui: 'error', label: 'Target not met' },
  monitor: { icon: 'tabler:info-circle', mui: 'info', label: 'Monitor only (no target)' },
  noData: { icon: 'tabler:circle-dashed', mui: 'secondary', label: 'No data yet' },
  notBuilt: { icon: 'tabler:ban', mui: 'secondary', label: 'Not built yet' }
}

const COLOR_TO_MARK = { green: 'met', yellow: 'near', red: 'missed' }

/** Mark key for a KPI from the API. */
export function kpiMark(kpi) {
  if (!kpi || kpi.state === 'not-built') return 'notBuilt'
  if (kpi.state === 'no-data') return 'noData'
  if (!kpi.target) return 'monitor'

  return COLOR_TO_MARK[kpi.color] ?? 'monitor'
}

/** Same rule as kpiStatusColor() on the server, for per-program cells. */
export function statusColor(value, target) {
  if (value == null || !target) return null
  const { targetValue, direction, yellowMargin } = target
  if (direction === 'HIGHER') return value >= targetValue ? 'green' : value >= targetValue - yellowMargin ? 'yellow' : 'red'
  if (direction === 'LOWER') return value <= targetValue ? 'green' : value <= targetValue + yellowMargin ? 'yellow' : 'red'

  return value <= targetValue ? 'green' : value <= targetValue + yellowMargin ? 'yellow' : 'red'
}

export const markFromColor = color => COLOR_TO_MARK[color] ?? 'noData'

const formatNumber = (value, digits = 1) =>
  Number(value).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 })

/** "7 Oct 2026, 11:45" in the browser's time zone, for the data refresh timestamps. */
export const formatDateTime = iso =>
  iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

/** Display value with its unit, or an em dash when there is none. */
export function formatKpiValue(kpi, { withUnit = true } = {}) {
  if (!kpi || kpi.value == null) return '—'
  if (kpi.unit === '%') return `${formatNumber(kpi.value)}${withUnit ? '%' : ''}`
  if (kpi.unit === 'hrs') return `${formatNumber(kpi.value)}${withUnit ? ' hrs' : ''}`

  return formatNumber(kpi.value, 0)
}

/** "≥95%", "≤12 hrs", "0" — or "-" for monitor-only KPIs. */
export function formatTarget(kpi) {
  const target = kpi?.target
  if (!target) return '-'
  const suffix = kpi.unit === '%' ? '%' : kpi.unit === 'hrs' ? ' hrs' : ''
  const value = `${formatNumber(target.targetValue)}${suffix}`
  if (target.direction === 'HIGHER') return `≥${value}`
  if (target.direction === 'LOWER') return `≤${value}`

  return value
}

/** Coloured status icon; hover explains the outcome and why data is missing. */
export function StatusMark({ kpi, mark: markKey, size = '1.25rem', showLabel = false }) {
  const key = markKey ?? kpiMark(kpi)
  const mark = MARKS[key]
  const reason = kpi?.note || kpi?.detail
  const title = reason ? `${mark.label} — ${reason}` : mark.label

  return (
    <Tooltip title={title} arrow>
      <Box
        component='span'
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: `${mark.mui}.main`, cursor: 'help' }}
      >
        <Icon icon={mark.icon} fontSize={size} />
        {showLabel && (
          <Typography variant='caption' sx={{ color: 'inherit', fontWeight: 600 }}>
            {mark.label}
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
}

/** Panel readiness: every input has data, some do, or none yet. */
export const READINESS = {
  live: { label: 'Live data', color: 'success', icon: 'tabler:circle-check' },
  partial: { label: 'Partly available', color: 'warning', icon: 'tabler:alert-circle' },
  empty: { label: 'No data yet', color: 'secondary', icon: 'tabler:circle-dashed' }
}

/** Readiness from a list of KPI marks: live when all have data, empty when none do. */
export function readinessOf(kpis) {
  const marks = kpis.map(kpiMark)
  const missing = marks.filter(mark => mark === 'noData' || mark === 'notBuilt').length
  if (missing === 0) return 'live'

  return missing === marks.length ? 'empty' : 'partial'
}

export function ReadinessChip({ readiness, note }) {
  const meta = READINESS[readiness]
  if (!meta) return null

  return (
    <Tooltip title={note || meta.label} arrow>
      <span>
        <CustomChip
          size='small'
          skin='light'
          color={meta.color}
          label={meta.label}
          icon={<Icon icon={meta.icon} fontSize='0.9rem' />}
          sx={{ cursor: 'help', '& .MuiChip-icon': { ml: 1 } }}
        />
      </span>
    </Tooltip>
  )
}

/** Card with title row (title, optional extra content, readiness chip). */
export function Panel({ title, readiness, readinessNote, action, children, sx }) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', ...sx }}>
      <Box sx={{ px: 4, pt: 3.5, pb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant='h6' sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
          {title}
        </Typography>
        {action}
        {readiness && <ReadinessChip readiness={readiness} note={readinessNote} />}
      </Box>
      <Box sx={{ px: 4, pb: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</Box>
    </Card>
  )
}

/**
 * KPI code → drill-down list (spec section 13). `kind` and `options` go to
 * GET /api/dashboard/maintenance-control/drilldown. KPIs not listed here have no list.
 */
export const DRILLDOWNS = {
  PM_COMPLIANCE: { kind: 'pm' },
  ON_TIME_COMPLIANCE: { kind: 'pm' },
  SCHEDULE_ADHERENCE: { kind: 'pm' },
  OVERDUE_MAINTENANCE: { kind: 'pm' },
  TOTAL_BACKLOG: { kind: 'backlog' },
  BACKLOG_0_7: { kind: 'backlog', options: { bucket: 'b0_7' } },
  BACKLOG_8_14: { kind: 'backlog', options: { bucket: 'b8_14' } },
  BACKLOG_15_30: { kind: 'backlog', options: { bucket: 'b15_30' } },
  BACKLOG_GT30: { kind: 'backlog', options: { bucket: 'gt30' } },
  CRITICAL_BACKLOG: { kind: 'findings', options: { severity: 'CRITICAL', open: true, overdue: true } },
  QC_PASS_RATE: { kind: 'qc' },
  REPEAT_FINDING: { kind: 'findings', options: { repeat: true } },
  FAILURE_CLOSURE: { kind: 'findings' },
  CRITICAL_FAILURE: { kind: 'findings', options: { severity: 'CRITICAL', open: true } },
  PA_AVAILABILITY: { kind: 'availability' },
  MTBF: { kind: 'reliability' },
  MTTR: { kind: 'reliability' },
  REPEAT_FAILURE: { kind: 'repeat-failure' },
  FAILURE_FREQUENCY: { kind: 'findings' }
}

/** Small "Detail" button for a panel header that opens a drill-down list. */
export function DetailButton({ onClick, label = 'Detail' }) {
  if (!onClick) return null

  return (
    <Tooltip title='Open the detail list' arrow>
      <CustomChip
        size='small'
        skin='light'
        color='primary'
        label={label}
        icon={<Icon icon='tabler:list-search' fontSize='0.9rem' />}
        onClick={onClick}
        sx={{ cursor: 'pointer', '& .MuiChip-icon': { ml: 1 } }}
      />
    </Tooltip>
  )
}

/** Centered placeholder when a panel has nothing to draw. */
export function EmptyState({ text }) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 1,
        color: 'text.disabled',
        border: theme => `1px dashed ${theme.palette.divider}`,
        borderRadius: 1
      }}
    >
      <Icon icon='tabler:circle-dashed' fontSize='1.75rem' />
      <Typography variant='body2' sx={{ color: 'text.secondary', textAlign: 'center', px: 4 }}>
        {text}
      </Typography>
    </Box>
  )
}
