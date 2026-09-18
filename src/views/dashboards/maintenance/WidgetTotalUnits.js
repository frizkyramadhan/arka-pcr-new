/**
 * Widget: Total Unit. Data from GET /api/dashboard/stats (totalUnits). Compact layout.
 */
import CardStatsVertical from 'src/@core/components/card-statistics/card-stats-vertical'

const CARD_SX = {
  '& .MuiCardContent-root': { py: 2, px: 2.5 },
  '& .MuiTypography-h5': { fontSize: '1rem', fontWeight: 600 },
  '& .MuiTypography-body2': { fontSize: '0.75rem' },
  '& .MuiChip-root': { fontSize: '0.7rem' }
}

const WidgetTotalUnits = ({ data, loading }) => {
  const totalUnits = data?.totalUnits ?? 0
  const value = loading ? '—' : totalUnits.toLocaleString()
  
return (
    <CardStatsVertical
      stats={value}
      title="Total Unit"
      subtitle="Active (synced from ARKFleet)"
      chipText={loading ? '...' : 'Unit'}
      chipColor="primary"
      avatarColor="primary"
      avatarIcon="tabler:truck"
      avatarSize={36}
      iconSize="1.25rem"
      sx={CARD_SX}
    />
  )
}

export default WidgetTotalUnits
