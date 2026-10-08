/**
 * Table panels for the Fundamental Maintenance Control dashboard:
 * KPI Control by Category (four coloured tables), Top 10 Maintenance Issues, Program Performance Detail.
 */
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'

import {
  DetailButton,
  DRILLDOWNS,
  EmptyState,
  formatKpiValue,
  formatTarget,
  markFromColor,
  Panel,
  readinessOf,
  StatusMark,
  statusColor
} from './shared'

/** The four control categories from the design, with their KPI codes. */
const CATEGORIES = [
  {
    title: 'Execution Control',
    color: '#2F6FED',
    codes: ['PM_COMPLIANCE', 'ON_TIME_COMPLIANCE', 'SCHEDULE_ADHERENCE', 'OVERDUE_MAINTENANCE']
  },
  {
    title: 'Backlog Control',
    color: '#F28C28',
    codes: ['TOTAL_BACKLOG', 'BACKLOG_0_7', 'BACKLOG_8_14', 'BACKLOG_15_30', 'BACKLOG_GT30', 'CRITICAL_BACKLOG']
  },
  {
    title: 'Quality Control',
    color: '#7B3FE4',
    codes: ['QC_PASS_RATE', 'REPEAT_FINDING', 'FAILURE_CLOSURE', 'CRITICAL_FAILURE']
  },
  {
    title: 'Reliability / Effectiveness',
    color: '#17A2B8',
    codes: ['PA_AVAILABILITY', 'MTBF', 'MTTR', 'REPEAT_FAILURE', 'FAILURE_FREQUENCY']
  }
]

const cellSx = { py: 1.25, px: 2, fontSize: '0.8rem' }
const headSx = { ...cellSx, fontWeight: 700, whiteSpace: 'nowrap' }

