/**
 * Kartu ringkasan atas halaman detail forecast — status, life %, metrik utama.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'

import { formatDisplayDate } from 'src/utils/date-format'
import { formatPlanPeriodMonthYear } from 'src/utils/forecast-plan-period'

import LifeProgressBar from 'src/views/pcr/replacements/LifeProgressBar'
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

const MetricTile = ({ icon, label, value, children, accent }) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 2,
        border: theme => `1px solid ${theme.palette.divider}`,
        bgcolor: accent ? alpha(accent, 0.08) : 'background.paper'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: accent ? alpha(accent, 0.16) : alpha(theme.palette.primary.main, 0.08),
            color: accent ?? 'primary.main'
          }}
        >
          <Icon icon={icon} fontSize='1.25rem' />
        </Box>
        <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 500, textTransform: 'uppercase' }}>
          {label}
        </Typography>
      </Box>
      {children ?? (
        <Typography variant='h6' sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {value}
        </Typography>
      )}
    </Box>
  )
}

const ForecastDetailSummary = ({ forecast }) => {
  const theme = useTheme()

  if (!forecast) return null

  const compDesc = forecast.compDesc ?? forecast.commod?.comp?.compDesc ?? '—'
  const lifePercent = Number(forecast.lifePercent ?? 0)
  const lifeColor =
    lifePercent >= 100 ? theme.palette.error.main : lifePercent >= 85 ? theme.palette.warning.main : theme.palette.success.main

  // RUL by AI (regresi) — info tambahan, tidak menggantikan lifePercent/HM Component di atas.
  const hasRulEstimate = Boolean(forecast.rulEstimatedDate)

  return (
    <Card>
      <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 3, mb: 4 }}>
          <Box>
            <Typography variant='overline' sx={{ color: 'text.secondary', letterSpacing: 1 }}>
              PCR Forecast
            </Typography>
            <Typography variant='h5' sx={{ fontWeight: 700, mt: 0.5 }}>
              {forecast.unitNo} · {compDesc}
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
              {forecast.modelName} · Site {forecast.projectCode} · {forecast.quarter} · Plan{' '}
              {formatPlanPeriodMonthYear(forecast.planPeriod)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <CustomChip
              rounded
              skin='light'
              label={forecast.status}
              color={forecast.status === 'OPEN' ? 'info' : 'success'}
            />
            <CustomChip
              rounded
              skin='light'
              label={`BA: ${forecast.baPcrStatus}`}
              color={
                forecast.baPcrStatus === 'APPROVED'
                  ? 'success'
                  : forecast.baPcrStatus === 'REJECTED'
                    ? 'error'
                    : 'warning'
              }
            />
            {forecast.statusBaPcr ? (
              <CustomChip rounded skin='light' label={forecast.statusBaPcr} color='secondary' />
            ) : null}
          </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
              Component Life
            </Typography>
            <Typography variant='subtitle2' sx={{ fontWeight: 700, color: lifeColor }}>
              {lifePercent.toFixed(1)}%
            </Typography>
          </Box>
          <LifeProgressBar percent={lifePercent} showLabel={false} />
          <Typography variant='caption' sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
            HM {formatHm(forecast.hmComponent)} / Policy {formatHm(forecast.policy)} jam
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={6} sm={2.4}>
            <MetricTile icon='tabler:gauge' label='HM Component' value={formatHm(forecast.hmComponent)} />
          </Grid>
          <Grid item xs={6} sm={2.4}>
            <MetricTile icon='tabler:calendar-event' label='Plan Period' value={formatPlanPeriodMonthYear(forecast.planPeriod)} />
          </Grid>
          <Grid item xs={6} sm={2.4}>
            <MetricTile icon='tabler:droplet' label='SOS Rating'>
              <SosRatingChip rating={forecast.ratingSos} />
            </MetricTile>
          </Grid>
          <Grid item xs={6} sm={2.4}>
            <MetricTile
              icon='tabler:currency-dollar'
              label='Price'
              value={formatCurrency(forecast.priceComponent)}
              accent={theme.palette.success.main}
            />
          </Grid>
          <Grid item xs={12} sm={2.4}>
            <MetricTile icon='tabler:sparkles' label='RUL Estimate (AI)' accent={theme.palette.info.main}>
              {hasRulEstimate ? (
                <Tooltip title='Estimasi berbasis tren regresi HM, gunakan sebagai referensi tambahan — tidak menggantikan Life % / Next Replacement Date.'>
                  <Box>
                    <Typography variant='h6' sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {formatDisplayDate(forecast.rulEstimatedDate)}
                    </Typography>
                    {forecast.rulConfidenceLowDate && forecast.rulConfidenceHighDate ? (
                      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
                        Range: {formatDisplayDate(forecast.rulConfidenceLowDate)} – {formatDisplayDate(forecast.rulConfidenceHighDate)}
                      </Typography>
                    ) : null}
                    {forecast.rulRecommendedProcurementDate ? (
                      <Typography variant='caption' sx={{ color: 'warning.main', display: 'block', fontWeight: 600 }}>
                        Rekomendasi mulai PR: {formatDisplayDate(forecast.rulRecommendedProcurementDate)}
                      </Typography>
                    ) : null}
                  </Box>
                </Tooltip>
              ) : (
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  Data HM belum cukup
                </Typography>
              )}
            </MetricTile>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default ForecastDetailSummary
