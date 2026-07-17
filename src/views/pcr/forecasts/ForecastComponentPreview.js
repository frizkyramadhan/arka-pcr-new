/**
 * Ringkasan komponen saat create forecast — replacement terbaru, SOS, harga, life %.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import CustomChip from 'src/@core/components/mui/chip'

import { formatDisplayDate } from 'src/utils/date-format'

import LifePercentChip from 'src/views/pcr/forecasts/LifePercentChip'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'

const formatHm = value => {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)

  return Number.isFinite(num) ? num.toLocaleString('id-ID') : '—'
}

const formatPolicy = value => {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)

  return Number.isFinite(num) ? num.toLocaleString('id-ID') : '—'
}

const formatCurrency = value => {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num)
}

const InfoRow = ({ label, value, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, flexWrap: 'wrap' }}>
    <Typography variant='body2' sx={{ color: 'text.secondary', minWidth: 130, flexShrink: 0 }}>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ color: 'text.secondary', flexShrink: 0 }}>
      :
    </Typography>
    {children ?? (
      <Typography variant='body2' sx={{ fontWeight: 600 }}>
        {value || '—'}
      </Typography>
    )}
  </Box>
)

const ForecastComponentPreview = ({ preview, loading }) => {
  if (!loading && !preview) return null

  return (
    <Grid item xs={12}>
      <Card variant='outlined' sx={{ bgcolor: 'action.hover' }}>
        <CardContent sx={{ py: 3, '&:last-child': { pb: 3 } }}>
          <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
            Component Reference
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={20} />
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                Loading component data…
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
                  Latest Replacement
                </Typography>
                {preview.latestReplacement ? (
                  <>
                    <InfoRow label='Rep Date' value={formatDisplayDate(preview.latestReplacement.repDate)} />
                    <InfoRow label='HM Rep' value={formatHm(preview.latestReplacement.hmRep)} />
                    <InfoRow
                      label='WO Status'
                    >
                      <CustomChip
                        rounded
                        skin='light'
                        size='small'
                        label={preview.latestReplacement.woStatus}
                        color={preview.latestReplacement.woStatus === 'OPEN' ? 'info' : 'success'}
                      />
                    </InfoRow>
                    <InfoRow label='Life %'>
                      <LifePercentChip
                        value={
                          preview.latestReplacement.woStatus === 'CLOSE'
                            ? preview.latestReplacement.lifePercent
                            : preview.snapshot.lifePercent
                        }
                      />
                    </InfoRow>
                  </>
                ) : (
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    No replacement history for this component.
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
                  Latest SOS
                </Typography>
                {preview.latestSos ? (
                  <>
                    <InfoRow label='Sample Date' value={formatDisplayDate(preview.latestSos.sampleDate)} />
                    <InfoRow label='Rating'>
                      <SosRatingChip rating={preview.latestSos.evalCode} />
                    </InfoRow>
                    <InfoRow label='Lab No.' value={preview.latestSos.labNo} />
                    <InfoRow label='Snapshot Rating'>
                      <SosRatingChip rating={preview.snapshot.ratingSos} />
                    </InfoRow>
                  </>
                ) : (
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    No SOS record for this component.
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 1 }}>
                  Policy & Price
                </Typography>
                <InfoRow label='Policy (hrs)' value={formatPolicy(preview.component.policy)} />
                <InfoRow label='Price' value={formatCurrency(preview.component.price)} />
                <InfoRow label='HM Component' value={formatHm(preview.snapshot.hmComponent)} />
                <InfoRow label='Current Life %'>
                  <LifePercentChip value={preview.snapshot.lifePercent} />
                </InfoRow>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Grid>
  )
}

export default ForecastComponentPreview
