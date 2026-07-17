/**
 * Prominent approve / reject card for BA PCR reviewers — sequential flow aware.
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'

import { formatDisplayDate } from 'src/utils/date-format'
import { FORECAST_APPROVAL_LEVEL_LABELS } from 'src/utils/forecast-approval-auth'
import { getForecastFlowStageLabel } from 'src/utils/forecast-approval-workflow'
import { formatPlanPeriodMonthYear } from 'src/utils/forecast-plan-period'

import LifePercentChip from 'src/views/pcr/forecasts/LifePercentChip'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'

const formatHm = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return num.toLocaleString('id-ID')
}

const formatCurrency = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num)
}

const SummaryRow = ({ label, children }) => (
  <Grid item xs={6}>
    <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
      {label}
    </Typography>
    {typeof children === 'string' || typeof children === 'number' ? (
      <Typography variant='body2' sx={{ fontWeight: 600 }}>
        {children}
      </Typography>
    ) : (
      children
    )}
  </Grid>
)

const FlowStageBanner = ({ label }) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        mb: 3,
        p: 2.5,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.info.main, 0.06),
        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
      }}
    >
      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        Tahap approval saat ini
      </Typography>
      <Typography variant='body2' sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  )
}

const ForecastApprovalActionCard = ({
  forecast,
  pendingApproval,
  onApprove,
  onReject,
  loading = false
}) => {
  const theme = useTheme()

  if (!forecast) return null

  const compDesc = forecast.compDesc ?? forecast.commod?.comp?.compDesc ?? '—'
  const submitter = forecast.submitter?.fullName || forecast.submitter?.username || '—'
  const flowStageLabel = getForecastFlowStageLabel(forecast)
  const levelLabel = pendingApproval
    ? FORECAST_APPROVAL_LEVEL_LABELS[pendingApproval.level] ?? pendingApproval.level
    : null

  if (!pendingApproval) {
    return (
      <Card>
        <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.info.main, 0.12),
                color: 'info.main'
              }}
            >
              <Icon icon='tabler:eye' fontSize='1.4rem' />
            </Box>
            <Box>
              <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                Review Only
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                Belum giliran approval Anda — menunggu tahap sebelumnya
              </Typography>
            </Box>
          </Box>
          <FlowStageBanner label={flowStageLabel} />
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Tombol approve/reject akan muncul ketika approval sudah sampai pada level Anda.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      sx={{
        border: theme => `2px solid ${alpha(theme.palette.warning.main, 0.45)}`,
        bgcolor: theme => alpha(theme.palette.warning.main, 0.04)
      }}
    >
      <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box>
            <Typography variant='overline' sx={{ color: 'warning.main', fontWeight: 700 }}>
              Action Required
            </Typography>
            <Typography variant='h6' sx={{ fontWeight: 700, mt: 0.5 }}>
              Approve or Reject BA PCR
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
              Giliran Anda: {levelLabel} ({pendingApproval.level})
            </Typography>
          </Box>
          <CustomChip rounded skin='light' color='warning' label={pendingApproval.level} />
        </Box>

        <FlowStageBanner label={flowStageLabel} />

        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <SummaryRow label='Unit / Model'>
            {forecast.unitNo} · {forecast.modelName || '—'}
          </SummaryRow>
          <SummaryRow label='Component'>{compDesc}</SummaryRow>
          <SummaryRow label='Site'>{forecast.projectCode}</SummaryRow>
          <SummaryRow label='Plan Period'>{formatPlanPeriodMonthYear(forecast.planPeriod)}</SummaryRow>
          <SummaryRow label='Quarter'>{forecast.quarter}</SummaryRow>
          <SummaryRow label='HM / Policy'>
            {formatHm(forecast.hmComponent)} / {formatHm(forecast.policy)} jam
          </SummaryRow>
          <SummaryRow label='Life Time'>
            <LifePercentChip value={forecast.lifePercent} />
          </SummaryRow>
          <SummaryRow label='Rating S.O.S'>
            <SosRatingChip rating={forecast.ratingSos} />
          </SummaryRow>
          <SummaryRow label='Price Component'>{formatCurrency(forecast.priceComponent)}</SummaryRow>
          <SummaryRow label='Submitted By'>{submitter}</SummaryRow>
          <Grid item xs={12}>
            <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Submitted At
            </Typography>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {formatDisplayDate(forecast.baSubmittedAt)}
            </Typography>
          </Grid>
          {forecast.remark ? (
            <Grid item xs={12}>
              <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                Remark
              </Typography>
              <Typography variant='body2'>{forecast.remark}</Typography>
            </Grid>
          ) : null}
        </Grid>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Button
            variant='contained'
            color='success'
            size='large'
            startIcon={<Icon icon='tabler:check' />}
            disabled={loading}
            onClick={() => onApprove?.(pendingApproval)}
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' } }}
          >
            Approve
          </Button>
          <Button
            variant='tonal'
            color='error'
            size='large'
            startIcon={<Icon icon='tabler:x' />}
            disabled={loading}
            onClick={() => onReject?.(pendingApproval)}
            sx={{ flex: { xs: '1 1 100%', sm: '1 1 auto' } }}
          >
            Reject
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

export default ForecastApprovalActionCard
