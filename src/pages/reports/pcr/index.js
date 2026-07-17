// ** React Imports
import { useCallback, useMemo, useState } from 'react'

// ** MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

// ** Third Party Imports
import toast from 'react-hot-toast'

// ** Custom Components Imports
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
import {
  buildPcrReportColumns,
  PCR_REPORT_MIN_WIDTH,
  pcrReportStickySx
} from 'src/views/pcr/reports/reportGridColumns'

const STATUS_OPTIONS = ['', 'OPEN', 'CLOSE']

const PcrReportPage = () => {
  const [repMonth, setRepMonth] = useState('')
  const [status, setStatus] = useState('')

  const domainFilterParams = useMemo(() => {
    const params = {}
    if (status) params.status = status
    if (repMonth) {
      const repDate = planPeriodFromMonthInput(repMonth)
      if (repDate) params.repDate = repDate
    }

    return params
  }, [repMonth, status])

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
    apiPath: '/replacements',
    filterParams: domainFilterParams,
    defaultSortField: 'repDate',
    defaultSortOrder: 'desc'
  })

  const handleExport = useCallback(async () => {
    try {
      await downloadExport('pcr', exportParams, 'pcr-summary.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }, [exportParams])

  const columns = useMemo(() => buildPcrReportColumns(), [])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Summary PCR / WO</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Filter by project, unit, component, rep date period, and status
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <ReportTableHeader
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder='Search unit, component, model, WO / MR / PR / PO, BA PCR no…'
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
                label='Rep Date'
                value={repMonth}
                onChange={e => setRepMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='Status'
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map(s => (
                  <MenuItem key={s || 'all'} value={s}>
                    {s || 'All'}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
          </ReportTableHeader>
          <ReportDataGrid
            columns={columns}
            getRowId={row => row.idRep}
            minWidth={PCR_REPORT_MIN_WIDTH}
            stickyColumns
            sx={pcrReportStickySx}
            {...serverGridProps}
          />
        </Card>
      </Grid>
    </Grid>
  )
}

PcrReportPage.authGuard = true

export default PcrReportPage
