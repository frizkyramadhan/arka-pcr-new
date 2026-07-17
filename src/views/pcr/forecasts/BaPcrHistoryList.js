/**
 * Riwayat BA PCR sebelumnya (non-aktif) — ditampilkan di card BA PCR & Execution.
 */
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import CustomChip from 'src/@core/components/mui/chip'

import { formatDisplayDate } from 'src/utils/date-format'

const statusColor = status => {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'error'
  if (status === 'SUBMITTED' || status === 'IN_REVIEW') return 'warning'

  return 'secondary'
}

const BaPcrHistoryList = ({ entries = [] }) => {
  const history = entries.filter(row => !row.isActive)
  if (!history.length) return null

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        Previous BA PCR History
      </Typography>
      {history.map((entry, index) => (
        <Box key={entry.idBaPcr}>
          {index > 0 ? <Divider sx={{ my: 2 }} /> : null}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.75 }}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {entry.noBaPcr ?? `BA #${entry.idBaPcr}`}
            </Typography>
            <CustomChip
              rounded
              skin='light'
              size='small'
              color={statusColor(entry.baPcrStatus)}
              label={entry.baPcrStatus}
            />
          </Box>
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
            Submit {formatDisplayDate(entry.baSubmittedAt ?? entry.baPcrDate)}
            {entry.statusBaPcr ? ` · ${entry.statusBaPcr}` : ''}
          </Typography>
          {entry.rejectedAt ? (
            <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              Reject {formatDisplayDate(entry.rejectedAt)}
            </Typography>
          ) : null}
        </Box>
      ))}
    </Box>
  )
}

export default BaPcrHistoryList
