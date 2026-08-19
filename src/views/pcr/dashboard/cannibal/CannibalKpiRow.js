/**
 * Cannibal dashboard KPI row — pipeline + YTD achievement.
 */

import Grid from '@mui/material/Grid'

import CompactKpiCard from '../CompactKpiCard'
import { formatAchievement, getAchievementColor } from '../achievementColor'

/**
 * @param {{
 *   loading?: boolean
 *   stats: object | null
 *   ytdAch: number | null | undefined
 * }} props
 */
const CannibalKpiRow = ({ loading = false, stats, ytdAch }) => {
  const counts = stats?.statusCounts ?? {}
  const achColor = getAchievementColor(ytdAch) ?? 'secondary'

  const cards = [
    {
      stats: String(counts.totalActive ?? 0),
      title: 'Total BA',
      description: 'Non-cancelled BA in selected posting year (legacy CLOSE/CANCEL normalized)',
      avatarIcon: 'tabler:files',
      avatarColor: 'primary'
    },
    {
      stats: String(counts.draft ?? 0),
      title: 'Draft',
      description: 'Plant drafting / not yet submitted to logistics',
      avatarIcon: 'tabler:file-pencil',
      avatarColor: 'secondary'
    },
    {
      stats: String(counts.pendingLogistics ?? 0),
      title: 'Logistics',
      description: 'Waiting for logistic statement confirmation',
      avatarIcon: 'tabler:truck-delivery',
      avatarColor: 'info'
    },
    {
      stats: String(counts.pendingDocument ?? 0),
      title: 'Documentation',
      description: 'MR/PR + WO/documentation before approval',
      avatarIcon: 'tabler:file-description',
      avatarColor: 'info'
    },
    {
      stats: String(counts.inApproval ?? 0),
      title: 'In Approval',
      description: 'Awaiting approval — excludes legacy OPEN already L1–L3 approved',
      avatarIcon: 'tabler:checkbox',
      avatarColor: 'warning'
    },
    {
      stats: String(counts.approved ?? 0),
      title: 'Ready to Close',
      description: 'Fully approved — plant may close the BA',
      avatarIcon: 'tabler:circle-check',
      avatarColor: 'success'
    },
    {
      stats: formatAchievement(ytdAch),
      title: 'YTD Ach',
      description: 'Closed / Total — CLOSED/CLOSE + legacy OPEN with L1–L3 approved',
      avatarIcon: 'tabler:trophy',
      avatarColor: achColor
    }
  ]

  return (
    <>
      {cards.map(card => (
        <Grid item xs={6} sm={4} md={3} key={card.title}>
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

export default CannibalKpiRow
