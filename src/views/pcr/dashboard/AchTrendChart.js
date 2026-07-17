/**
 * Line chart — Grand Total Ach % per month for selected year.
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
 *   grandTotal?: Record<string, { total: number, ach: number | null }>
 *   title?: string
 *   subheader?: string
 * }} props
 */
const AchTrendChart = ({
  year,
  months = [],
  grandTotal = {},
  title,
  subheader = 'Grand Total Ach % per month (weighted)'
}) => {
  const theme = useTheme()

  const categories = months.length ? months : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const seriesData = categories.map(month => {
    const cell = grandTotal[month]
    if (!cell || cell.total <= 0 || cell.ach == null) return null

    return cell.ach
  })

  const options = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: [theme.palette.primary.main],
    stroke: { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    markers: {
      size: 5,
      strokeWidth: 3,
      strokeOpacity: 1,
      colors: [theme.palette.primary.main],
      strokeColors: [theme.palette.background.paper]
    },
    grid: {
      borderColor: theme.palette.divider,
      xaxis: { lines: { show: true } },
      padding: { top: -10 }
    },
    tooltip: {
      y: {
        formatter: value => (value == null ? '—' : `${value}%`)
      }
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: {
        formatter: value => `${value}%`,
        style: { colors: theme.palette.text.disabled }
      }
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { color: theme.palette.divider },
      labels: { style: { colors: theme.palette.text.disabled } }
    }
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={title ?? `Trend Achievement PCR ${year}`}
        subheader={subheader}
        titleTypographyProps={{ variant: 'h6' }}
        subheaderTypographyProps={{ variant: 'body2' }}
      />
      <CardContent>
        <ReactApexcharts type='line' height={280} options={options} series={[{ name: 'Ach %', data: seriesData }]} />
      </CardContent>
    </Card>
  )
}

export default AchTrendChart
