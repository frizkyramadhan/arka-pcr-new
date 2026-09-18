/**
 * Widget: Total Actual + Persentase. Data dari GET /api/dashboard/stats (totalActualThisMonth, persenActual).
 */
import CardStatsVertical from 'src/@core/components/card-statistics/card-stats-vertical'

const WidgetTotalActual = ({ data, loading }) => {
  const totalActual = data?.totalActualThisMonth ?? 0
  const persen = data?.persenActual
  const value = loading ? '—' : totalActual.toLocaleString()

  const chipText =
    loading ? '...' : persen != null ? `${Number(persen).toFixed(1)}%` : 'N/A'
  
return (
    <CardStatsVertical
      stats={value}
      title="Total Actual"
      subtitle="Realized this month"
      chipText={chipText}
      chipColor="success"
      avatarColor="success"
      avatarIcon="tabler:check"
      avatarSize={36}
      iconSize="1.25rem"
      sx={{ '& .MuiCardContent-root': { py: 2, px: 2.5 }, '& .MuiTypography-h5': { fontSize: '1rem', fontWeight: 600 }, '& .MuiTypography-body2': { fontSize: '0.75rem' }, '& .MuiChip-root': { fontSize: '0.7rem' } }}
    />
  )
}

export default WidgetTotalActual
