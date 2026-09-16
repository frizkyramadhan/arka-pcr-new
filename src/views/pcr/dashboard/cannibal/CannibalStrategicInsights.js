/**
 * Cannibal strategic insights — PCR Other Unit links + SLA risk.
 */

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from 'src/@core/components/mui/chip'
import CompactKpiCard from '../CompactKpiCard'
import DashboardSectionHeader from '../DashboardSectionHeader'

/**
 * @param {{
 *   year: number
 *   loading?: boolean
 *   stats: object | null
 * }} props
 */
const CannibalStrategicInsights = ({ year, loading = false, stats }) => {
  const strategic = stats?.strategic ?? {}
  const linked = strategic.linkedForecasts ?? []

  const linkCards = [
    {
      stats: String(strategic.pcrOtherUnitLinked ?? 0),
      title: 'PCR ↔ Cannibal',
      description: 'Forecast Return To Other Unit linked to a cannibal BA (plan year)',
      avatarIcon: 'tabler:link',
      avatarColor: 'primary',
      emphasize: true
    },
    {
      stats: String(strategic.pcrOtherUnitOpen ?? 0),
      title: 'Other Unit Open',
      description: 'Linked Other Unit forecasts not yet converted/closed',
      avatarIcon: 'tabler:arrows-exchange',
      avatarColor: 'info'
    },
    {
      stats: String(strategic.pcrOtherUnitConverted ?? 0),
      title: 'Converted / Closed',
      description: 'Linked Other Unit forecasts already converted or closed',
      avatarIcon: 'tabler:circle-check',
      avatarColor: 'success'
    }
  ]

  const slaCards = [
    {
      stats: String(strategic.slaAtRisk24h ?? 0),
      title: 'SLA ≤ 24h',
      description: 'Active BA with overall 5-day SLA remaining within 24 hours',
      avatarIcon: 'tabler:alarm',
      avatarColor: 'warning',
      emphasize: true
    },
    {
      stats: String(strategic.slaOverdueStage ?? 0),
      title: 'Stage Overdue',
      description: 'Active BA past current stage deadline',
      avatarIcon: 'tabler:clock-exclamation',
      avatarColor: 'error',
      emphasize: true
    },
    {
      stats: String(strategic.slaExpired ?? 0),
      title: 'Expired',
      description: 'BA marked EXPIRED or overall SLA already elapsed',
      avatarIcon: 'tabler:ban',
      avatarColor: 'secondary'
    }
  ]

  return (
    <>
      <Grid item xs={12}>
        <DashboardSectionHeader
          title={`PCR Link & SLA · ${year}`}
          subtitle='Other Unit forecasts linked to cannibal BA, plus 5-day SLA risk signals'
          icon='tabler:shield'
          iconColor='warning'
        />
      </Grid>

      {linkCards.map(card => (
        <Grid item xs={12} sm={4} key={card.title}>
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

      {slaCards.map(card => (
        <Grid item xs={12} sm={4} key={card.title}>
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

      <Grid item xs={12}>
        <Card
          sx={theme => ({
            border: `1px solid ${theme.palette.divider}`,
            backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${theme.palette.background.paper} 28%)`
          })}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
                flexWrap: 'wrap',
                mb: 3
              }}
            >
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 700 }}>
                  Linked Other Unit Forecasts
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Return To Other Unit with a cannibal BA number — donor unit context
                </Typography>
              </Box>
              <Button component={Link} href='/forecasts' variant='tonal' size='small'>
                Open Forecasts
              </Button>
            </Box>

            {linked.length === 0 ? (
              <Box
                sx={{
                  py: 6,
                  textAlign: 'center',
                  borderRadius: 2,
                  bgcolor: theme => alpha(theme.palette.action.hover, 0.35)
                }}
              >
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {loading ? 'Loading…' : 'No linked Other Unit forecasts for this year'}
                </Typography>
              </Box>
            ) : (
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Forecast</TableCell>
                    <TableCell>Unit (donor)</TableCell>
                    <TableCell>Component</TableCell>
                    <TableCell>Cannibal BA</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {linked.map(row => (
                    <TableRow key={row.idForecast} hover>
                      <TableCell>
                        <Typography
                          component={Link}
                          href={`/forecasts?id=${row.idForecast}`}
                          variant='body2'
                          sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}
                        >
                          #{row.idForecast}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {row.unitNo}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.compDesc || '—'}</TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {row.cannibalNoBa}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          rounded
                          skin='light'
                          size='small'
                          color={row.converted ? 'success' : 'warning'}
                          label={row.converted ? 'Converted' : row.forecastStatus}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Grid>
    </>
  )
}

export default CannibalStrategicInsights
