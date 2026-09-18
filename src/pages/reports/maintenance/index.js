/**
 * Summary Maintenance — report grid + Excel export for FMS maintenance actuals.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomTextField from 'src/@core/components/mui/text-field'
import PageHeader from 'src/@core/components/page-header'

import useReportPage from 'src/hooks/useReportPage'
import arkaApi from 'src/utils/arka-api'
import { downloadExport } from 'src/utils/export-download'

import ReportDataGrid from 'src/views/pcr/reports/ReportDataGrid'
import ReportTableHeader from 'src/views/pcr/reports/ReportTableHeader'
import { buildMaintenanceReportColumns } from 'src/views/pcr/reports/reportGridColumns'

const MaintenanceReportPage = () => {
  const [maintenanceTypes, setMaintenanceTypes] = useState([])
  const [maintenanceTypeId, setMaintenanceTypeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    arkaApi
      .get('/maintenance-types')
      .then(res => {
        const rows = res.data?.allData ?? res.data?.maintenanceTypes ?? []
        setMaintenanceTypes(Array.isArray(rows) ? rows : [])
      })
      .catch(() => setMaintenanceTypes([]))
  }, [])

  const domainFilterParams = useMemo(() => {
    const params = {}
    if (maintenanceTypeId) params.maintenanceTypeId = maintenanceTypeId
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo

    return params
  }, [dateFrom, dateTo, maintenanceTypeId])

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
    apiPath: '/maintenance-actuals',
    filterParams: domainFilterParams,
    defaultSortField: 'maintenanceDate',
    defaultSortOrder: 'desc'
  })

  const handleExport = useCallback(async () => {
    try {
      await downloadExport('maintenance', exportParams, 'maintenance-summary.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }, [exportParams])

  const columns = useMemo(() => buildMaintenanceReportColumns(), [])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Summary Maintenance</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Project, type, period, unit, date, hour meter, and mechanics
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <ReportTableHeader
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder='Search unit, type, project, remarks, mechanics…'
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
            hideComponentFilter
            onExport={handleExport}
          >
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <SearchableSelect
                size='small'
                label='Maintenance Type'
                value={maintenanceTypeId}
                onChange={e => setMaintenanceTypeId(e.target.value)}
                placeholder='Search type…'
                options={[
                  { value: '', label: 'All types' },
                  ...maintenanceTypes.map(type => ({
                    value: type.id,
                    label: type.name
                  }))
                ]}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                type='date'
                fullWidth
                size='small'
                label='Date From'
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                type='date'
                fullWidth
                size='small'
                label='Date To'
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </ReportTableHeader>
          <ReportDataGrid columns={columns} getRowId={row => row.id} minWidth={1400} {...serverGridProps} />
        </Card>
      </Grid>
    </Grid>
  )
}

MaintenanceReportPage.authGuard = true

export default MaintenanceReportPage
