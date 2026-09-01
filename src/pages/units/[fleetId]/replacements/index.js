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
import CustomChip from 'src/@core/components/mui/chip'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import PageHeader from 'src/@core/components/page-header'

// ** Utils
import arkaApi from 'src/utils/arka-api'
import { formatUploadError } from 'src/utils/format-upload-error'
import { pickAndUploadReplacementReport } from 'src/utils/pick-replacement-report-upload'

import { resolveOpenHmRepDisplay } from '@/lib/replacement/hm-rep'

// ** View Components
import LifeProgressBar from 'src/views/pcr/replacements/LifeProgressBar'
import ReplacementDialog from 'src/views/pcr/replacements/ReplacementDialog'
import ReplacementRowActions from 'src/views/pcr/replacements/replacementRowActions'
import ReplacementForecastLink from 'src/views/pcr/replacements/ReplacementForecastLink'
import CloseReplacementDialog from 'src/views/pcr/replacements/CloseReplacementDialog'
import ReopenReplacementDialog from 'src/views/pcr/replacements/ReopenReplacementDialog'
import ForecastDialog from 'src/views/pcr/forecasts/ForecastDialog'

// ** Hooks
import useCan from 'src/hooks/useCan'

const formatDate = value => (value ? String(value).slice(0, 10) : '—')

const isMajorRow = row => {
  const type = row.commod?.comp?.compType ?? row.commod?.lifeType

  return type === 'MAJOR'
}

