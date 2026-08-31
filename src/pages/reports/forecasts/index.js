// ** React Imports
import { useCallback, useMemo, useState } from 'react'

// ** Next Imports
import NextLink from 'next/link'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import toast from 'react-hot-toast'

// ** Custom Components Imports
import Icon from 'src/@core/components/icon'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomTextField from 'src/@core/components/mui/text-field'
import PageHeader from 'src/@core/components/page-header'

// ** Utils
import { downloadExport } from 'src/utils/export-download'
import { planPeriodFromMonthInput } from 'src/utils/forecast-plan-period'

// ** Hooks
import useReportPage from 'src/hooks/useReportPage'

// ** View Components
import ReportDataGrid from 'src/views/pcr/reports/ReportDataGrid'
import ReportTableHeader from 'src/views/pcr/reports/ReportTableHeader'
import { buildForecastReportColumns, forecastReportStickySx } from 'src/views/pcr/reports/reportGridColumns'

const STATUS_OPTIONS = ['', 'OPEN', 'CLOSED']

const ForecastReportPage = () => {
  const [planMonth, setPlanMonth] = useState('')
  const [status, setStatus] = useState('')

  const domainFilterParams = useMemo(() => {
    const params = {}
    if (status) params.status = status
    if (planMonth) {
      const planPeriod = planPeriodFromMonthInput(planMonth)
      if (planPeriod) params.planPeriod = planPeriod
    }

    return params
  }, [planMonth, status])

  const {
    projects,
    equipments,
    componentOptions,
    search,
    setSearch,
    projectCode,
    setProjectCode,
    fleetUnitId,
    setFleetUnitId,
    idMod,
    setIdMod,
    showProjectFilter,
    serverGridProps,
    exportParams
  } = useReportPage({
    apiPath: '/forecasts',
    filterParams: domainFilterParams
  })

  const handleExport = useCallback(async () => {
    try {
      await downloadExport('forecasts', exportParams, 'forecast-summary.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }, [exportParams])

  const columns = useMemo(() => buildForecastReportColumns(), [])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 3 }}>
          <PageHeader
            title={<Typography variant='h4'>Summary Forecast</Typography>}
            subtitle={
              <Typography sx={{ color: 'text.secondary' }}>
                Filter by project, unit, component, plan period, and status
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
              href='/reports/forecasts/price'
              variant='tonal'
              color='primary'
              startIcon={<Icon icon='tabler:currency-dollar' />}
            >
              By Price
            </Button>
          </Box>
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <ReportTableHeader
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder='Search unit, component, model, BA PCR no…'
            showProjectFilter={showProjectFilter}
            projects={projects}
            projectCode={projectCode}
            onProjectChange={setProjectCode}
            equipments={equipments}
            fleetUnitId={fleetUnitId}
            onUnitChange={setFleetUnitId}
            componentOptions={componentOptions}
            idMod={idMod}
            onComponentChange={setIdMod}
            onExport={handleExport}
          >
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                type='month'
                fullWidth
                size='small'
                label='Plan Period'
                value={planMonth}
                onChange={e => setPlanMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <SearchableSelect
                size='small'
                label='Status'
                value={status}
                onChange={e => setStatus(e.target.value)}
                options={STATUS_OPTIONS.map(s => ({ value: s, label: s || 'All' }))}
              />
            </Grid>
          </ReportTableHeader>
          <ReportDataGrid
            columns={columns}
            getRowId={row => row.idForecast}
            minWidth={2930}
            stickyColumns
            sx={forecastReportStickySx}
            {...serverGridProps}
          />
        </Card>
      </Grid>
    </Grid>
  )
}

ForecastReportPage.authGuard = true

export default ForecastReportPage
