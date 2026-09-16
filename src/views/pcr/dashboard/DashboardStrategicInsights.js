/**
 * PCR strategic insights — oldcore / prediction / supply / lifetime / return-to.
 */

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import CustomChip from 'src/@core/components/mui/chip'

import CompactKpiCard from './CompactKpiCard'
import DashboardMixBars from './DashboardMixBars'
import DashboardSectionHeader from './DashboardSectionHeader'

const OLDCORE_COLORS = {
  FIRST_LIFE_80: 'success',
  SECOND_LIFE_60: 'info',
  THIRD_LIFE_40: 'warning'
}

const PREDICTION_COLORS = {
  FULL_CORE: 'success',
  PARTIAL_CORE: 'warning',
  BER: 'error'
}

const SUPPLY_COLORS = {
  PTA_REMAN: 'primary',
  NEW_COMPONENT: 'info',
  REPAIR: 'warning',
  WARRANTY: 'secondary'
}

const LIFE_COLORS = {
  CONTINUE_LIFE: 'success',
  BACK_TO_ZERO: 'info'
}

const RETURN_COLORS = {
  ORIGINAL_UNIT: 'primary',
  OTHER_UNIT: 'warning'
}

/**
 * @param {{
 *   year: number
 *   loading?: boolean
 *   stats: object | null
 * }} props
 */
const DashboardStrategicInsights = ({ year, loading = false, stats }) => {
  const strategic = stats?.strategic
  const empty = loading ? 'Loading…' : `No classified data for ${year}`

  const highlightCards = [
    {
      stats: String(stats?.totals?.firstLife80 ?? 0),
      title: 'Oldcore 80%',
      description: 'Closed WO — First Life 80% (selected year)',
      avatarIcon: 'tabler:badge',
      avatarColor: 'success',
      emphasize: true
    },
    {
      stats: String(stats?.totals?.secondLife60 ?? 0),
      title: 'Oldcore 60%',
      description: 'Closed WO — Second Life 60% (selected year)',
      avatarIcon: 'tabler:award',
      avatarColor: 'info',
      emphasize: true
    },
    {
      stats: String(stats?.totals?.berClosed ?? 0),
      title: 'BER',
      description: 'Closed WO predicted BER (selected year)',
      avatarIcon: 'tabler:alert-octagon',
      avatarColor: 'error',
      emphasize: true
    },
    {
      stats: String(stats?.totals?.otherUnitPlans ?? 0),
      title: 'Other Unit',
      description: 'Forecasts Return To Other Unit (linked cannibal path)',
      avatarIcon: 'tabler:arrows-exchange',
      avatarColor: 'warning',
      emphasize: true
    }
  ]

  return (
    <>
      <Grid item xs={12}>
        <DashboardSectionHeader
          title={`Strategic Insights · ${year}`}
          subtitle='Oldcore quality on closed WO and PCR supply path (type · lifetime · return-to)'
          icon='tabler:report-analytics'
          iconColor='info'
          action={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <CustomChip
                rounded
                skin='light'
                color='success'
                label={`Classified ${strategic?.closedClassified ?? 0}`}
              />
              <CustomChip
                rounded
                skin='light'
                color='secondary'
                label={`Unclassified ${strategic?.closedUnclassified ?? 0}`}
              />
              <CustomChip
                rounded
                skin='light'
                color='warning'
                label={`Other Unit ${strategic?.otherUnitPlans ?? 0}`}
              />
            </Box>
          }
        />
      </Grid>

      {highlightCards.map(card => (
        <Grid item xs={6} sm={3} key={card.title}>
          <CompactKpiCard
            title={card.title}
            stats={loading ? '…' : card.stats}
            description={card.description}
            avatarIcon={card.avatarIcon}
            avatarColor={card.avatarColor}
            emphasize={card.emphasize}
          />
        </Grid>
      ))}

      <Grid item xs={12} md={4}>
        <DashboardMixBars
          title='Oldcore Status'
          icon='tabler:recycle'
          iconColor='success'
          rows={strategic?.oldcoreStatus}
          emptyHint={empty}
          colorMap={OLDCORE_COLORS}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <DashboardMixBars
          title='Prediction Oldcore'
          icon='tabler:eye'
          iconColor='warning'
          rows={strategic?.predictionOldcore}
          emptyHint={empty}
          colorMap={PREDICTION_COLORS}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <DashboardMixBars
          title='PCR Supply Type'
          icon='tabler:packages'
          iconColor='primary'
          rows={strategic?.forecastSupply}
          emptyHint={empty}
          colorMap={SUPPLY_COLORS}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <DashboardMixBars
          title='Lifetime Mode'
          icon='tabler:hourglass'
          iconColor='info'
          rows={strategic?.lifetimeMode}
          emptyHint={empty}
          colorMap={LIFE_COLORS}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <DashboardMixBars
          title='Return To'
          icon='tabler:arrows-shuffle'
          iconColor='warning'
          rows={strategic?.returnTo}
          emptyHint={empty}
          colorMap={RETURN_COLORS}
        />
      </Grid>

      <Grid item xs={12}>
        <Typography variant='caption' sx={{ color: 'text.disabled' }}>
          Oldcore / Prediction counted from CLOSED WO in {year}. Supply / Lifetime / Return To from forecasts with plan
          period in {year}.
        </Typography>
      </Grid>
    </>
  )
}

export default DashboardStrategicInsights
