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
import TableRowActions from 'src/@core/components/table-row-actions'

// ** Utils
import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate } from 'src/utils/date-format'

// ** View Components
import { extractModelComponents, toComponentSelectOptions } from 'src/views/pcr/inspections/componentOptions'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'
import SosDialog from 'src/views/pcr/sos/SosDialog'
import SosFilters from 'src/views/pcr/sos/SosFilters'
import { buildSosActions } from 'src/views/pcr/sos/sosRowActions'

// ** Hooks
import useCan from 'src/hooks/useCan'

const EquipmentSosPage = () => {
  const router = useRouter()
  const { can } = useCan()
  const { fleetId } = router.query

  const canEdit = can('sos.update')
  const canCreate = can('sos.create')
  const canDelete = can('sos.delete')

  const [equipment, setEquipment] = useState(null)
  const [componentOptions, setComponentOptions] = useState([])
  const [hasComponents, setHasComponents] = useState(false)
  const [rows, setRows] = useState([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [evalFilter, setEvalFilter] = useState('')
  const [componentFilter, setComponentFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
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
      if (evalFilter) params.evalCode = evalFilter
      if (componentFilter) params.idMod = componentFilter

      const [equipmentRes, sosRes] = await Promise.all([
        arkaApi.get(`/fleet/units/${fleetId}`),
        arkaApi.get('/sos', { params })
      ])

      const equipmentData = equipmentRes.data
      setEquipment(equipmentData)

      if (equipmentData?.model_id) {
        arkaApi
          .get('/model-components', { params: { fleetModelId: equipmentData.model_id, pageSize: 100 } })
          .then(res => {
            const items = extractModelComponents(res.data)
            setComponentOptions(toComponentSelectOptions(items))
            setHasComponents(items.length > 0)
          })
          .catch(() => {
            setComponentOptions([])
            setHasComponents(false)
          })
      } else {
        setComponentOptions([])
        setHasComponents(false)
      }

      const payload = sosRes.data
      if (payload && Array.isArray(payload.rows)) {
        setRows(payload.rows)
        setRowCount(payload.total ?? payload.rows.length)
      } else {
        const list = Array.isArray(payload) ? payload : []
        setRows(list)
        setRowCount(list.length)
      }
    } catch (error) {
      toast.error('Failed to load SOS records')
    } finally {
      setLoading(false)
    }
  }, [fleetId, evalFilter, componentFilter, paginationModel.page, paginationModel.pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPaginationModel(prev => ({ ...prev, page: 0 }))
  }, [evalFilter, componentFilter])

  const handleExport = async () => {
    const params = new URLSearchParams({ fleetUnitId: String(fleetId) })
    if (evalFilter) params.set('evalCode', evalFilter)
    if (componentFilter) params.set('idMod', componentFilter)

    const response = await fetch(`/api/exports/sos?${params}`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sos-${fleetId}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const handleImport = async event => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('fleetUnitId', fleetId)

    try {
      const { data } = await arkaApi.post('/imports/sos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`Imported ${data.imported} SOS record(s)`)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Import failed')
    } finally {
      event.target.value = ''
    }
  }

  const handleRowAction = useCallback(
    async (action, row) => {
      try {
        if (action === 'edit') {
          const { data } = await arkaApi.get(`/sos/${row.idSos}`)
          setSelected(data)
          setDrawerOpen(true)

          return
        }

        if (action === 'delete') {
          setDeleteTarget(row)

          return
        }

        fetchData()
      } catch (error) {
        toast.error(error.response?.data?.error ?? 'Action failed')
      }
    },
    [fetchData]
  )

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      await arkaApi.delete(`/sos/${deleteTarget.idSos}`)
      toast.success('SOS deleted')
      setDeleteTarget(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const toggleDrawer = () => {
    setDrawerOpen(prev => !prev)
    if (drawerOpen) setSelected(null)
  }

  const openAddDrawer = () => {
    setSelected(null)
    setDrawerOpen(true)
  }

  const columns = useMemo(
    () => [
      {
        flex: 1.4,
        minWidth: 120,
        field: 'compDesc',
        headerName: 'Component',
        valueGetter: ({ row }) => row.commod?.comp?.compDesc ?? '—'
      },
      {
        flex: 1,
        minWidth: 100,
        field: 'sampleDate',
        headerName: 'Sample Date',
        valueFormatter: ({ value }) => formatDisplayDate(value)
      },
      { flex: 1, minWidth: 90, field: 'labNo', headerName: 'Lab No' },
      { flex: 1, minWidth: 90, field: 'oilType', headerName: 'Oil Type' },
      {
        flex: 0.9,
        minWidth: 80,
        field: 'evalCode',
        headerName: 'Eval. Code',
        renderCell: ({ row }) => <SosRatingChip rating={row.evalCode} />
      },
      {
        flex: 0.9,
        minWidth: 80,
        field: 'hOil',
        headerName: 'Hour Oil',
        valueFormatter: ({ value }) => (value !== null && value !== undefined ? Number(value) : '—')
      },
      {
        flex: 0.9,
        minWidth: 80,
        field: 'hUnit',
        headerName: 'Hour Unit',
        valueFormatter: ({ value }) => (value !== null && value !== undefined ? Number(value) : '—')
      },
      {
        flex: 0.9,
        minWidth: 85,
        field: 'oilChange',
        headerName: 'Oil Change',
        valueFormatter: ({ value }) => (value ? 'Yes' : 'No')
      },
      {
        flex: 0.9,
        minWidth: 85,
        field: 'oilAdded',
        headerName: 'Oil Added (L)',
        valueGetter: ({ row }) => {
          if (!row.oilChange) return '—'
          if (row.oilAdded === null || row.oilAdded === undefined || row.oilAdded === '') return '—'

          return `${Number(row.oilAdded)} L`
        }
      },
      {
        flex: 1.2,
        minWidth: 280,
        sortable: false,
        field: 'actions',
        headerName: 'Actions',
        renderCell: ({ row }) => (
          <TableRowActions buttonSize='medium' actions={buildSosActions(row, canEdit, canDelete, handleRowAction)} />
        )
      }
    ],
    [canEdit, canDelete, handleRowAction]
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
            onClick={() => router.push(`/units/${fleetId}?tab=sos`)}
          >
            Back
          </Button>
          <PageHeader
            title={<Typography variant='h4'>SOS Records</Typography>}
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
          <Box sx={{ py: 4, px: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <SosFilters
              evalFilter={evalFilter}
              componentFilter={componentFilter}
              componentOptions={componentOptions}
              onEvalChange={setEvalFilter}
              onComponentChange={setComponentFilter}
            />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button variant='tonal' color='secondary' onClick={handleExport}>
                Export Excel
              </Button>
              {canCreate ? (
                <Button component='label' variant='tonal' color='secondary'>
                  Import Excel
                  <input hidden type='file' accept='.xlsx' onChange={handleImport} />
                </Button>
              ) : null}
              {canCreate && hasComponents ? (
                <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={openAddDrawer}>
                  Add SOS
                </Button>
              ) : null}
            </Box>
          </Box>
          <DataGrid
            autoHeight
            sx={{ width: '100%' }}
            rows={rows}
            rowCount={rowCount}
            columns={columns}
            loading={loading}
            getRowId={row => row.idSos}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode='server'
          />
        </Card>
      </Grid>

      <SosDialog
        open={drawerOpen}
        toggle={toggleDrawer}
        record={selected}
        fleetUnitId={Number(fleetId)}
        fleetModelId={equipment?.model_id}
        latestHmUnit={equipment?.latest_hm_unit ?? null}
        onSaved={fetchData}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete SOS Record?'
        message={
          deleteTarget
            ? `Are you sure you want to delete this SOS record for ${
                deleteTarget.commod?.comp?.compDesc ?? 'this component'
              }? This will recalculate condition ratings.`
            : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Grid>
  )
}

EquipmentSosPage.authGuard = true

export default EquipmentSosPage
