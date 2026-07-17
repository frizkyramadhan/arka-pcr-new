/**
 * Replacement Detail — unit + component summary (split section cards).
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'

import { formatDisplayDate } from 'src/utils/date-format'

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

const formatComponentDesc = component => {
  const desc = component?.compDesc
  const type = component?.compType

  if (!desc) return '—'
  if (!type) return desc

  return `${desc} (${type})`
}

const InfoItem = ({ label, value, children }) => (
  <Grid item xs={12} sm={6}>
    <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
      {label}
    </Typography>
    {children ?? (
      <Typography variant='body2' sx={{ fontWeight: 600 }}>
        {value || '—'}
      </Typography>
    )}
  </Grid>
)

const SectionCard = ({ icon, title, subtitle, children }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: { xs: 4, sm: 5 }, '&:last-child': { pb: { xs: 4, sm: 5 } } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: theme => `${theme.palette.primary.main}14`,
            color: 'primary.main'
          }}
        >
          <Icon icon={icon} fontSize='1.35rem' />
        </Box>
        <Box>
          <Typography variant='subtitle1' sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Box>
      <Grid container spacing={2.5}>
        {children}
      </Grid>
    </CardContent>
  </Card>
)

const ReplacementDetailInfo = ({ unit, component, latestHmUnit, latestHmDate }) => (
  <Grid container spacing={4}>
    <Grid item xs={12} md={6}>
      <SectionCard icon='tabler:truck' title='Unit' subtitle='Equipment identity and operating hours'>
        <InfoItem label='Unit No.' value={unit?.unitNo} />
        <InfoItem label='Site / Project' value={unit?.projectCode} />
        <InfoItem label='Model' value={unit?.model} />
        <InfoItem label='Description' value={unit?.description} />
        <InfoItem label='Latest HM'>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {formatHm(latestHmUnit)}
            {latestHmDate ? (
              <Typography component='span' variant='body2' sx={{ color: 'text.secondary', fontWeight: 400 }}>
                {' '}
                · {formatDisplayDate(latestHmDate)}
              </Typography>
            ) : null}
          </Typography>
        </InfoItem>
      </SectionCard>
    </Grid>

    <Grid item xs={12} md={6}>
      <SectionCard icon='tabler:engine' title='Component' subtitle='Part under replacement monitoring'>
        <InfoItem label='Component' value={formatComponentDesc(component)} />
        <InfoItem label='Policy (hrs)' value={formatPolicy(component?.policy)} />
        <InfoItem label='Component Type' value={component?.compType} />
        <InfoItem label='Latest HM Date' value={formatDisplayDate(latestHmDate)} />
      </SectionCard>
    </Grid>
  </Grid>
)

export default ReplacementDetailInfo
