/**
 * Panel commod per model — list + CRUD (model readonly dari ARKFleet).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { DataGrid } from '@mui/x-data-grid'

import toast from 'react-hot-toast'

import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import Icon from 'src/@core/components/icon'
import { TableRowActions } from 'src/@core/components/table-row-actions'

import arkaApi from 'src/utils/arka-api'
import { unwrapListPayload } from 'src/utils/unwrap-list-payload'

import ModelCommodDialog from 'src/views/pcr/models/ModelCommodDialog'
import ModelComponentsFilterBar from 'src/views/pcr/models/ModelComponentsFilterBar'

import useCan from 'src/hooks/useCan'

function includesTextFilter(value, query) {
  if (!query?.trim()) return true

  return String(value ?? '')
    .toLowerCase()
    .includes(query.trim().toLowerCase())
}

const formatPolicy = value => {
  if (value === null || value === undefined || value === '') return '—'

  const num = Number(value)

  return Number.isFinite(num) ? num.toLocaleString('id-ID') : '—'
}

const formatCurrency = value => {
  if (value === null || value === undefined || value === '') return '—'

  const num = Number(value)

  if (!Number.isFinite(num)) return '—'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num)
}

/** Surface tint — contrasts with default white model list card; works in light/dark. */
const panelSurfaceSx = theme => ({
  px: 6,
  pt: 6,
  pb: 6,
  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.06 : 0.14),
  borderTop: `3px solid ${alpha(theme.palette.primary.main, 0.4)}`,
  '& .MuiDataGrid-root': {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 1,
    bgcolor: 'background.paper'
  },
  '& .MuiDataGrid-columnHeaders': {
    borderRadius: 0,
    bgcolor: theme.palette.customColors.tableHeaderBg
  }
})

