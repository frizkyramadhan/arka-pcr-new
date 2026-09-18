/**
 * Widget: Total Plan This Month. Data from GET /api/dashboard/stats (totalPlanThisMonth, meta).
 */
import CardStatsVertical from 'src/@core/components/card-statistics/card-stats-vertical'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const WidgetTotalPlanBulanIni = ({ data, loading }) => {
  const totalPlan = data?.totalPlanThisMonth ?? 0
  const meta = data?.meta

  const monthLabel =
    meta?.currentMonth != null && meta?.currentYear != null
      ? `${MONTHS[meta.currentMonth - 1]} ${meta.currentYear}`
      : 'This month'
  const value = loading ? '—' : totalPlan.toLocaleString()
  
return (
    <CardStatsVertical
      stats={value}
      title="Total Plan This Month"
      subtitle={`Planned · ${monthLabel}`}
      chipText={loading ? '...' : 'Plan'}
      chipColor="info"
      avatarColor="info"
      avatarIcon="tabler:calendar-event"
      avatarSize={36}
      iconSize="1.25rem"
      sx={{ '& .MuiCardContent-root': { py: 2, px: 2.5 }, '& .MuiTypography-h5': { fontSize: '1rem', fontWeight: 600 }, '& .MuiTypography-body2': { fontSize: '0.75rem' }, '& .MuiChip-root': { fontSize: '0.7rem' } }}
    />
  )
}

export default WidgetTotalPlanBulanIni
