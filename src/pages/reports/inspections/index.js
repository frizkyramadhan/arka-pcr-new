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

// ** Hooks
import useReportPage from 'src/hooks/useReportPage'

// ** View Components
import ReportDataGrid from 'src/views/pcr/reports/ReportDataGrid'
import ReportTableHeader from 'src/views/pcr/reports/ReportTableHeader'
import { buildInspectionReportColumns } from 'src/views/pcr/reports/reportGridColumns'

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'FC', label: 'Filter Cut' },
  { value: 'MPS', label: 'Magnetic' },
  { value: 'VI', label: 'Visual' },
  { value: 'TA2', label: 'TA2' },
  { value: 'ED', label: 'Electronic' }
]

const RATING_OPTIONS = ['', 'A', 'B', 'C', 'X']

const InspectionReportPage = () => {
  const [typeFilter, setTypeFilter] = useState('')
  const [ratingFilter, setRatingFilter] = useState('')
  const [insDateFrom, setInsDateFrom] = useState('')
  const [insDateTo, setInsDateTo] = useState('')

  const domainFilterParams = useMemo(() => {
    const params = {}
    if (typeFilter) params.type = typeFilter
    if (ratingFilter) params.rating = ratingFilter
    if (insDateFrom) params.insDateFrom = insDateFrom
    if (insDateTo) params.insDateTo = insDateTo

    return params
  }, [insDateFrom, insDateTo, ratingFilter, typeFilter])

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
    apiPath: '/inspections',
    filterParams: domainFilterParams,
    defaultSortField: 'insDate',
    defaultSortOrder: 'desc'
  })

  const handleExport = useCallback(async () => {
    try {
      await downloadExport('inspections', exportParams, 'inspection-summary.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }, [exportParams])

  const columns = useMemo(() => buildInspectionReportColumns(), [])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Summary Inspections</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Project, inspection date, unit, component, hour meter, type, and rating
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <ReportTableHeader
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder='Search unit no, component, type, rating…'
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
                type='date'
                fullWidth
                size='small'
                label='Inspection Date From'
                value={insDateFrom}
                onChange={e => setInsDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                type='date'
                fullWidth
                size='small'
                label='Inspection Date To'
                value={insDateTo}
                onChange={e => setInsDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='Inspection Type'
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                {TYPE_OPTIONS.map(option => (
                  <MenuItem key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='Rating'
                value={ratingFilter}
                onChange={e => setRatingFilter(e.target.value)}
              >
                {RATING_OPTIONS.map(r => (
                  <MenuItem key={r || 'all'} value={r}>
                    {r || 'All'}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
          </ReportTableHeader>
          <ReportDataGrid
            columns={columns}
            getRowId={row => row.idIns}
            minWidth={1400}
            {...serverGridProps}
          />
        </Card>
      </Grid>
    </Grid>
  )
}

InspectionReportPage.authGuard = true

export default InspectionReportPage
