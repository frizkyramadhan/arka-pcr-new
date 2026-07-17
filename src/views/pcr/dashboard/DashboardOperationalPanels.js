/**
 * Operational panels — forecast by quarter and critical components.
 */

import Link from 'next/link'

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

import LifePercentChip from 'src/views/pcr/forecasts/LifePercentChip'

const formatPrice = value =>
  value
    ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
    : '—'

/**
 * @param {{
 *   year: number
 *   loading?: boolean
 *   stats: object | null
 * }} props
 */
const DashboardOperationalPanels = ({ year, loading = false, stats }) => (
  <>
    <Grid item xs={12} md={7}>
      <Card>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 4 }}>
            Forecast by Quarter ({year})
          </Typography>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Quarter</TableCell>
                <TableCell align='right'>OPEN</TableCell>
                <TableCell align='right'>CLOSED</TableCell>
                <TableCell align='right'>Price OPEN</TableCell>
                <TableCell align='right'>Price CLOSED</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(stats?.forecastQuarter ?? []).map(row => (
                <TableRow key={row.quarter}>
                  <TableCell>{row.quarter}</TableCell>
                  <TableCell align='right'>{row.open}</TableCell>
                  <TableCell align='right'>{row.closed}</TableCell>
                  <TableCell align='right'>{formatPrice(row.totalPriceOpen)}</TableCell>
                  <TableCell align='right'>{formatPrice(row.totalPriceClosed)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button component={Link} href='/reports/forecasts' variant='tonal' size='small' sx={{ mt: 4 }}>
            View Forecast Report
          </Button>
        </CardContent>
      </Card>
    </Grid>

    <Grid item xs={12} md={5}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant='h6' sx={{ mb: 4 }}>
            Critical Components (Top 10)
          </Typography>
          {(stats?.criticalComponents ?? []).length === 0 ? (
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {loading ? 'Loading…' : 'No critical components found'}
            </Typography>
          ) : (
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Unit</TableCell>
                  <TableCell>Component</TableCell>
                  <TableCell align='right'>Life %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.criticalComponents.map(row => (
                  <TableRow key={`${row.fleetUnitId}-${row.idMod}`}>
                    <TableCell>{row.unitNo}</TableCell>
                    <TableCell>{row.compDesc}</TableCell>
                    <TableCell align='right'>
                      <LifePercentChip value={row.lifePercent} />
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

export default DashboardOperationalPanels
