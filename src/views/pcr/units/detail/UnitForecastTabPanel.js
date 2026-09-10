/**
 * PCR Forecast tab — daftar forecast per unit + aksi (mirip PCR Actual tab).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/router'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'

import arkaApi from 'src/utils/arka-api'
import { apiPath } from 'src/utils/base-path'
import { forecastCreatePath } from 'src/utils/forecast-form-href'

import useCan from 'src/hooks/useCan'
import useForecastRowHandlers from 'src/hooks/useForecastRowHandlers'
import useUnitTabSearch from 'src/hooks/useUnitTabSearch'

import SubmitBaPcrDialog from 'src/views/pcr/forecasts/SubmitBaPcrDialog'
import ConvertForecastDialog from 'src/views/pcr/forecasts/ConvertForecastDialog'
import ForecastPcrTypeDialog from 'src/views/pcr/forecasts/ForecastPcrTypeDialog'
import { buildForecastGridColumns } from 'src/views/pcr/forecasts/forecastGridColumns'
import UnitTabPanelShell from 'src/views/pcr/units/detail/UnitTabPanelShell'

const UnitForecastTabPanel = ({ fleetId, unit, isActive }) => {
  const router = useRouter()
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
  } = useForecastRowHandlers({ onReload: fetchData, fleetId })

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
      <UnitTabPanelShell
          gridKey='forecast'
          title='PCR Forecast'
          subtitle='Planned component replacements for this unit'
          fullPageHref={`/units/${fleetId}/forecasts`}
          fullPageLabel='Manage all forecasts'
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onExport={async () => {
            const response = await fetch(apiPath(`/exports/forecasts?fleetUnitId=${fleetId}`))
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
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() =>
                    router.push(
                      forecastCreatePath({
                        fleetUnitId: fleetId,
                        from: `/units/${fleetId}?tab=forecast`
                      })
                    )
                  }
                  disabled={!fleetModelId}
                >
                  Add Forecast
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  variant='tonal'
                  color='error'
                  startIcon={<Icon icon='tabler:trash' />}
                  onClick={() => setDeleteAllOpen(true)}
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

      <ForecastPcrTypeDialog
        open={Boolean(pcrTypeTarget)}
        forecast={pcrTypeTarget}
        onClose={() => setPcrTypeTarget(null)}
        onSuccess={fetchData}
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
