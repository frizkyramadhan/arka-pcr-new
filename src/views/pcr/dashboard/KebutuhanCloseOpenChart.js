/**
 * Grouped column chart — Total Kebutuhan vs Close vs Open per month.
 */

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import { useTheme } from '@mui/material/styles'

import ReactApexcharts from 'src/@core/components/react-apexcharts'

/**
 * @param {{
 *   year: number
 *   months?: string[]
 *   grandTotal?: Record<string, { total: number, close: number, open: number }>
 *   title?: string
 *   subheader?: string
 *   totalSeriesName?: string
 * }} props
 */
const KebutuhanCloseOpenChart = ({
  year,
  months = [],
  grandTotal = {},
  title,
  subheader = 'Total, Close, and Open per month (all projects)',
  totalSeriesName = 'Total'
}) => {
  const theme = useTheme()

  const categories = months.length ? months : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const totalSeries = categories.map(month => grandTotal[month]?.total ?? 0)
  const closeSeries = categories.map(month => grandTotal[month]?.close ?? 0)
  const openSeries = categories.map(month => grandTotal[month]?.open ?? 0)

  const options = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false },
      stacked: false
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: '55%',
        endingShape: 'rounded',
        startingShape: 'rounded'
      }
    },
    colors: [theme.palette.info.main, theme.palette.success.main, theme.palette.warning.main],
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: theme.palette.text.secondary },
      markers: { offsetX: -3 }
    },
    grid: {
      borderColor: theme.palette.divider,
      xaxis: { lines: { show: false } },
      padding: { top: -10 }
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { color: theme.palette.divider },
      labels: { style: { colors: theme.palette.text.disabled } }
    },
    yaxis: {
      labels: { style: { colors: theme.palette.text.disabled } }
    },
    tooltip: {
      y: { formatter: value => `${value}` }
    }
  }

  const series = [
    { name: totalSeriesName, data: totalSeries },
    { name: 'Close', data: closeSeries },
    { name: 'Open', data: openSeries }
  ]

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={title ?? `Volume vs Realization ${year}`}
        subheader={subheader}
        titleTypographyProps={{ variant: 'h6' }}
        subheaderTypographyProps={{ variant: 'body2' }}
      />
      <CardContent>
        <ReactApexcharts type='bar' height={280} options={options} series={series} />
      </CardContent>
    </Card>
  )
}

export default KebutuhanCloseOpenChart
