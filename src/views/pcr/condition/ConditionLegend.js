/**
 * Legend for component condition — overall levels and source ratings.
 */
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import OverallConditionChip from 'src/views/pcr/condition/OverallConditionChip'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'

const ConditionLegend = ({ compact = false }) => (
  <Stack spacing={compact ? 1.5 : 2}>
    <Alert severity='info' icon={false} sx={{ py: compact ? 1 : 1.5, px: 2 }}>
      <Typography variant='caption' sx={{ display: 'block', fontWeight: 600, mb: 0.5 }}>
        Aturan agregasi
      </Typography>
      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
        Overall dihitung dari rating terbaru per sumber (SOS + 5 inspeksi). Jika ada data inspeksi, logic
        inspeksi yang dipakai — SOS diabaikan untuk overall.
      </Typography>
    </Alert>

    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: compact ? 1.5 : 2,
        alignItems: 'center'
      }}
    >
      <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.secondary', mr: 0.5 }}>
        Overall:
      </Typography>
      <OverallConditionChip condition='NORMAL' />
      <OverallConditionChip condition='ATTENTION' />
      <OverallConditionChip condition='CRITICAL' />
    </Box>

    {!compact ? (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.secondary', mr: 0.5 }}>
          Rating per sumber:
        </Typography>
        <SosRatingChip rating='A' />
        <SosRatingChip rating='B' />
        <SosRatingChip rating='C' />
        <SosRatingChip rating='X' />
      </Box>
    ) : null}
  </Stack>
)

export default ConditionLegend
