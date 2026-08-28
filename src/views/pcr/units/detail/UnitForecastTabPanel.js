/**
 * PCR Forecast tab — daftar forecast per unit + aksi (mirip PCR Actual tab).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'

import arkaApi from 'src/utils/arka-api'

import useCan from 'src/hooks/useCan'
import useForecastRowHandlers from 'src/hooks/useForecastRowHandlers'
import useUnitTabSearch from 'src/hooks/useUnitTabSearch'

import CloseForecastDialog from 'src/views/pcr/forecasts/CloseForecastDialog'
import SubmitBaPcrDialog from 'src/views/pcr/forecasts/SubmitBaPcrDialog'
import ConvertForecastDialog from 'src/views/pcr/forecasts/ConvertForecastDialog'
import ForecastDialog from 'src/views/pcr/forecasts/ForecastDialog'
import ForecastGenerateOverlay from 'src/views/pcr/forecasts/ForecastGenerateOverlay'
import { buildForecastGridColumns } from 'src/views/pcr/forecasts/forecastGridColumns'
import UnitTabPanelShell from 'src/views/pcr/units/detail/UnitTabPanelShell'

const UnitForecastTabPanel = ({ fleetId, unit, isActive }) => {
  const { can } = useCan()
  const canEdit = can('forecasts.update')
  const canDelete = can('forecasts.delete')
  const canCreate = can('forecasts.create')
  const canSubmit = can('forecasts.submit')
  const fleetModelId = unit?.model_id

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const [rows, setRows] = useState([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)
  const { searchInput, setSearchInput, search } = useUnitTabSearch()

  useEffect(() => {
    setPaginationModel(prev => ({ ...prev, page: 0 }))
  }, [search])

  const fetchData = useCallback(async () => {
    if (!fleetId || !isActive) return

    setLoading(true)
    setDataReady(false)

    try {
      const params = {
        fleetUnitId: fleetId,
        page: paginationModel.page,
        pageSize: paginationModel.pageSize,
        sortField: 'compDesc',
        sortOrder: 'asc'
      }
      if (search) params.search = search

      const { data } = await arkaApi.get('/forecasts', { params })

      setRows(Array.isArray(data?.rows) ? data.rows : [])
      setRowCount(data?.total ?? 0)
      setDataReady(true)
    } catch {
      setRows([])
      setRowCount(0)
      setDataReady(true)
      toast.error('Failed to load PCR forecast data')
    } finally {
      setLoading(false)
    }
  }, [fleetId, isActive, paginationModel.page, paginationModel.pageSize, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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
  } = useForecastRowHandlers({ onReload: fetchData, fleetId })

  const handleCreate = async formData => {
    try {
      await arkaApi.post('/forecasts', formData)
      toast.success('Forecast created')
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Create failed')
    }
  }

  const handleAutoGenerate = async () => {
    setGenerating(true)
    try {
      const { data } = await arkaApi.post('/forecasts/generate', {
        fleetUnitId: Number(fleetId),
        lifeThreshold: 100
      })
      toast.success(`Auto-generated ${data.created} forecast(s), skipped ${data.skipped}`)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Auto generate failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteAllConfirm = async () => {
    setDeletingAll(true)
    try {
      const { data } = await arkaApi.delete(`/fleet/units/${fleetId}/forecasts`)
      toast.success(`Deleted ${data.deleted} forecast(s)${data.skipped ? `, skipped ${data.skipped}` : ''}`)
      setDeleteAllOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Delete all failed')
    } finally {
      setDeletingAll(false)
    }
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
        handleRowAction,
        actionButtonSize: 'small'
      }),
    [can, canDelete, canEdit, canSubmit, handleRowAction, userId]
  )

  if (!isActive) return null

  return (
    <>
      <Box sx={{ position: 'relative' }}>
        <UnitTabPanelShell
          gridKey='forecast'
          title='PCR Forecast'
          subtitle='Planned component replacements for this unit'
          fullPageHref={`/units/${fleetId}/forecasts`}
          fullPageLabel='Manage all forecasts'
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onExport={async () => {
            const response = await fetch(`/api/exports/forecasts?fleetUnitId=${fleetId}`)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `forecast-${fleetId}.xlsx`
            link.click()
            window.URL.revokeObjectURL(url)
          }}
          toolbarExtra={
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
              {canCreate ? (
                <>
                  <Button
                    variant='tonal'
                    startIcon={
                      generating ? <CircularProgress size={18} color='inherit' /> : <Icon icon='tabler:wand' />
                    }
                    onClick={handleAutoGenerate}
                    disabled={generating || !fleetModelId}
                  >
                    {generating ? 'Generating...' : 'Auto Generate'}
                  </Button>
                  <Button
                    variant='contained'
                    startIcon={<Icon icon='tabler:plus' />}
                    onClick={() => setDialogOpen(true)}
                    disabled={!fleetModelId || generating}
                  >
                    Add Forecast
                  </Button>
                </>
              ) : null}
              {canDelete ? (
                <Button
                  variant='tonal'
                  color='error'
                  startIcon={<Icon icon='tabler:trash' />}
                  onClick={() => setDeleteAllOpen(true)}
                  disabled={generating}
                >
                  Delete All
                </Button>
              ) : null}
            </Box>
          }
          rows={dataReady ? rows : []}
          columns={columns}
          loading={loading || !dataReady}
          rowCount={rowCount}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          getRowId={row => row.idForecast}
          emptyMessage='No forecasts for this unit.'
        />
        <ForecastGenerateOverlay
          open={generating}
          subtitle='Checking components and life % for this unit'
        />
      </Box>

      <ForecastDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fleetUnitId={Number(fleetId)}
        fleetModelId={fleetModelId}
        onSubmit={handleCreate}
      />

      <CloseForecastDialog
        open={Boolean(closeTarget)}
        forecast={closeTarget}
        onClose={() => setCloseTarget(null)}
        onSuccess={() => {
          toast.success('Forecast closed')
          fetchData()
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

      <DeleteConfirmDialog
        open={deleteAllOpen}
        title='Delete All Forecasts?'
        message={`Delete all open forecasts for unit ${unit?.unit_no ?? fleetId}? Submitted or closed forecasts will be skipped.`}
        loading={deletingAll}
        onClose={() => setDeleteAllOpen(false)}
        onConfirm={handleDeleteAllConfirm}
      />
    </>
  )
}

export default UnitForecastTabPanel
