// ** React Imports
import { useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/router'

// ** MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

// ** Third Party Imports
import toast from 'react-hot-toast'

// ** Custom Components Imports
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import PageHeader from 'src/@core/components/page-header'

// ** Utils
import arkaApi from 'src/utils/arka-api'
import { planPeriodFromMonthInput } from 'src/utils/forecast-plan-period'

// ** View Components
import SubmitBaPcrDialog from 'src/views/pcr/forecasts/SubmitBaPcrDialog'
import ConvertForecastDialog from 'src/views/pcr/forecasts/ConvertForecastDialog'
import ForecastPcrTypeDialog from 'src/views/pcr/forecasts/ForecastPcrTypeDialog'
import ForecastTableHeader from 'src/views/pcr/forecasts/ForecastTableHeader'
import { buildForecastGridColumns } from 'src/views/pcr/forecasts/forecastGridColumns'

// ** Hooks
import useCan from 'src/hooks/useCan'
import useForecastRowHandlers from 'src/hooks/useForecastRowHandlers'
import useServerDataGrid from 'src/hooks/useServerDataGrid'

const ForecastsPage = () => {
  const router = useRouter()
  const { can } = useCan()
  const canEdit = can('forecasts.update')
  const canDelete = can('forecasts.delete')
  const canSubmit = can('forecasts.submit')

  const [projects, setProjects] = useState([])

  const [filters, setFilters] = useState({
    modelName: '',
    unitNo: '',
    compDesc: '',
    hmComponent: '',
    policy: '',
    lifePercent: '',
    ratingSos: '',
    ratingCbm: '',
    planMonth: '',
    projectCode: '',
    quarter: '',
    status: 'OPEN',
    baPcrStatus: ''
  })

  const filterParams = useMemo(() => {
    const params = {}
    if (filters.modelName) params.modelName = filters.modelName
    if (filters.unitNo) params.unitNo = filters.unitNo
    if (filters.compDesc) params.compDesc = filters.compDesc
    if (filters.hmComponent) params.hmComponent = filters.hmComponent
    if (filters.policy) params.policy = filters.policy
    if (filters.lifePercent) params.lifePercent = filters.lifePercent
    if (filters.ratingSos) params.ratingSos = filters.ratingSos
    if (filters.ratingCbm) params.ratingCbm = filters.ratingCbm
    if (filters.projectCode) params.projectCode = filters.projectCode
    if (filters.quarter) params.quarter = filters.quarter
    if (filters.status) params.status = filters.status
    if (filters.baPcrStatus) params.baPcrStatus = filters.baPcrStatus
    if (filters.planMonth) {
      const planPeriod = planPeriodFromMonthInput(filters.planMonth)
      if (planPeriod) params.planPeriod = planPeriod
    }

    return params
  }, [filters])

  const { serverGridProps, reload } = useServerDataGrid({
    apiPath: '/forecasts',
    filterParams
  })

  const {
    userId,
    convertTarget,
    setConvertTarget,
    submitBaTarget,
    setSubmitBaTarget,
    pcrTypeTarget,
    setPcrTypeTarget,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleRowAction,
    handleDeleteConfirm,
    handleConvertSuccess
  } = useForecastRowHandlers({ onReload: reload })

  useEffect(() => {
    arkaApi
      .get('/fleet/projects')
      .then(res => setProjects(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProjects([]))
  }, [])

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleBulkRefresh = async () => {
    try {
      const { data } = await arkaApi.put('/forecasts/generate', {
        quarter: filters.quarter || undefined,
        projectCode: filters.projectCode || undefined
      })
      toast.success(`Refreshed ${data.refreshed} forecast(s)`)
      reload()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Bulk refresh failed')
    }
  }

  const columns = useMemo(
    () =>
      buildForecastGridColumns({
        scope: 'list',
        canEdit,
        canDelete,
        canSubmit,
        userId,
        can,
        handleRowAction
      }),
    [can, canDelete, canEdit, canSubmit, handleRowAction, userId]
  )

  const showProjectFilter = projects.length > 1

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>PCR Forecast</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Plan component replacements with life % and BA PCR approval workflow
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <ForecastTableHeader
            filters={filters}
            onFilterChange={handleFilterChange}
            projects={projects}
            showProjectFilter={showProjectFilter}
            canEdit={canEdit}
            onAdd={() => router.push('/forecasts/create')}
            onBulkRefresh={handleBulkRefresh}
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

      <ConvertForecastDialog
        open={Boolean(convertTarget)}
        forecast={convertTarget}
        onClose={() => setConvertTarget(null)}
        onSuccess={handleConvertSuccess}
      />

      <SubmitBaPcrDialog
        open={Boolean(submitBaTarget)}
        forecast={submitBaTarget}
        onClose={() => setSubmitBaTarget(null)}
        onSuccess={() => {
          toast.success('BA PCR submitted')
          reload()
        }}
      />

      <ForecastPcrTypeDialog
        open={Boolean(pcrTypeTarget)}
        forecast={pcrTypeTarget}
        onClose={() => setPcrTypeTarget(null)}
        onSuccess={reload}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Forecast?'
        message={
          deleteTarget
            ? `Delete forecast for ${deleteTarget.unitNo} — ${deleteTarget.compDesc ?? 'component'}?`
            : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Grid>
  )
}

ForecastsPage.authGuard = true

export default ForecastsPage
