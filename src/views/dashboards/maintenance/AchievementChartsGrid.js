/**
 * Grid grafik "GRAFIK ACHIEVEMENT PROGRAM MAINTENANCE ALL SITE" — satu chart per (Maintenance Type × Site).
 * Setiap chart: PLAN & ACTUAL (bar), ACH % (line, sumbu kanan). Filter: Project, Tahun, Bulan.
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

const getRowForCell = (programRows, siteId, typeId) => programRows.find(r => r.siteId === siteId && r.typeId === typeId)

const formatAchLabel = val => (val != null && !Number.isNaN(val) ? `${Number(val).toFixed(2)}%` : '—')

const defaultPalette = {
  primary: { main: '#7367f0' },
  success: { main: '#28c76f' },
  warning: { main: '#ff9f43' },
  text: { secondary: '#a5a3ae', disabled: '#a5a3ae' },
  divider: '#ebe9f1'
}

const AchievementChartCell = ({ title, plan, actual, ach, monthLabel, theme }) => {
  const pal = theme?.palette ?? defaultPalette

  const series = [
    { name: 'PLAN', type: 'column', data: [plan ?? 0] },
    { name: 'ACTUAL', type: 'column', data: [actual ?? 0] },
    { name: 'ACH', type: 'line', data: [ach != null ? ach : null] }
  ]
  const maxVal = Math.max(plan || 0, actual || 0, 1)
  const yMax = Math.ceil((maxVal * 1.2) / 10) * 10 || 10

  // Satu sumbu kiri (PLAN & ACTUAL), satu sumbu kanan (ACH). Sumbu kedua kiri disembunyikan agar tidak dobel.
  const yaxisLeft = {
    title: { text: '', style: { color: pal.text?.secondary } },
    min: 0,
    max: yMax,
    tickAmount: 5,
    labels: { style: { colors: pal.text?.disabled }, fontSize: '10px' },
    axisBorder: { show: false }
  }

  const yaxisRight = {
    opposite: true,
    title: { text: 'ACH %', style: { color: pal.text?.secondary, fontSize: '10px' } },
    min: 0,
    max: 120,
    tickAmount: 6,
    labels: {
      style: { colors: pal.text?.disabled },
      formatter: val => `${val}%`
    },
    axisBorder: { show: false }
  }

  // Index = series: 0 PLAN, 1 ACTUAL, 2 ACH. Sumbu [1] pakai skala kiri yang sama tapi disembunyikan (1 legend y-axis kiri saja).
  const yaxisArray = [yaxisLeft, { ...yaxisLeft, show: false }, yaxisRight]

  const options = {
    chart: {
      type: 'line',
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      animations: { enabled: true, speed: 400 }
    },
    stroke: {
      width: [0, 0, 3],
      curve: 'smooth'
    },
    colors: [pal.primary?.main, pal.success?.main, pal.warning?.main],
    dataLabels: {
      enabled: true,
      enabledOnSeries: [2],
      formatter: formatAchLabel,
      style: { fontSize: '11px' }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '11px',
      labels: { colors: pal.text?.secondary },
      markers: { width: 8, height: 8 }
    },
    grid: {
      borderColor: pal.divider,
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { top: 8, bottom: 4, left: 4, right: 4 }
    },
    xaxis: {
      categories: [monthLabel],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: pal.text?.disabled, fontSize: '10px' } }
    },
    yaxis: yaxisArray,
    plotOptions: {
      bar: {
        columnWidth: '45%',
        borderRadius: 4,
        distributed: false
      }
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: [
        { formatter: val => (val != null ? val : '—') },
        { formatter: val => (val != null ? val : '—') },
        { formatter: val => formatAchLabel(val) }
      ]
    }
  }

  return (
    <Card sx={{ height: '100%', boxShadow: 2, borderRadius: 2 }}>
      <CardContent sx={{ pb: 0, '&:last-child': { pb: 2 } }}>
        <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 1, textAlign: 'center' }}>
          {title}
        </Typography>
        <ApexChartWrapper>
          <ReactApexcharts type='line' height={220} options={options} series={series} />
        </ApexChartWrapper>
      </CardContent>
    </Card>
  )
}

const AchievementChartsGrid = ({ data, loading, year, onYearChange, projectId, onProjectChange }) => {
  const theme = useTheme()
  const [month, setMonth] = useState(new Date().getMonth() + 1) // 1-12

  const projects = data?.projects ?? []
  const types = data?.types ?? []
  const sites = data?.sites ?? []
  const programRows = data?.programRows ?? []
  const monthLabel = MONTH_LABELS_FULL[month - 1]

  const cells = useMemo(() => {
    const out = []
    types.forEach(type => {
      sites.forEach(site => {
        const row = getRowForCell(programRows, site.id, type.id)
        const monthIndex = month - 1
        const plan = row?.months?.[monthIndex]?.plan ?? 0
        const actual = row?.months?.[monthIndex]?.actual ?? 0
        const ach = row?.months?.[monthIndex]?.ach ?? (plan > 0 ? Math.round((actual / plan) * 1000) / 10 : null)
        out.push({
          key: `${type.id}-${site.id}`,
          title: `Achievement ${type.name} Site ${site.name}`,
          plan,
          actual,
          ach
        })
      })
    })
    
return out
  }, [types, sites, programRows, month])

  return (
    <Box>
      <Box
        sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}
      >
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          Achievement Program Maintenance All Site {year}
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
            <InputLabel>Tahun</InputLabel>
            <Select value={year} label='Tahun' onChange={e => onYearChange(Number(e.target.value))}>
              {[year - 1, year, year + 1].map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size='small' sx={{ minWidth: 140 }}>
            <InputLabel>Bulan</InputLabel>
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
            <Grid item xs={12} sm={6} md={4} lg={3} key={cell.key}>
              <AchievementChartCell
                title={cell.title}
                plan={cell.plan}
                actual={cell.actual}
                ach={cell.ach}
                monthLabel={monthLabel}
                theme={theme}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

export default AchievementChartsGrid
