/**
 * Tab YTD: donut chart data tahunan — All Site (besar) + per site (kecil).
 * Data dari achievement API: allSiteAch (tahunan), siteTotals (ACH per site tahunan).
 */
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

const DONUT_ORANGE = '#ff9f43'
const DONUT_GREY = '#e0e0e0'

function formatAch(val) {
  if (val == null || Number.isNaN(val)) return '—'
  
return `${Number(val).toFixed(1)}%`
}

/** Donut satu nilai: ring oranye (ACH) + abu sisa. Tengah: overlay teks nama + persen (selalu tampil tanpa hover). */
const AchDonut = ({ value, size = 280, theme, centerName }) => {
  const ach = value != null ? value : 0
  const segment = Math.min(ach, 100)
  const rest = Math.max(0, 100 - segment)
  const series = rest > 0 ? [segment, rest] : [segment]
  const pal = theme?.palette ?? {}
  const labelStr = formatAch(value)
  const isLarge = size > 200

  const options = {
    chart: { type: 'donut' },
    stroke: { width: 0 },
    colors: [DONUT_ORANGE, DONUT_GREY],
    labels: ['ACH', ''],
    legend: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: { show: false }
        }
      }
    },
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } }
    }
  }

  return (
    <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto' }}>
      <ApexChartWrapper>
        <ReactApexcharts type='donut' height={size} options={options} series={series} />
      </ApexChartWrapper>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        {centerName && (
          <Typography
            sx={{
              fontSize: isLarge ? '1rem' : '0.875rem',
              fontWeight: 600,
              color: 'text.secondary',
              lineHeight: 1.2
            }}
          >
            {centerName}
          </Typography>
        )}
        <Typography
          sx={{
            fontSize: isLarge ? '1.75rem' : '1.25rem',
            fontWeight: 700,
            color: 'text.primary',
            lineHeight: 1.2,
            mt: centerName ? 0.5 : 0
          }}
        >
          {labelStr}
        </Typography>
      </Box>
    </Box>
  )
}

const AchievementYTDDonutCharts = ({ data, loading, year, onYearChange, projectId, onProjectChange }) => {
  const theme = useTheme()
  const projects = data?.projects ?? []
  const siteTotals = data?.siteTotals ?? []
  const allSiteAch = data?.allSiteAch ?? null
  const allSiteAchValue = allSiteAch?.ach ?? null

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3
        }}
      >
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          YTD Achievement Average All Program Maintenance {year}
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
        </Box>
      </Box>
      {loading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography color='text.secondary'>Memuat data...</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 2 }}>
              Achievement Average All Program Maintenance {year} - All Site
            </Typography>
            <Card sx={{ boxShadow: 2, borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'center' }}>
                <AchDonut value={allSiteAchValue} size={300} theme={theme} centerName="All Site" />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant='subtitle1' sx={{ fontWeight: 600, mb: 2 }}>
              Achievement Average All Program Maintenance {year} - Per Site
            </Typography>
            {siteTotals.length === 0 ? (
              <Typography color='text.secondary' sx={{ py: 4 }}>
                Tidak ada data site untuk tahun ini.
              </Typography>
            ) : (
              <Grid container spacing={3}>
                {siteTotals.map(site => (
                  <Grid item xs={12} sm={6} key={site.siteId}>
                    <Card sx={{ boxShadow: 2, borderRadius: 2 }}>
                      <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <AchDonut
                          value={site.ach}
                          size={200}
                          theme={theme}
                          centerName={site.siteName}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  )
}

export default AchievementYTDDonutCharts
