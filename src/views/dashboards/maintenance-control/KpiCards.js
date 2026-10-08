/**
 * Top row of nine KPI cards (design order). Each card shows value, target, and a status mark;
 * cards without data are dimmed and say why on hover. Cards with a drill-down list open it on click.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'

import { DRILLDOWNS, formatKpiValue, formatTarget, kpiMark, MARKS, StatusMark } from './shared'

/** KPI code → card icon, in the order of the design. */
const CARDS = [
  { code: 'PM_COMPLIANCE', icon: 'tabler:calendar-event' },
  { code: 'ON_TIME_COMPLIANCE', icon: 'tabler:clock' },
  { code: 'BACKLOG_GT30', icon: 'tabler:clipboard-list' },
  { code: 'QC_PASS_RATE', icon: 'tabler:shield-check' },
  { code: 'FAILURE_CLOSURE', icon: 'tabler:circle-check' },
  { code: 'REPEAT_FAILURE', icon: 'tabler:refresh' },
  { code: 'MTBF', icon: 'tabler:clock-hour-4' },
  { code: 'MTTR', icon: 'tabler:tool' },
  { code: 'PA_AVAILABILITY', icon: 'tabler:chart-bar' }
]

const KpiCard = ({ kpi, icon, onDrill }) => {
  const mark = kpiMark(kpi)
  const missing = mark === 'noData' || mark === 'notBuilt'
  const clickable = Boolean(onDrill && kpi && DRILLDOWNS[kpi.code])
  const hint = [kpi?.note || kpi?.detail, clickable ? 'Click for the detail list' : null].filter(Boolean).join(' · ')

  return (
    <Tooltip title={hint} arrow placement='bottom'>
      <Card
        onClick={clickable ? () => onDrill(kpi.code) : undefined}
        sx={{
          p: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          borderTop: theme => `3px solid ${theme.palette[MARKS[mark].mui].main}`,
          opacity: missing ? 0.75 : 1,
          cursor: clickable ? 'pointer' : 'default',
          transition: 'box-shadow 0.2s, transform 0.2s',
          '&:hover': clickable ? { boxShadow: 6, transform: 'translateY(-2px)' } : undefined
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'primary.main' }}>
          <Icon icon={icon} fontSize='1.35rem' />
          <Typography variant='caption' sx={{ fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.2, flex: 1 }}>
            {kpi?.label}
          </Typography>
          {clickable && <Icon icon='tabler:list-search' fontSize='1rem' style={{ opacity: 0.6 }} />}
        </Box>
        <Typography variant='h4' sx={{ fontWeight: 700, color: missing ? 'text.disabled' : 'text.primary' }}>
          {formatKpiValue(kpi)}
        </Typography>
        <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {missing ? MARKS[mark].label : `Target ${formatTarget(kpi)}`}
          </Typography>
          <StatusMark kpi={kpi} />
        </Box>
      </Card>
    </Tooltip>
  )
}

/** `columns` fixes the grid (print page); otherwise it follows the screen width. */
const KpiCards = ({ kpis, onDrill, columns }) => (
  <Box
    sx={{
      display: 'grid',
      gap: columns ? 2 : 4,
      gridTemplateColumns: columns
        ? `repeat(${columns}, 1fr)`
        : { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)', xl: 'repeat(9, 1fr)' }
    }}
  >
    {CARDS.map(card => (
      <KpiCard key={card.code} kpi={kpis?.[card.code]} icon={card.icon} onDrill={onDrill} />
    ))}
  </Box>
)

export default KpiCards
