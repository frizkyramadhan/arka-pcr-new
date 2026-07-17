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
import { buildConditionReportColumns } from 'src/views/pcr/reports/reportGridColumns'
import { SOS_EVAL_OPTIONS } from 'src/views/pcr/sos/sosEvalOptions'

const CONDITION_OPTIONS = ['', 'CRITICAL', 'ATTENTION', 'NORMAL', 'MONITOR', 'GOOD']
const SOS_RATING_OPTIONS = ['', ...SOS_EVAL_OPTIONS]

const ConditionReportPage = () => {
  const [conditionFilter, setConditionFilter] = useState('')
  const [sosRatingFilter, setSosRatingFilter] = useState('')
  const [evaluatedAtFrom, setEvaluatedAtFrom] = useState('')
  const [evaluatedAtTo, setEvaluatedAtTo] = useState('')

  const domainFilterParams = useMemo(() => {
    const params = {}
    if (conditionFilter) params.condition = conditionFilter
    if (sosRatingFilter) params.sosRating = sosRatingFilter
    if (evaluatedAtFrom) params.evaluatedAtFrom = evaluatedAtFrom
    if (evaluatedAtTo) params.evaluatedAtTo = evaluatedAtTo

    return params
  }, [conditionFilter, evaluatedAtFrom, evaluatedAtTo, sosRatingFilter])

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
    apiPath: '/conditions',
    filterParams: domainFilterParams,
    defaultSortField: 'evaluatedAt',
    defaultSortOrder: 'desc'
  })

  const handleExport = useCallback(async () => {
    try {
      await downloadExport('conditions', exportParams, 'condition-summary.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }, [exportParams])

  const columns = useMemo(() => buildConditionReportColumns(), [])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Summary Condition</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Project, unit, component, overall condition, basis, SOS/inspection ratings, and evaluated date
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <ReportTableHeader
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder='Search unit no, component, overall, SOS/FC/MPS/VI/TA2/ED…'
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
                label='Evaluated From'
                value={evaluatedAtFrom}
                onChange={e => setEvaluatedAtFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                type='date'
                fullWidth
                size='small'
                label='Evaluated To'
                value={evaluatedAtTo}
                onChange={e => setEvaluatedAtTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='Overall'
                value={conditionFilter}
                onChange={e => setConditionFilter(e.target.value)}
              >
                {CONDITION_OPTIONS.map(c => (
                  <MenuItem key={c || 'all'} value={c}>
                    {c || 'All'}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='SOS Rating'
                value={sosRatingFilter}
                onChange={e => setSosRatingFilter(e.target.value)}
              >
                {SOS_RATING_OPTIONS.map(code => (
                  <MenuItem key={code || 'all'} value={code}>
                    {code || 'All'}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
          </ReportTableHeader>
          <ReportDataGrid
            columns={columns}
            getRowId={row => row.idCondition}
            minWidth={1280}
            {...serverGridProps}
          />
        </Card>
      </Grid>
    </Grid>
  )
}

ConditionReportPage.authGuard = true

export default ConditionReportPage
