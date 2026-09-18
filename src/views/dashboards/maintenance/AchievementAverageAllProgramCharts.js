/**
 * Tab MTD: "Achievement Average All Program Maintenance" — grid chart satu bar ACH % per site.
 * Setiap card: ACH FUNDAMENTAL MAINTENANCE SITE [id], satu bar bulan terpilih, sumbu Y %.
 */
import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { useTheme } from '@mui/material/styles'
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import ApexChartWrapper from 'src/@core/styles/libs/react-apexcharts'

const MONTH_LABELS_FULL = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER'
]

/** ACH All Program per site untuk satu bulan: total actual / total plan * 100 */
function getSiteAchForMonth(programRows, siteId, monthIndex) {
  const rows = programRows.filter(r => r.siteId === siteId)
  let totalPlan = 0
  let totalActual = 0
  rows.forEach(r => {
    const m = r.months?.[monthIndex]
    if (m) {
      totalPlan += m.plan ?? 0
      totalActual += m.actual ?? 0
    }
  })
  if (totalPlan === 0) return null
  
return Math.round((totalActual / totalPlan) * 1000) / 10
}

const AchBarCell = ({ title, ach, monthLabel, theme }) => {
  const pal = theme?.palette ?? {}
  const value = ach != null ? ach : 0
  const yMax = value > 100 ? Math.min(140, Math.ceil(value / 20) * 20) : 100

  const options = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      animations: { enabled: true, speed: 400 }
    },
    plotOptions: {
      bar: {
        columnWidth: '50%',
        borderRadius: 4,
        distributed: false,
        dataLabels: { position: 'top' }
      }
    },
    colors: ['#5B8DEE'],
    dataLabels: {
      enabled: true,
      formatter: val => (val != null && val > 0 ? `${Number(val).toFixed(1)}%` : ''),
      style: { fontSize: '12px', colors: ['#2c3e50'] },
      offsetY: -20
    },
    legend: { show: false },
    grid: {
      borderColor: pal.divider || '#ebe9f1',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { top: 24, bottom: 4, left: 4, right: 4 }
    },
    xaxis: {
      categories: [monthLabel],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: pal.text?.disabled, fontSize: '11px' } }
    },
    yaxis: {
      min: 0,
      max: yMax,
      tickAmount: 5,
      labels: {
        style: { colors: pal.text?.disabled, fontSize: '10px' },
        formatter: val => `${val}%`
      },
      axisBorder: { show: false }
    },
    tooltip: {
      y: { formatter: val => (val != null ? `${Number(val).toFixed(2)}%` : '—') }
    }
  }

  const series = [{ name: 'ACH', data: [value] }]

  return (
    <Card sx={{ height: '100%', boxShadow: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ pb: 0, '&:last-child': { pb: 2 } }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
          {title}
        </Typography>
        <ApexChartWrapper>
          <ReactApexcharts type='bar' height={220} options={options} series={series} />
        </ApexChartWrapper>
      </CardContent>
    </Card>
  )
}

const AchievementAverageAllProgramCharts = ({ data, loading, year, onYearChange, projectId, onProjectChange }) => {
  const theme = useTheme()
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const projects = data?.projects ?? []
  const sites = data?.sites ?? []
  const programRows = data?.programRows ?? []
  const monthLabel = MONTH_LABELS_FULL[month - 1]
  const monthIndex = month - 1

  const cells = useMemo(() => {
    return sites.map(site => ({
      key: site.id,
      title: `ACH FUNDAMENTAL MAINTENANCE SITE ${site.name}`,
      ach: getSiteAchForMonth(programRows, site.id, monthIndex)
    }))
  }, [sites, programRows, monthIndex])

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
          py: 2,
          px: 3,
          color: 'grey.900',
          borderRadius: 1
        }}
      >
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          MTD Achievement Average All Program Maintenance {year}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size='small' sx={{ minWidth: 140 }}>
            <InputLabel>Project</InputLabel>
            <Select
              value={projectId ?? ''}
              label='Project'
              onChange={e => onProjectChange(e.target.value === '' ? null : e.target.value)}
            >
              <MenuItem value=''>Semua</MenuItem>
              {projects.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size='small' sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select value={year} label='Tahun' onChange={e => onYearChange(Number(e.target.value))}>
              {[year - 1, year, year + 1].map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size='small' sx={{ minWidth: 140 }}>
            <InputLabel>Month</InputLabel>
            <Select value={month} label='Bulan' onChange={e => setMonth(Number(e.target.value))}>
              {MONTH_LABELS_FULL.map((label, i) => (
                <MenuItem key={label} value={i + 1}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      {loading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color='text.secondary'>Memuat data...</Typography>
        </Box>
      ) : cells.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color='text.secondary'>Tidak ada data untuk filter yang dipilih.</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {cells.map(cell => (
            <Grid item xs={12} sm={6} md={6} lg={3} key={cell.key}>
              <AchBarCell title={cell.title} ach={cell.ach} monthLabel={monthLabel} theme={theme} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

export default AchievementAverageAllProgramCharts
