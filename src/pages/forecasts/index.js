// ** React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

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
import { unwrapListPayload } from 'src/utils/unwrap-list-payload'

// ** View Components
import CloseForecastDialog from 'src/views/pcr/forecasts/CloseForecastDialog'
import SubmitBaPcrDialog from 'src/views/pcr/forecasts/SubmitBaPcrDialog'
import ConvertForecastDialog from 'src/views/pcr/forecasts/ConvertForecastDialog'
import ForecastDialog from 'src/views/pcr/forecasts/ForecastDialog'
import ForecastTableHeader from 'src/views/pcr/forecasts/ForecastTableHeader'
import ForecastGenerateOverlay from 'src/views/pcr/forecasts/ForecastGenerateOverlay'
import { buildForecastGridColumns } from 'src/views/pcr/forecasts/forecastGridColumns'

// ** Hooks
import useCan from 'src/hooks/useCan'
import useForecastRowHandlers from 'src/hooks/useForecastRowHandlers'
import useServerDataGrid from 'src/hooks/useServerDataGrid'

const ForecastsPage = () => {
  const { can } = useCan()
  const canEdit = can('forecasts.update')
  const canDelete = can('forecasts.delete')
  const canCreate = can('forecasts.create')
  const canSubmit = can('forecasts.submit')

  const [equipments, setEquipments] = useState([])
  const [projects, setProjects] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [filters, setFilters] = useState({
    quarter: '',
    status: 'OPEN',
    baPcrStatus: '',
    projectCode: '',
    planMonth: ''
  })

  const filterParams = useMemo(() => {
    const params = {}
    if (filters.quarter) params.quarter = filters.quarter
    if (filters.status) params.status = filters.status
    if (filters.baPcrStatus) params.baPcrStatus = filters.baPcrStatus
    if (filters.projectCode) params.projectCode = filters.projectCode
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
    closeTarget,
    setCloseTarget,
    convertTarget,
    setConvertTarget,
    submitBaTarget,
    setSubmitBaTarget,
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

  useEffect(() => {
    if (!canCreate) return

    arkaApi
      .get('/fleet/units')
      .then(res => setEquipments(unwrapListPayload(res.data)))
      .catch(() => setEquipments([]))
  }, [canCreate])

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleCreate = async formData => {
    await arkaApi.post('/forecasts', formData, { skipGlobalErrorToast: true })
    toast.success('Forecast created')
    setDialogOpen(false)
    reload()
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const { data } = await arkaApi.post('/forecasts/generate', {
        quarter: filters.quarter || undefined,
        projectCode: filters.projectCode || undefined,
        lifeThreshold: 85
      })
      toast.success(`Generated ${data.created} forecast(s), skipped ${data.skipped}`)
      reload()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Generate failed')
    } finally {
      setGenerating(false)
    }
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
        <Card sx={{ position: 'relative' }}>
          <ForecastTableHeader
            filters={filters}
            onFilterChange={handleFilterChange}
            projects={projects}
            showProjectFilter={showProjectFilter}
            canEdit={canEdit}
            onAdd={() => setDialogOpen(true)}
            onGenerate={handleGenerate}
            onBulkRefresh={handleBulkRefresh}
            generating={generating}
          />
          <DataGrid
            autoHeight
            columns={columns}
            getRowId={row => row.idForecast}
            disableRowSelectionOnClick
            sx={{ '& .MuiDataGrid-columnHeaders': { borderRadius: 0 } }}
            {...serverGridProps}
          />
          <ForecastGenerateOverlay open={generating} />
        </Card>
      </Grid>

      <ForecastDialog open={dialogOpen} onClose={() => setDialogOpen(false)} equipments={equipments} onSubmit={handleCreate} />

      <CloseForecastDialog
        open={Boolean(closeTarget)}
        forecast={closeTarget}
        onClose={() => setCloseTarget(null)}
        onSuccess={() => {
          toast.success('Forecast closed')
          reload()
        }}
      />

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
