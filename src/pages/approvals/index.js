// ** React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// ** Next Imports
import { useRouter } from 'next/router'

// ** MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

// ** Custom Components Imports
import PageHeader from 'src/@core/components/page-header'

// ** Utils
import arkaApi from 'src/utils/arka-api'
import { FORECAST_APPROVAL_LEVEL_LABELS, getApproveLevelsFromCan } from 'src/utils/forecast-approval-auth'

// ** Hooks
import useCan from 'src/hooks/useCan'
import useServerDataGrid from 'src/hooks/useServerDataGrid'

// ** View Components
import ForecastApprovalTableHeader from 'src/views/pcr/forecasts/ForecastApprovalTableHeader'
import { buildForecastApprovalGridColumns } from 'src/views/pcr/forecasts/forecastApprovalGridColumns'

const ApprovalsPage = () => {
  const router = useRouter()
  const { can } = useCan()

  const [projects, setProjects] = useState([])

  const [filters, setFilters] = useState({
    unitNo: '',
    quarter: '',
    baPcrStatus: 'pending',
    statusBaPcr: '',
    projectCode: '',
    planMonth: ''
  })

  const filterParams = useMemo(() => {
    const params = {}
    if (filters.unitNo.trim()) params.unitNo = filters.unitNo.trim()
    if (filters.quarter) params.quarter = filters.quarter
    params.baPcrStatus = filters.baPcrStatus
    if (filters.statusBaPcr) params.statusBaPcr = filters.statusBaPcr
    if (filters.projectCode) params.projectCode = filters.projectCode
    if (filters.planMonth) params.planMonth = filters.planMonth

    return params
  }, [filters])

  const { serverGridProps } = useServerDataGrid({
    apiPath: '/forecast-approvals',
    filterParams
  })

  useEffect(() => {
    arkaApi
      .get('/fleet/projects')
      .then(res => setProjects(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProjects([]))
  }, [])

  const approveLevels = useMemo(() => getApproveLevelsFromCan(can), [can])

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleReview = useCallback(
    row => {
      router.push(`/approvals/${row.idBaPcr}`)
    },
    [router]
  )

  const columns = useMemo(
    () => buildForecastApprovalGridColumns({ onReview: handleReview }),
    [handleReview]
  )

  const userRolesLabel =
    approveLevels.length > 0
      ? approveLevels.map(level => FORECAST_APPROVAL_LEVEL_LABELS[level] ?? level).join(', ')
      : null
  const showProjectFilter = projects.length > 1

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Forecast Approvals</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              {userRolesLabel
                ? `Open forecasts with BA PCR — awaiting your approval (${userRolesLabel}). Open Review to approve or reject.`
                : 'Open forecasts with BA PCR awaiting approval. Open Review to approve or reject.'}
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <ForecastApprovalTableHeader
            filters={filters}
            onFilterChange={handleFilterChange}
            projects={projects}
            showProjectFilter={showProjectFilter}
          />
          <DataGrid
            autoHeight
            columns={columns}
            getRowId={row => row.idForecast}
            disableRowSelectionOnClick
            sx={{ '& .MuiDataGrid-columnHeaders': { borderRadius: 0 } }}
            {...serverGridProps}
          />
        </Card>
      </Grid>
    </Grid>
  )
}

ApprovalsPage.authGuard = true

export default ApprovalsPage
