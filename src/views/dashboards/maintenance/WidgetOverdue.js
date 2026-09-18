/**
 * Widget: Remaining (Plan − Actual) + % of plan. Data from GET /api/dashboard/stats.
 */
import CardStatsVertical from 'src/@core/components/card-statistics/card-stats-vertical'

const WidgetSelisihBelum = ({ data, loading }) => {
  const selisih = data?.selisihBelum ?? 0
  const totalPlan = data?.totalPlanThisMonth ?? 0
  const persenRemaining = totalPlan > 0 ? Math.round((selisih / totalPlan) * 1000) / 10 : null
  const value = loading ? '—' : selisih.toLocaleString()

  const chipText = loading
    ? '...'
    : persenRemaining != null
    ? `${Number(persenRemaining).toFixed(1)}% of plan`
    : selisih > 0
    ? 'Action required'
    : 'Complete'
  
return (
    <CardStatsVertical
      stats={value}
      title='Remaining'
      subtitle='Plan − Actual (not yet realized)'
      chipText={chipText}
      chipColor='error'
      avatarColor='error'
      avatarIcon='tabler:alert-circle' // Ganti icon: "alert-circle" lebih mewakili status overdue atau action needed
      avatarSize={36}
      iconSize='1.25rem'
      sx={{
        '& .MuiCardContent-root': { py: 2, px: 2.5 },
        '& .MuiTypography-h5': { fontSize: '1rem', fontWeight: 600 },
        '& .MuiTypography-body2': { fontSize: '0.75rem' },
        '& .MuiChip-root': { fontSize: '0.7rem' }
      }}
    />
  )
}

export default WidgetSelisihBelum
