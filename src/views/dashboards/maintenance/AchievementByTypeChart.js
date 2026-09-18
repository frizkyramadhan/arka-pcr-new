/**
 * Grafik Achievement per Maintenance Type — filter Project & Tahun, tampilan bar chart ACH% per tipe.
 * Data diagregasi dari achievement.programRows per typeId.
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { useTheme } from '@mui/material/styles'
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import ApexChartWrapper from 'src/@core/styles/libs/react-apexcharts'

function aggregateByType(programRows = [], types = []) {
  if (!types.length) return { categories: [], achData: [] }
  const byType = {}
  types.forEach(t => {
    byType[t.id] = { typeName: t.name, totalPlan: 0, totalActual: 0 }
  })
  programRows.forEach(r => {
    if (!byType[r.typeId]) return
    byType[r.typeId].totalPlan += r.totalPlan || 0
    byType[r.typeId].totalActual += r.totalActual || 0
  })
  const categories = types.map(t => t.name)

  const achData = types.map(t => {
    const row = byType[t.id]
    if (!row || row.totalPlan === 0) return 0
    
return Math.round((row.totalActual / row.totalPlan) * 1000) / 10
  })
  
return { categories, achData }
}

const AchievementByTypeChart = ({
  data,
  loading,
  year,
  onYearChange,
  projectId,
  onProjectChange
}) => {
  const theme = useTheme()
  const projects = data?.projects ?? []
  const types = data?.types ?? []
  const { categories, achData } = aggregateByType(data?.programRows ?? [], types)

  const options = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    colors: [theme.palette.primary.main],
    dataLabels: { enabled: true },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '55%',
        distributed: false
      }
    },
    legend: { show: false },
    grid: {
      borderColor: theme.palette.divider,
      strokeDashArray: 6,
      xaxis: { lines: { show: false } },
      padding: { top: -10, bottom: 10 }
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { color: theme.palette.divider },
      labels: {
        style: { colors: theme.palette.text.disabled },
        rotate: -45,
        rotateAlways: categories.length > 4
      }
    },
    yaxis: {
      labels: {
        style: { colors: theme.palette.text.disabled }
      },
      axisBorder: { show: false },
      axisTicks: { color: theme.palette.divider },
      title: {
        text: 'ACH (%)',
        style: { color: theme.palette.text.secondary }
      }
    },
    tooltip: {
      y: { formatter: val => `${val}%` }
    }
  }

  const series = [{ name: 'ACH (%)', data: achData }]

  return (
    <ApexChartWrapper>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Achievement per Maintenance Type
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Project</InputLabel>
                <Select
                  value={projectId ?? ''}
                  label="Project"
                  onChange={e => onProjectChange(e.target.value === '' ? null : e.target.value)}
                >
                  <MenuItem value="">Semua</MenuItem>
                  {projects.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Tahun</InputLabel>
                <Select value={year} label="Tahun" onChange={e => onYearChange(Number(e.target.value))}>
                  {[year - 1, year, year + 1].map(y => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          {loading ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography color="text.secondary">Memuat data...</Typography>
            </Box>
          ) : categories.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography color="text.secondary">Tidak ada data untuk tahun dan project yang dipilih.</Typography>
            </Box>
          ) : (
            <ReactApexcharts type="bar" height={320} options={options} series={series} />
          )}
        </CardContent>
      </Card>
    </ApexChartWrapper>
  )
}

export default AchievementByTypeChart