const CategoryTable = ({ category, kpis, onDrill }) => {
  const rows = category.codes.map(code => kpis[code]).filter(Boolean)

  return (
    <Box sx={{ border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1, overflow: 'hidden', height: '100%' }}>
      <Box sx={{ px: 3, py: 2, bgcolor: category.color, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant='body2' sx={{ color: 'common.white', fontWeight: 700, textTransform: 'uppercase', flex: 1 }}>
          {category.title}
        </Typography>
        <Box sx={{ bgcolor: 'common.white', borderRadius: 4, px: 1, display: 'flex' }}>
          <StatusMark mark={{ live: 'met', partial: 'near', empty: 'noData' }[readinessOf(rows)]} size='1rem' />
        </Box>
      </Box>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>KPI</TableCell>
              <TableCell sx={headSx} align='right'>
                Actual
              </TableCell>
              <TableCell sx={headSx} align='right'>
                Target
              </TableCell>
              <TableCell sx={headSx} align='center'>
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(kpi => {
              const clickable = Boolean(onDrill && DRILLDOWNS[kpi.code])

              return (
              <TableRow
                key={kpi.code}
                hover={clickable}
                onClick={clickable ? () => onDrill(kpi.code) : undefined}
                sx={{ cursor: clickable ? 'pointer' : 'default' }}
              >
                <TableCell sx={cellSx}>
                  <Tooltip title={[kpi.detail, clickable ? 'Click for the detail list' : null].filter(Boolean).join(' · ')} arrow>
                    <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      {kpi.label}
                      {clickable && <Icon icon='tabler:list-search' fontSize='0.85rem' style={{ opacity: 0.5 }} />}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ ...cellSx, fontWeight: 600 }} align='right'>
                  {formatKpiValue(kpi)}
                </TableCell>
                <TableCell sx={{ ...cellSx, color: 'text.secondary' }} align='right'>
                  {formatTarget(kpi)}
                </TableCell>
                <TableCell sx={cellSx} align='center'>
                  <StatusMark kpi={kpi} size='1.1rem' />
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export const KpiCategoryTables = ({ kpis, onDrill }) => {
  const all = CATEGORIES.flatMap(category => category.codes.map(code => kpis[code]).filter(Boolean))

  return (
    <Panel
      title='KPI Control by Category'
      readiness={readinessOf(all)}
      readinessNote='Hover a status icon to see why a KPI has no data or is not built yet. Click a KPI row for its detail list.'
    >
      <Grid container spacing={3}>
        {CATEGORIES.map(category => (
          <Grid item xs={12} md={6} key={category.title}>
            <CategoryTable category={category} kpis={kpis} onDrill={onDrill} />
          </Grid>
        ))}
      </Grid>
    </Panel>
  )
}

/** Trend arrow: more findings than the previous window is bad. */
const TREND = {
  up: { icon: 'tabler:arrow-up', color: 'error.main', label: 'More than previous period' },
  down: { icon: 'tabler:arrow-down', color: 'success.main', label: 'Fewer than previous period' },
  flat: { icon: 'tabler:minus', color: 'warning.main', label: 'Same as previous period' }
}

export const TopIssues = ({ issues, mode }) => (
  <Panel
    title='Top 10 Maintenance Issues'
    readiness={issues.length ? 'live' : 'empty'}
    readinessNote={`Findings grouped by SAP component and damage; trend vs ${mode === 'YTD' ? 'same months last year' : 'previous month'}`}
  >
    {issues.length ? (
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>No</TableCell>
              <TableCell sx={headSx}>Issue</TableCell>
              <TableCell sx={headSx} align='center'>
                Frequency
              </TableCell>
              <TableCell sx={headSx} align='center'>
                Trend
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {issues.map((issue, index) => (
              <TableRow key={issue.label}>
                <TableCell sx={cellSx}>{index + 1}</TableCell>
                <TableCell sx={cellSx}>{issue.label}</TableCell>
                <TableCell sx={{ ...cellSx, fontWeight: 600 }} align='center'>
                  {issue.frequency}
                </TableCell>
                <TableCell sx={cellSx} align='center'>
                  <Tooltip title={`${TREND[issue.trend].label} (${issue.previous})`} arrow>
                    <Box component='span' sx={{ color: TREND[issue.trend].color, display: 'inline-flex' }}>
                      <Icon icon={TREND[issue.trend].icon} fontSize='1.1rem' />
                    </Box>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    ) : (
      <EmptyState text='No findings recorded in this period' />
    )}
  </Panel>
)

/** Number with a coloured dot from the matching KPI target. */
const DotValue = ({ value, rate, target, suffix = '' }) => {
  const color = statusColor(rate, target)

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {color ? <StatusMark mark={markFromColor(color)} size='0.95rem' /> : null}
      <span>{value == null ? '—' : `${value}${suffix}`}</span>
    </Box>
  )
}

export const ProgramDetailTable = ({ programs, kpis, title, onSelectProgram, selectedProgramId, onDetail }) => {
  const overdueRate = row => (row.due > 0 ? Math.round((row.overdue / row.due) * 1000) / 10 : null)

  return (
    <Panel
      title={title}
      readiness={programs.length ? 'live' : 'empty'}
      readinessNote='Dots use the PM Compliance, On-Time, and Overdue targets. Click a row to filter by that program.'
      action={<DetailButton onClick={onDetail} label='By site' />}
    >
      {programs.length ? (
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                {['Program', 'Plan', 'Actual', 'Achv.', 'On-Time', 'Overdue', 'Finding', 'Closed', 'Closure Rate', 'Repeat'].map(
                  label => (
                    <TableCell key={label} sx={headSx} align={label === 'Program' ? 'left' : 'right'}>
                      {label}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {programs.map(row => (
                <TableRow
                  key={row.typeId}
                  hover={Boolean(onSelectProgram)}
                  selected={row.typeId === selectedProgramId}
                  onClick={() => onSelectProgram?.(row.typeId)}
                  sx={{ cursor: onSelectProgram ? 'pointer' : 'default' }}
                >
                  <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{row.name}</TableCell>
                  <TableCell sx={cellSx} align='right'>
                    {row.plan}
                  </TableCell>
                  <TableCell sx={cellSx} align='right'>
                    {row.actual}
                  </TableCell>
                  <TableCell sx={cellSx} align='right'>
                    <DotValue value={row.achievement} rate={row.achievement} target={kpis.PM_COMPLIANCE?.target} suffix='%' />
                  </TableCell>
                  <TableCell sx={cellSx} align='right'>
                    <DotValue value={row.onTime} rate={row.onTimeRate} target={kpis.ON_TIME_COMPLIANCE?.target} />
                  </TableCell>
                  <TableCell sx={cellSx} align='right'>
                    <DotValue value={row.overdue} rate={overdueRate(row)} target={kpis.OVERDUE_MAINTENANCE?.target} />
                  </TableCell>
                  <TableCell sx={cellSx} align='right'>
                    {row.findings}
                  </TableCell>
                  <TableCell sx={cellSx} align='right'>
                    {row.closed}
                  </TableCell>
                  <TableCell sx={cellSx} align='right'>
                    {row.closureRate == null ? '—' : `${row.closureRate}%`}
                  </TableCell>
                  <TableCell sx={cellSx} align='right'>
                    {row.repeatRate == null ? '—' : `${row.repeatRate}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState text='No plan rows or findings in this period' />
      )}
    </Panel>
  )
}
