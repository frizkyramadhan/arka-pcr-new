/**
 * Forecast by Price — sum of priceComponent by Model × Component × Plan Periode.
 * UI mirrors Forecast by Plan Periode; Model/Component independent of project.
 */
import NextLink from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import PageHeader from 'src/@core/components/page-header'

import useForecastMatrixFilters from 'src/hooks/useForecastMatrixFilters'

import ForecastPeriodMatrix from 'src/views/pcr/reports/ForecastPeriodMatrix'

const ForecastPriceReportPage = () => {
  const {
    projects,
    models,
    componentOptions,
    projectCode,
    setProjectCode,
    modelName,
    setModelName,
    compDesc,
    setCompDesc,
    status,
    setStatus,
    statusOptions,
    showProjectFilter,
    data,
    loading
  } = useForecastMatrixFilters({ apiPath: '/forecasts/price-matrix' })

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 3
          }}
        >
          <PageHeader
            title={<Typography variant='h4'>Forecast by Price</Typography>}
            subtitle={
              <Typography sx={{ color: 'text.secondary' }}>
                Sum of component price per model and component across plan periods
              </Typography>
            }
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: { xs: 0, sm: 1 } }}>
            <Button
              component={NextLink}
              href='/reports/forecasts/period'
              variant='tonal'
              color='primary'
              startIcon={<Icon icon='tabler:table' />}
            >
              By Plan Periode
            </Button>
            <Button
              component={NextLink}
              href='/reports/forecasts'
              variant='tonal'
              color='secondary'
              startIcon={<Icon icon='tabler:list' />}
            >
              Detail list
            </Button>
          </Box>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardContent sx={{ pb: 2 }}>
            <Typography variant='body2' sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
              Filters
            </Typography>
            <Grid container spacing={3} sx={{ maxWidth: 960, mb: 1 }}>
              {showProjectFilter ? (
                <Grid item xs={12} sm={6} md={3}>
                  <CustomTextField
                    select
                    fullWidth
                    size='small'
                    label='Site / Project'
                    value={projectCode}
                    onChange={e => setProjectCode(e.target.value)}
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: selected => {
                        if (!selected) return 'All'
                        const project = projects.find(item => item.project_code === selected)

                        return project
                          ? `${project.project_code}${project.bowheer ? ` — ${project.bowheer}` : ''}`
                          : selected
                      }
                    }}
                  >
                    <MenuItem value=''>All</MenuItem>
                    {projects.map(project => (
                      <MenuItem key={project.project_code} value={project.project_code}>
                        {project.project_code}
                        {project.bowheer ? ` — ${project.bowheer}` : ''}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                </Grid>
              ) : null}
              <Grid item xs={12} sm={6} md={3}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Model'
                  value={modelName}
                  onChange={e => setModelName(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value=''>All models</MenuItem>
                  {models.map(model => (
                    <MenuItem key={model.fleetModelId} value={model.modelName}>
                      {model.modelName}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='Component'
                  value={compDesc}
                  onChange={e => setCompDesc(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value=''>All components</MenuItem>
                  {componentOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <CustomTextField
                  select
                  fullWidth
                  size='small'
                  label='STATUS PCR'
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  {statusOptions.map(s => (
                    <MenuItem key={s || 'all'} value={s}>
                      {s || 'All'}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
            </Grid>
          </CardContent>

          {loading && !data ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ position: 'relative', px: 0, pb: 2 }}>
              {loading ? (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: theme =>
                      theme.palette.mode === 'light' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)'
                  }}
                >
                  <CircularProgress size={32} />
                </Box>
              ) : null}
              <ForecastPeriodMatrix data={data} loading={loading} />
            </Box>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

ForecastPriceReportPage.authGuard = true

export default ForecastPriceReportPage
