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
import { apiPath } from 'src/utils/base-path'

// ** View Components
import InspectionDrawer from 'src/views/pcr/inspections/InspectionDrawer'
import InspectionFilters from 'src/views/pcr/inspections/InspectionFilters'
import { extractModelComponents, toComponentSelectOptions } from 'src/views/pcr/inspections/componentOptions'
import { buildInspectionActions } from 'src/views/pcr/inspections/inspectionRowActions'
import {
  getInspectionTypeBySlug,
  INSPECTION_TYPE_LABELS,
  isAllInspectionsSlug
} from 'src/views/pcr/inspections/inspectionMeta'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'

// ** Hooks
import useCan from 'src/hooks/useCan'

const formatDate = value => (value ? String(value).slice(0, 10) : '—')

const EquipmentInspectionPage = () => {
  const router = useRouter()
  const { can } = useCan()
  const { fleetId, typeSlug } = router.query

  const isAllTypes = isAllInspectionsSlug(typeSlug)
  const typeMeta = isAllTypes ? null : getInspectionTypeBySlug(typeSlug)

  const canEdit = can('inspections.update')
  const canCreate = can('inspections.create')
  const canDelete = can('inspections.delete')

  const [equipment, setEquipment] = useState(null)
  const [componentOptions, setComponentOptions] = useState([])
  const [hasComponents, setHasComponents] = useState(false)
  const [rows, setRows] = useState([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [ratingFilter, setRatingFilter] = useState('')
  const [componentFilter, setComponentFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })

  const pageTitle = isAllTypes ? 'All Types' : typeMeta?.label ?? typeSlug

  const fetchData = useCallback(async () => {
    if (!fleetId || (!isAllTypes && !typeMeta)) return

    setLoading(true)
    try {
      const params = {
        fleetUnitId: fleetId,
        page: paginationModel.page,
        pageSize: paginationModel.pageSize
      }
      if (typeMeta?.code) params.type = typeMeta.code
      if (ratingFilter) params.rating = ratingFilter
      if (componentFilter) params.idMod = componentFilter

      const [equipmentRes, inspectionRes] = await Promise.all([
        arkaApi.get(`/fleet/units/${fleetId}`),
        arkaApi.get('/inspections', { params })
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

      const payload = inspectionRes.data
      if (payload && Array.isArray(payload.rows)) {
        setRows(payload.rows)
        setRowCount(payload.total ?? payload.rows.length)
      } else {
        const list = Array.isArray(payload) ? payload : []
        setRows(list)
        setRowCount(list.length)
      }
    } catch (error) {
      toast.error('Failed to load inspection records')
    } finally {
      setLoading(false)
    }
  }, [fleetId, isAllTypes, typeMeta, ratingFilter, componentFilter, paginationModel.page, paginationModel.pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setPaginationModel(prev => ({ ...prev, page: 0 }))
  }, [ratingFilter, componentFilter, typeSlug])

  const handleExport = async () => {
    const params = new URLSearchParams({ fleetUnitId: String(fleetId) })
    if (typeMeta?.code) params.set('type', typeMeta.code)
    if (ratingFilter) params.set('rating', ratingFilter)
    if (componentFilter) params.set('idMod', componentFilter)

    const response = await fetch(apiPath(`/exports/inspections?${params}`))
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = isAllTypes ? `inspection-all-${fleetId}.xlsx` : `inspection-${typeSlug}-${fleetId}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  const handleRowAction = useCallback(
    async (action, row) => {
      try {
        if (action === 'edit') {
          const { data } = await arkaApi.get(`/inspections/${row.idIns}`)
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
      await arkaApi.delete(`/inspections/${deleteTarget.idIns}`)
      toast.success('Inspection deleted')
      setDeleteTarget(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleTypeChange = slug => {
    router.push(`/units/${fleetId}/inspections/${slug}`)
  }

  const toggleDrawer = () => {
    setDrawerOpen(prev => !prev)
    if (drawerOpen) setSelected(null)
  }

  const openAddDrawer = () => {
    setSelected(null)
    setDrawerOpen(true)
  }

  const columns = useMemo(() => {
    const base = []

    if (isAllTypes) {
      base.push({
        flex: 0.12,
        minWidth: 110,
        field: 'type',
        headerName: 'Type',
        valueGetter: ({ row }) => INSPECTION_TYPE_LABELS[row.type] ?? row.type ?? '—'
      })
    }

    base.push(
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
        field: 'insDate',
        headerName: 'Date',
        valueFormatter: ({ value }) => formatDate(value)
      },
      {
        flex: 0.1,
        minWidth: 90,
        field: 'insHm',
        headerName: 'HM',
        valueFormatter: ({ value }) =>
          value !== null && value !== undefined && value !== '' ? Number(value).toLocaleString() : '—'
      },
      {
        flex: 0.1,
        minWidth: 80,
        field: 'rating',
        headerName: 'Rating',
        renderCell: ({ row }) => <SosRatingChip rating={row.rating} />
      },
      {
        flex: 0.3,
        minWidth: 420,
        sortable: false,
        field: 'actions',
        headerName: 'Actions',
        renderCell: ({ row }) => (
          <TableRowActions
            buttonSize='medium'
            actions={buildInspectionActions(row, canEdit, canDelete, handleRowAction)}
          />
        )
      }
    )

    return base
  }, [isAllTypes, canEdit, canDelete, handleRowAction])

  if (!fleetId || !typeSlug) return null

  if (!isAllTypes && !typeMeta) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Typography color='error'>Unknown inspection type: {typeSlug}</Typography>
        </Grid>
      </Grid>
    )
  }

  const deleteTypeLabel =
    INSPECTION_TYPE_LABELS[deleteTarget?.type] ?? deleteTarget?.type ?? typeMeta?.label ?? 'inspection'

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant='tonal'
            color='secondary'
            startIcon={<Icon icon='tabler:arrow-left' />}
            onClick={() => router.push(`/units/${fleetId}?tab=inspection`)}
          >
            Back
          </Button>
          <PageHeader
            title={<Typography variant='h4'>Inspection / {pageTitle}</Typography>}
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
            <InspectionFilters
              typeSlug={typeSlug}
              ratingFilter={ratingFilter}
              componentFilter={componentFilter}
              componentOptions={componentOptions}
              onTypeChange={handleTypeChange}
              onRatingChange={setRatingFilter}
              onComponentChange={setComponentFilter}
            />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button variant='tonal' color='secondary' onClick={handleExport}>
                Export Excel
              </Button>
              {canCreate && hasComponents ? (
                <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={openAddDrawer}>
                  Add Inspection
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
            getRowId={row => row.idIns}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            paginationMode='server'
          />
        </Card>
      </Grid>

      <InspectionDrawer
        open={drawerOpen}
        toggle={toggleDrawer}
        inspection={selected}
        fleetUnitId={Number(fleetId)}
        fleetModelId={equipment?.model_id}
        inspectionType={typeMeta?.code ?? null}
        latestHmUnit={equipment?.latest_hm_unit ?? null}
        onSaved={fetchData}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Inspection?'
        message={
          deleteTarget
            ? `Are you sure you want to delete this ${deleteTypeLabel} inspection for ${
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

EquipmentInspectionPage.authGuard = true

export default EquipmentInspectionPage
