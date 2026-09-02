// ** React Imports
import { useCallback, useEffect, useMemo, useState } from 'react'

// ** Next Imports
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

// ** Third Party Imports
import toast from 'react-hot-toast'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Custom Components Imports
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import PageHeader from 'src/@core/components/page-header'

// ** Utils
import arkaApi from 'src/utils/arka-api'

// ** View Components
import SubmitBaPcrDialog from 'src/views/pcr/forecasts/SubmitBaPcrDialog'
import ConvertForecastDialog from 'src/views/pcr/forecasts/ConvertForecastDialog'
import ForecastDialog from 'src/views/pcr/forecasts/ForecastDialog'
import { buildForecastGridColumns } from 'src/views/pcr/forecasts/forecastGridColumns'

// ** Hooks
import useCan from 'src/hooks/useCan'
import useForecastRowHandlers from 'src/hooks/useForecastRowHandlers'

const EquipmentForecastsPage = () => {
  const router = useRouter()
  const { can } = useCan()
  const { fleetId } = router.query

  const canEdit = can('forecasts.update')
  const canDelete = can('forecasts.delete')
  const canCreate = can('forecasts.create')
  const canSubmit = can('forecasts.submit')

  const [equipment, setEquipment] = useState(null)
  const [rows, setRows] = useState([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })

  const fetchData = useCallback(async () => {
    if (!fleetId) return

    setLoading(true)
    try {
      const params = {
        fleetUnitId: fleetId,
        page: paginationModel.page,
        pageSize: paginationModel.pageSize,
        sortField: 'compDesc',
        sortOrder: 'asc'
      }
      if (statusFilter) params.status = statusFilter

      const [equipmentRes, forecastRes] = await Promise.all([
        arkaApi.get(`/fleet/units/${fleetId}`),
        arkaApi.get('/forecasts', { params })
      ])

      setEquipment(equipmentRes.data)
      const payload = forecastRes.data
      setRows(Array.isArray(payload?.rows) ? payload.rows : [])
      setRowCount(payload?.total ?? 0)
    } catch {
      toast.error('Failed to load forecasts')
    } finally {
      setLoading(false)
    }
  }, [fleetId, statusFilter, paginationModel.page, paginationModel.pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPaginationModel(prev => ({ ...prev, page: 0 }))
  }, [statusFilter])

  const {
    userId,
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
  } = useForecastRowHandlers({ onReload: fetchData, fleetId })

  const handleCreate = async formData => {
    await arkaApi.post('/forecasts', formData, { skipGlobalErrorToast: true })
    toast.success('Forecast created')
    setDialogOpen(false)
    fetchData()
  }

  const handleExport = async () => {
    const query = statusFilter ? `?fleetUnitId=${fleetId}&status=${statusFilter}` : `?fleetUnitId=${fleetId}`
    const response = await fetch(`/api/exports/forecasts${query}`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pcr-forecast-${fleetId}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const columns = useMemo(
    () =>
      buildForecastGridColumns({
        scope: 'unit',
        canEdit,
        canDelete,
        canSubmit,
        userId,
        can,
        handleRowAction
      }),
    [can, canDelete, canEdit, canSubmit, handleRowAction, userId]
  )

  if (!fleetId) return null

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant='tonal'
            color='secondary'
            startIcon={<Icon icon='tabler:arrow-left' />}
            onClick={() => router.push(`/units/${fleetId}`)}
          >
            Back
          </Button>
          <PageHeader
            title={<Typography variant='h4'>PCR Forecast</Typography>}
            subtitle={
              <Typography sx={{ color: 'text.secondary' }}>
                {equipment?.unit_no ?? fleetId} — {equipment?.description ?? ''}
              </Typography>
            }
          />
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <Box
            sx={{
              py: 4,
              px: 6,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant={statusFilter === '' ? 'contained' : 'tonal'} onClick={() => setStatusFilter('')}>
                All
              </Button>
              <Button variant={statusFilter === 'OPEN' ? 'contained' : 'tonal'} onClick={() => setStatusFilter('OPEN')}>
                Open
              </Button>
              <Button
                variant={statusFilter === 'CLOSED' ? 'contained' : 'tonal'}
                onClick={() => setStatusFilter('CLOSED')}
              >
                Closed
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant='tonal' color='secondary' onClick={handleExport}>
                Export Excel
              </Button>
              {canCreate ? (
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => setDialogOpen(true)}
                  disabled={!equipment?.model_id}
                >
                  Add Forecast
                </Button>
              ) : null}
            </Box>
          </Box>
          <DataGrid
            autoHeight
            rows={rows}
            rowCount={rowCount}
            columns={columns}
            loading={loading}
            getRowId={row => row.idForecast}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode='server'
          />
        </Card>
      </Grid>

      <ForecastDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fleetUnitId={Number(fleetId)}
        fleetModelId={equipment?.model_id}
        onSubmit={handleCreate}
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
          fetchData()
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Forecast?'
        message={
          deleteTarget
            ? `Delete forecast for ${deleteTarget.compDesc ?? deleteTarget.commod?.comp?.compDesc ?? 'component'}?`
            : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Grid>
  )
}

EquipmentForecastsPage.authGuard = true

export default EquipmentForecastsPage
