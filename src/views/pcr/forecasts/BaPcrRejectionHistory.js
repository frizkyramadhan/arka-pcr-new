/**
 * Riwayat reject BA PCR — ditampilkan di card BA PCR & Execution pada detail forecast.
 */
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import CustomChip from 'src/@core/components/mui/chip'

import { formatDisplayDate } from 'src/utils/date-format'

const BaPcrRejectionHistory = ({ entries = [] }) => {
  if (!entries.length) return null

  const sorted = [...entries].sort((a, b) => {
    const aTime = Date.parse(a.rejectedAt) || 0
    const bTime = Date.parse(b.rejectedAt) || 0

    return bTime - aTime
  })

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        Riwayat Reject
      </Typography>
      {sorted.map((entry, index) => (
        <Box key={`${entry.rejectedAt}-${entry.level}-${index}`}>
          {index > 0 ? <Divider sx={{ my: 2 }} /> : null}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {formatDisplayDate(entry.rejectedAt)}
            </Typography>
            {entry.levelLabel ? (
              <CustomChip rounded skin='light' size='small' color='error' label={entry.levelLabel} />
            ) : entry.level ? (
              <CustomChip rounded skin='light' size='small' color='error' label={entry.level} />
            ) : null}
          </Box>
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
            {entry.noBaPcr ? `BA ${entry.noBaPcr}` : 'BA PCR'}
            {entry.submittedAt ? ` · submit ${formatDisplayDate(entry.submittedAt)}` : ''}
          </Typography>
          {entry.rejectedByName ? (
            <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              Ditolak oleh {entry.rejectedByName}
            </Typography>
          ) : null}
          {entry.note ? (
            <Typography variant='body2' sx={{ mt: 1, color: 'text.secondary' }}>
              {entry.note}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  )
}

export default BaPcrRejectionHistory
