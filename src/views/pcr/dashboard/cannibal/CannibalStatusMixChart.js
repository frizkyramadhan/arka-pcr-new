/**
 * Donut chart — Cannibal BA status mix for selected posting year.
 * Fixed hex colors so every legend entry is visually distinct.
 */

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import ReactApexcharts from 'src/@core/components/react-apexcharts'

/** Distinct colors per normalized bucket (independent of theme primary/secondary clash). */
const STATUS_HEX = {
  DRAFT: '#82868B',
  PENDING_LOGISTICS: '#00CFE8',
  PENDING_DOCUMENT: '#FFB400',
  IN_APPROVAL: '#FF9F43',
  SUBMITTED: '#FF9F43',
  OPEN: '#FF9F43',
  APPROVED: '#28C76F',
  REJECTED: '#EA5455',
  CLOSED: '#7367F0',
  CANCELLED: '#4B4B4B'
}

/**
 * @param {{
 *   year: number
 *   statusMix?: Array<{ status: string, count: number }>
 * }} props
 */
const CannibalStatusMixChart = ({ year, statusMix = [] }) => {
  const theme = useTheme()

  const labels = statusMix.map(row => row.status)
  const series = statusMix.map(row => row.count)
  const colors = statusMix.map(row => STATUS_HEX[row.status] ?? '#A8AAAE')

  const options = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    labels,
    colors,
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '13px',
      markers: { width: 12, height: 12, radius: 12 },
      itemMargin: { horizontal: 10, vertical: 4 },
      labels: { colors: theme.palette.text.secondary }
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: [theme.palette.background.paper] },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: { show: true },
            value: {
              show: true,
              formatter: value => `${value}`
            },
            total: {
              show: true,
              label: 'Total',
              formatter: w => w.globals.seriesTotals.reduce((a, b) => a + b, 0)
            }
          }
        }
      }
    },
    tooltip: {
      y: { formatter: value => `${value} BA` }
    }
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={`Status Mix ${year}`}
        subheader='Normalized buckets (legacy OPEN fully approved → CLOSED)'
        titleTypographyProps={{ variant: 'h6' }}
        subheaderTypographyProps={{ variant: 'body2' }}
      />
      <CardContent>
        {series.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.secondary', py: 10, textAlign: 'center' }}>
            No BA data for {year}.
          </Typography>
        ) : (
          <ReactApexcharts type='donut' height={300} options={options} series={series} />
        )}
      </CardContent>
    </Card>
  )
}

export default CannibalStatusMixChart
