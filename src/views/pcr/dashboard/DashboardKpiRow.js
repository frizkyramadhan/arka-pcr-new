/**
 * Dashboard KPI row — 6 operational / achievement cards.
 */

import Grid from '@mui/material/Grid'

import CompactKpiCard from './CompactKpiCard'
import { formatAchievement, getAchievementColor } from './achievementColor'

/**
 * @param {{
 *   loading?: boolean
 *   stats: object | null
 *   ytdAch: number | null | undefined
 * }} props
 */
const DashboardKpiRow = ({ loading = false, stats, ytdAch }) => {
  const achColor = getAchievementColor(ytdAch) ?? 'secondary'
  const pendingTotal =
    stats?.totals?.pendingApprovals ??
    (stats?.cannibalAwaitingApproval ?? 0) +
      Object.values(stats?.pendingPcrApprovals ?? {}).reduce((sum, n) => sum + n, 0)

  const cards = [
    {
      stats: String(stats?.totals?.equipment ?? 0),
      title: 'Equipment',
      description: 'Units in Fleet cache',
      avatarIcon: 'tabler:truck',
      avatarColor: 'primary'
    },
    {
      stats: String(stats?.totals?.openForecasts ?? 0),
      title: 'Open Forecasts',
      description: 'Active PCR plans (forecast OPEN)',
      avatarIcon: 'tabler:chart-dots',
      avatarColor: 'info'
    },
    {
      stats: String(stats?.totals?.openReplacements ?? 0),
      title: 'Open WO',
      description: 'Active work orders (WO OPEN)',
      avatarIcon: 'tabler:tool',
      avatarColor: 'warning'
    },
    {
      stats: formatAchievement(ytdAch),
      title: 'YTD Ach PCR',
      description: 'Year-to-date achievement — Close / Total plan',
      avatarIcon: 'tabler:trophy',
      avatarColor: achColor
    },
    {
      stats: String(stats?.criticalComponents?.length ?? 0),
      title: 'Critical',
      description: 'Components with life ≥ 85% — need attention',
      avatarIcon: 'tabler:alert-triangle',
      avatarColor: 'error'
    },
    {
      stats: String(pendingTotal),
      title: 'Pending Approvals',
      description: 'PCR forecast + Cannibal BA approval queue',
      avatarIcon: 'tabler:file-certificate',
      avatarColor: 'secondary'
    }
  ]

  return (
    <>
      {cards.map(card => (
        <Grid item xs={6} sm={4} md={2} key={card.title}>
          <CompactKpiCard
            title={card.title}
            stats={loading ? '…' : card.stats}
            description={card.description}
            avatarIcon={card.avatarIcon}
            avatarColor={card.avatarColor}
          />
        </Grid>
      ))}
    </>
  )
}

export default DashboardKpiRow