const EquipmentReplacementsPage = () => {
  const router = useRouter()
  const { can, canAny } = useCan()
  const { fleetId } = router.query

  const canEdit = can('replacements.update')
  const canDelete = can('replacements.delete')
  const canCreateForecast = can('forecasts.create')
  const canManageClosed = canAny(['system.admin', 'replacements.update'])
  const canEditClosed = canAny(['system.admin', 'replacements.edit.close'])

  const [equipment, setEquipment] = useState(null)
  const [rows, setRows] = useState([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [reopenTarget, setReopenTarget] = useState(null)
  const [reopening, setReopening] = useState(false)
  const [closeTarget, setCloseTarget] = useState(null)
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false)
  const [forecastTarget, setForecastTarget] = useState(null)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })

  const fetchData = useCallback(async () => {
    if (!fleetId) return

    setLoading(true)
    try {
      const params = {
        fleetUnitId: fleetId,
        page: paginationModel.page,
        pageSize: paginationModel.pageSize
      }
      if (statusFilter) params.status = statusFilter

      const [equipmentRes, replacementRes] = await Promise.all([
        arkaApi.get(`/fleet/units/${fleetId}`),
        arkaApi.get('/replacements', { params })
      ])

      setEquipment(equipmentRes.data)
      const payload = replacementRes.data
      if (payload && Array.isArray(payload.rows)) {
        setRows(payload.rows)
        setRowCount(payload.total ?? payload.rows.length)
      } else {
        const list = Array.isArray(payload) ? payload : []
        setRows(list)
        setRowCount(list.length)
      }
    } catch (error) {
      toast.error('Failed to load replacements')
    } finally {
      setLoading(false)
    }
  }, [fleetId, statusFilter, paginationModel.page, paginationModel.pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    // Reset page when status filter changes
    setPaginationModel(prev => ({ ...prev, page: 0 }))
  }, [statusFilter])

  const handleSave = async formData => {
    if (!selected) {
      toast.error('New work orders must be created from PCR Forecast')

      return
    }

    try {
      await arkaApi.put(`/replacements/${selected.idRep}`, formData)
      toast.success('Work order updated')
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Save failed')
    }
  }

  const handleExport = async () => {
    const response = await fetch(`/api/exports/replacements/${fleetId}/`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pcr-replacements-${fleetId}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const handleRowAction = useCallback(
    async (action, row) => {
      try {
        if (action === 'edit') {
          const { data } = await arkaApi.get(`/replacements/${row.idRep}`)
          setSelected(data)
          setDialogOpen(true)

          return
        }

        if (action === 'close') {
          setCloseTarget(row)

          return
        }

        if (action === 'upload') {
          pickAndUploadReplacementReport(row.idRep, { onSuccess: fetchData })

          return
        }

        if (action === 'view-report') {
          window.open(`/api/replacements/${row.idRep}/report/`, '_blank')

          return
        }

        if (action === 'delete-report') {
          await arkaApi.delete(`/replacements/${row.idRep}/report`)
          toast.success('Report removed')
        }

        if (action === 'delete') {
          setDeleteTarget(row)

          return
        }

        if (action === 'reopen') {
          setReopenTarget(row)

          return
        }

        if (action === 'create-forecast') {
          setForecastTarget(row)
          setForecastDialogOpen(true)

          return
        }

        fetchData()
      } catch (error) {
        toast.error(error.userMessage ?? formatUploadError(error, { fallback: 'Action failed' }))
      }
    },
    [fetchData]
  )

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      await arkaApi.delete(`/replacements/${deleteTarget.idRep}`)
      toast.success('Work order deleted')
      setDeleteTarget(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleReopenConfirm = async () => {
    if (!reopenTarget) return

    setReopening(true)
    try {
      await arkaApi.post(`/replacements/${reopenTarget.idRep}/reopen`)
      toast.success('Work order reopened')
      setReopenTarget(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Reopen failed')
    } finally {
      setReopening(false)
    }
  }

  const handleForecastCreate = async formData => {
    const payload = forecastTarget?.idRep ? { ...formData, idRep: forecastTarget.idRep } : formData
    const { data } = await arkaApi.post('/forecasts', payload, { skipGlobalErrorToast: true })
    toast.success('Forecast created')
    setForecastDialogOpen(false)
    setForecastTarget(null)
    fetchData()
    if (data?.idForecast) {
      router.push(`/forecasts/${data.idForecast}`)
    }
  }

  const columns = useMemo(
    () => [
      {
        flex: 0.16,
        minWidth: 140,
        field: 'compDesc',
        headerName: 'Component',
        valueGetter: ({ row }) => row.commod?.comp?.compDesc ?? '—'
      },
      {
        flex: 0.1,
        minWidth: 100,
        field: 'repDate',
        headerName: 'Rep Date',
        valueFormatter: ({ value }) => formatDate(value)
      },
      {
        flex: 0.1,
        minWidth: 90,
        field: 'hmRep',
        headerName: 'HM Rep',
        valueGetter: ({ row }) =>
          resolveOpenHmRepDisplay(row, row.liveMetrics?.hmNow ?? equipment?.latest_hm_unit),
        valueFormatter: ({ value }) => (value != null && value !== '' ? Number(value).toLocaleString() : '—')
      },
      {
        flex: 0.1,
        minWidth: 90,
        field: 'woStatus',
        headerName: 'Status',
        renderCell: ({ row }) => (
          <CustomChip
            rounded
            skin='light'
            size='small'
            label={row.woStatus}
            color={row.woStatus === 'OPEN' ? 'info' : 'success'}
          />
        )
      },
      {
        flex: 0.18,
        minWidth: 150,
        field: 'lifePercent',
        headerName: 'Life %',
        renderCell: ({ row }) => {
          if (row.woStatus === 'CLOSE') {
            return <LifeProgressBar percent={row.lifePercent} />
          }

          return <LifeProgressBar percent={row.liveMetrics?.lifePercent ?? 0} />
        }
      },
      {
        flex: 0.1,
        minWidth: 80,
        field: 'report',
        headerName: 'Report',
        renderCell: ({ row }) => (row.report ? 'PDF' : '—')
      },
      {
        flex: 0.16,
        minWidth: 160,
        sortable: false,
        field: 'linkedForecast',
        headerName: 'PCR Forecast',
        renderCell: ({ row }) => <ReplacementForecastLink linkedForecast={row.linkedForecast} />
      },
      {
        flex: 0.3,
        minWidth: 420,
        sortable: false,
        field: 'actions',
        headerName: 'Actions',
        renderCell: ({ row }) => (
          <ReplacementRowActions
            row={row}
            canEdit={canEdit}
            onAction={handleRowAction}
            options={{
              canDelete,
              canManageClosed,
              canEditClosed,
              isMajor: isMajorRow(row),
              canCreateForecast
            }}
          />
        )
      }
    ],
    [canCreateForecast, canDelete, canEdit, canEditClosed, canManageClosed, equipment?.latest_hm_unit, handleRowAction]
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
            title={<Typography variant='h4'>PCR / Replacements</Typography>}
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
                variant={statusFilter === 'CLOSE' ? 'contained' : 'tonal'}
                onClick={() => setStatusFilter('CLOSE')}
              >
                Closed
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant='tonal' color='secondary' onClick={handleExport}>
                Export Excel
              </Button>
            </Box>
          </Box>
          <DataGrid
            autoHeight
            rows={rows}
            rowCount={rowCount}
            columns={columns}
            loading={loading}
            getRowId={row => row.idRep}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode='server'
          />
        </Card>
      </Grid>
      <ReplacementDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onExited={() => setSelected(null)}
        fleetUnitId={Number(fleetId)}
        fleetModelId={equipment?.model_id}
        initialData={selected}
        eligibleIdMods={[]}
        latestHmUnit={equipment?.latest_hm_unit ?? null}
        onRefresh={fetchData}
        onSubmit={handleSave}
        closedEditAllowed={canEditClosed}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Work Order?'
        message={
          deleteTarget
            ? `Are you sure you want to delete WO #${deleteTarget.woNo ?? deleteTarget.idRep}? This will recalculate replacement metrics for this component.`
            : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      <CloseReplacementDialog
        open={Boolean(closeTarget)}
        idRep={closeTarget?.idRep}
        onClose={() => setCloseTarget(null)}
        onSuccess={() => {
          toast.success('Work order closed — next cycle opened')
          fetchData()
        }}
      />

      <ReopenReplacementDialog
        open={Boolean(reopenTarget)}
        idRep={reopenTarget?.idRep}
        woLabel={reopenTarget ? `WO #${reopenTarget.woNo ?? reopenTarget.idRep}` : ''}
        loading={reopening}
        onClose={() => setReopenTarget(null)}
        onConfirm={handleReopenConfirm}
      />

      <ForecastDialog
        open={forecastDialogOpen}
        onClose={() => {
          setForecastDialogOpen(false)
          setForecastTarget(null)
        }}
        fleetUnitId={Number(fleetId)}
        fleetModelId={equipment?.model_id}
        presetIdMod={forecastTarget?.idMod}
        onSubmit={handleForecastCreate}
      />
    </Grid>
  )
}

EquipmentReplacementsPage.authGuard = true

export default EquipmentReplacementsPage
