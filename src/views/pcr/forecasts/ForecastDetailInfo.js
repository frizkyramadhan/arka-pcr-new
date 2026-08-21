/**
 * Detail sections — unit, planning, BA PCR & execution.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'

import NextLink from 'next/link'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'

import { formatDisplayDate } from 'src/utils/date-format'
import { formatPlanPeriodMonthYear } from 'src/utils/forecast-plan-period'

import BaPcrHistoryList from 'src/views/pcr/forecasts/BaPcrHistoryList'

const formatUser = user => {
  if (!user) return null

  return user.fullName || user.username || `#${user.idUser}`
}

const formatHm = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return num.toLocaleString('id-ID')
}

const InfoItem = ({ label, value, children }) => {
  if (!children && (value === null || value === undefined || value === '' || value === '—')) return null

  return (
    <Grid item xs={12} sm={6}>
      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {children ?? (
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          {value}
        </Typography>
      )}
    </Grid>
  )
}

const SectionCard = ({ icon, title, subtitle, children, cardRef }) => (
  <Card ref={cardRef} sx={{ height: '100%' }}>
    <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
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

const ForecastDetailInfo = ({ forecast, unitCardRef, baPcrCardRef, showBaPcrHistory = true }) => {
  if (!forecast) return null

  const compDesc = forecast.compDesc ?? forecast.commod?.comp?.compDesc ?? '—'
  const fleetUnitId = forecast.fleetUnitId
  const submitter = formatUser(forecast.submitter)
  const creator = formatUser(forecast.creator)

  const replacementHref =
    fleetUnitId && forecast.idMod
      ? `/units/${fleetUnitId}/replacements/${forecast.idMod}`
      : fleetUnitId && forecast.idRep
        ? `/units/${fleetUnitId}/replacements`
        : null

  return (
    <Grid container spacing={4}>
      <Grid item xs={12} md={6}>
        <SectionCard
          cardRef={unitCardRef}
          icon='tabler:truck'
          title='Unit & Component'
          subtitle='Equipment and part identity'
        >
          <InfoItem label='Unit No.'>
            {fleetUnitId ? (
              <Link component={NextLink} href={`/units/${fleetUnitId}`} underline='hover' sx={{ fontWeight: 600 }}>
                {forecast.unitNo}
              </Link>
            ) : (
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {forecast.unitNo}
              </Typography>
            )}
          </InfoItem>
          <InfoItem label='Model' value={forecast.modelName} />
          <InfoItem label='Site / Project' value={forecast.projectCode} />
          <InfoItem label='Component' value={compDesc} />
          <InfoItem label='Latest Unit HM'>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {formatHm(forecast.latestUnitHm)}
              {forecast.latestUnitHmDate ? (
                <Typography component='span' variant='body2' sx={{ color: 'text.secondary', fontWeight: 400 }}>
                  {' '}
                  · {formatDisplayDate(forecast.latestUnitHmDate)}
                </Typography>
              ) : null}
            </Typography>
          </InfoItem>
          <InfoItem label='Snapshot At' value={formatDisplayDate(forecast.snapshotAt)} />
        </SectionCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <SectionCard icon='tabler:calendar-stats' title='Planning' subtitle='Schedule and author'>
          <InfoItem label='Plan Period' value={formatPlanPeriodMonthYear(forecast.planPeriod)} />
          <InfoItem label='Quarter' value={forecast.quarter} />
          <InfoItem label='Created By' value={creator} />
          <InfoItem label='Created At' value={formatDisplayDate(forecast.createdAt)} />
          <InfoItem label='Remark' value={forecast.remark} />
        </SectionCard>
      </Grid>

      <Grid item xs={12}>
        <SectionCard
          cardRef={baPcrCardRef}
          icon='tabler:file-certificate'
          title='BA PCR & Execution'
          subtitle='Approval status and replacement execution'
        >
          <InfoItem label='BA PCR Status'>
            <CustomChip
              rounded
              skin='light'
              size='small'
              label={forecast.baPcrStatus}
              color={
                forecast.baPcrStatus === 'APPROVED'
                  ? 'success'
                  : forecast.baPcrStatus === 'REJECTED'
                    ? 'error'
                    : 'warning'
              }
            />
          </InfoItem>
          <InfoItem label='Approval Stage' value={forecast.statusBaPcr} />
          <InfoItem label='BA PCR No.' value={forecast.noBaPcr} />
          <InfoItem label='Submitted At' value={formatDisplayDate(forecast.baSubmittedAt)} />
          <InfoItem label='CBM Rating' value={forecast.ratingCbm} />
          <InfoItem label='Submitted By' value={submitter} />
          <InfoItem label='Converted At' value={formatDisplayDate(forecast.convertedAt)} />
          {forecast.replacement ? (
            <>
              <InfoItem label='MR No' value={forecast.replacement.mrNo} />
              <InfoItem label='PR No' value={forecast.replacement.prNo} />
              <InfoItem label='PO No' value={forecast.replacement.poNo} />
              <InfoItem label='Return Oldcore' value={formatDisplayDate(forecast.replacement.returnOldcoreDate)} />
              <InfoItem label='SPB/BA Return Oldcore' value={forecast.replacement.spbBaReturnOldcore} />
            </>
          ) : null}
          {forecast.replacement ? (
            <InfoItem label='Linked Work Order'>
              {replacementHref ? (
                <Link component={NextLink} href={replacementHref} underline='hover' sx={{ fontWeight: 600 }}>
                  WO #{forecast.replacement.woNo ?? forecast.replacement.idRep} · {forecast.replacement.woStatus}
                </Link>
              ) : (
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  WO #{forecast.replacement.woNo ?? forecast.replacement.idRep} · {forecast.replacement.woStatus}
                </Typography>
              )}
            </InfoItem>
          ) : (
            <InfoItem label='Linked Work Order'>
              {forecast.idRep && replacementHref ? (
                <Link component={NextLink} href={replacementHref} underline='hover' sx={{ fontWeight: 600 }}>
                  #{forecast.idRep}
                </Link>
              ) : (
                forecast.idRep ? `#${forecast.idRep}` : null
              )}
            </InfoItem>
          )}
          {showBaPcrHistory && forecast.baPcrList?.length > 0 ? (
            <Grid item xs={12}>
              <BaPcrHistoryList entries={forecast.baPcrList} />
            </Grid>
          ) : null}
        </SectionCard>
      </Grid>
    </Grid>
  )
}

export default ForecastDetailInfo