const ModelComponentsPanel = ({ model, onCommodChanged }) => {
  const { can } = useCan()
  const canCreate = can('model-components.create')
  const canUpdate = can('model-components.update')
  const canDelete = can('model-components.delete')
  const showActions = canUpdate || canDelete

  const [rows, setRows] = useState([])
  const [components, setComponents] = useState([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [compDescFilter, setCompDescFilter] = useState('')
  const [compTypeFilter, setCompTypeFilter] = useState('')
  const [policyFilter, setPolicyFilter] = useState('')
  const [priceFilter, setPriceFilter] = useState('')

  const hasActiveFilters = Boolean(
    compDescFilter.trim() || compTypeFilter.trim() || policyFilter.trim() || priceFilter.trim()
  )

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (!includesTextFilter(row.comp?.compDesc, compDescFilter)) return false
      if (!includesTextFilter(row.comp?.compType, compTypeFilter)) return false
      if (!includesTextFilter(row.policy, policyFilter)) return false
      if (!includesTextFilter(row.price, priceFilter)) return false

      return true
    })
  }, [rows, compDescFilter, compTypeFilter, policyFilter, priceFilter])

  const loadCommodRows = useCallback(async () => {
    if (!model?.fleetModelId) {
      setRows([])

      return
    }

    setLoading(true)

    try {
      const { data } = await arkaApi.get(`/models/${model.fleetModelId}/components`)
      setRows(Array.isArray(data?.data) ? data.data : [])
    } catch {
      setRows([])
      toast.error('Failed to load component mappings')
    } finally {
      setLoading(false)
    }
  }, [model?.fleetModelId])

  useEffect(() => {
    setCompDescFilter('')
    setCompTypeFilter('')
    setPolicyFilter('')
    setPriceFilter('')
  }, [model?.fleetModelId])

  useEffect(() => {
    loadCommodRows()
  }, [loadCommodRows])

  useEffect(() => {
    const loadComponents = async () => {
      try {
        // Unpaginated lookup — sending pageSize activates MAX_PAGE_SIZE (100) and hides the rest of the catalog.
        const { data } = await arkaApi.get('/components')
        setComponents(unwrapListPayload(data))
      } catch {
        toast.error('Failed to load component catalog')
      }
    }

    loadComponents()
  }, [])

  const notifyChanged = useCallback(() => {
    loadCommodRows()
    if (onCommodChanged) onCommodChanged()
  }, [loadCommodRows, onCommodChanged])

  const openAddDialog = () => {
    setEditingRow(null)
    setDialogOpen(true)
  }

  const openEditDialog = useCallback(row => {
    setEditingRow(row)
    setDialogOpen(true)
  }, [])

  const handleSave = async formData => {
    const payload = {
      policy: formData.policy ? Number(formData.policy) : null,
      price: formData.price ? Number(formData.price) : null,
      lifeType: 'Hour'
    }

    try {
      if (editingRow) {
        await arkaApi.put(`/model-components/${editingRow.idMod}`, {
          idComp: Number(formData.idComp),
          ...payload
        })
        toast.success('Policy updated')
      } else {
        await arkaApi.post('/model-components', {
          fleetModelId: model.fleetModelId,
          idComp: Number(formData.idComp),
          ...payload
        })
        toast.success('Component mapping created')
      }

      setDialogOpen(false)
      setEditingRow(null)
      notifyChanged()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Save failed')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await arkaApi.delete(`/model-components/${deleteTarget.idMod}`)
      toast.success('Mapping deleted')
      setDeleteTarget(null)
      notifyChanged()
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        flex: 0.35,
        minWidth: 200,
        field: 'compDesc',
        headerName: 'Component',
        valueGetter: ({ row }) => row.comp?.compDesc ?? ''
      },
      {
        flex: 0.2,
        minWidth: 120,
        field: 'compType',
        headerName: 'Type',
        valueGetter: ({ row }) => row.comp?.compType ?? ''
      },
      {
        flex: 0.15,
        minWidth: 90,
        field: 'policy',
        headerName: 'Policy (hrs)',
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: ({ value }) => formatPolicy(value)
      },
      {
        flex: 0.15,
        minWidth: 120,
        field: 'price',
        headerName: 'Price',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: ({ value }) => formatCurrency(value)
      },
      {
        flex: 0.1,
        minWidth: 80,
        sortable: false,
        field: 'actions',
        headerName: 'Actions',
        renderCell: ({ row }) =>
          showActions ? (
            <TableRowActions
              actions={[
                ...(canUpdate ? [{ key: 'edit', label: 'Edit', onClick: () => openEditDialog(row) }] : []),
                ...(canDelete ? [{ key: 'delete', label: 'Delete', onClick: () => setDeleteTarget(row) }] : [])
              ]}
            />
          ) : null
      }
    ],
    [canDelete, canUpdate, openEditDialog, showActions]
  )

  return (
    <Box sx={panelSurfaceSx}>
      <Box
        sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 3, mb: 4 }}
      >
        <Box>
          <Typography variant='h6' sx={{ mb: 0.5 }}>
            {model ? `Components — ${model.model}` : 'Components'}
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {model
              ? loading
                ? '…'
                : hasActiveFilters
                ? `${filteredRows.length} of ${rows.length} component mapping(s)`
                : `${rows.length} component mapping(s)`
              : 'Select a model row above to manage component mappings.'}
          </Typography>
        </Box>
        {canCreate && model ? (
          <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={openAddDialog}>
            Add Mapping
          </Button>
        ) : null}
      </Box>

      {model && loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={28} />
        </Box>
      ) : model && rows.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <Typography variant='body2' sx={{ color: 'text.secondary', mb: canCreate ? 3 : 0, textAlign: 'center' }}>
            There are no component mappings for this model yet.
          </Typography>
        </Box>
      ) : model && rows.length > 0 ? (
        <>
          <ModelComponentsFilterBar
            compDescFilter={compDescFilter}
            compTypeFilter={compTypeFilter}
            policyFilter={policyFilter}
            priceFilter={priceFilter}
            onCompDescChange={setCompDescFilter}
            onCompTypeChange={setCompTypeFilter}
            onPolicyChange={setPolicyFilter}
            onPriceChange={setPriceFilter}
          />
          {filteredRows.length === 0 ? (
            <Typography variant='body2' sx={{ color: 'text.secondary', py: 4 }}>
              Tidak ada mapping yang cocok dengan filter.
            </Typography>
          ) : (
            <DataGrid
              autoHeight
              rows={filteredRows}
              columns={columns}
              getRowId={row => row.idMod}
              disableRowSelectionOnClick
              hideFooter={filteredRows.length <= 10}
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            />
          )}
        </>
      ) : null}

      <ModelCommodDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingRow(null)
        }}
        initialData={editingRow}
        model={model}
        components={components}
        existingRows={rows}
        onSubmit={handleSave}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Component Mapping?'
        message={
          deleteTarget ? `Hapus mapping "${deleteTarget.comp?.compDesc ?? 'component'}" dari model ${model.model}?` : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Box>
  )
}

export default ModelComponentsPanel
