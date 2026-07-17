/**
 * Ringkasan BA cannibal untuk halaman review approval.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import { getCurrentCannibalFlowStage } from 'src/utils/cannibal-approval-workflow'
import { formatCannibalPairField } from 'src/utils/cannibal-list-display'

import BaStatusChip from 'src/views/pcr/cannibal/BaStatusChip'

const formatDate = value => (value ? String(value).slice(0, 10) : '—')

const SummaryItem = ({ label, value }) => (
  <Box>
    <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.25 }}>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 600 }}>
      {value || '—'}
    </Typography>
  </Box>
)

const CannibalApprovalDetailSummary = ({ ba }) => {
  if (!ba) return null

  return (
    <Card>
      <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <Typography variant='h6' sx={{ fontWeight: 700 }}>
            {ba.noBa ?? 'Cannibal BA'}
          </Typography>
          <BaStatusChip status={ba.statusBa} />
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={4} md={2}>
            <SummaryItem label='Project' value={ba.projectCode} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <SummaryItem label='Posting Date' value={formatDate(ba.postingDate)} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <SummaryItem label='Removed Unit' value={formatCannibalPairField(ba.pairs, 'remove', 'unitNo')} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <SummaryItem label='Installed Unit' value={formatCannibalPairField(ba.pairs, 'install', 'unitNo')} />
          </Grid>
          <Grid item xs={12} sm={8} md={4}>
            <SummaryItem label='Approval Stage' value={getCurrentCannibalFlowStage(ba)} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default CannibalApprovalDetailSummary
