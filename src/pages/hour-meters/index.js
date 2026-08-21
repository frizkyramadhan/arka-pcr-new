/**
 * Hour Meters — HmTableHeader filters + TableServerSide DataGrid + AddHourMeterDrawer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import PageHeader from 'src/@core/components/page-header'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import { TableCrudActions } from 'src/@core/components/table-row-actions'

import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'
import { unwrapListPayload } from 'src/utils/unwrap-list-payload'
import { hasAllProjectsAccess } from 'src/utils/project-scope'

import AddHourMeterDrawer from 'src/views/pcr/hour-meters/AddHourMeterDrawer'
import HmImportResultDialog from 'src/views/pcr/hour-meters/HmImportResultDialog'
import HmTableHeader from 'src/views/pcr/hour-meters/HmTableHeader'
import TableServerSide from 'src/views/table/data-grid/TableServerSide'

import { useAuth } from 'src/hooks/useAuth'
import useCan from 'src/hooks/useCan'

const formatDate = value => {
  if (!value) return '—'

  return String(value).slice(0, 10)
}

const formatDecimal = value => {
  if (value === null || value === undefined) return '—'

  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const HourMetersPage = () => {
  const auth = useAuth()
  const { can } = useCan()
  const canEdit = can('hour-meters.update') || can('hour-meters.create')
  const canImport = can('hour-meters.import')

  const [equipments, setEquipments] = useState([])
  const [projects, setProjects] = useState([])
  const [search, setSearch] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [fleetUnitId, setFleetUnitId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [hmUnitMin, setHmUnitMin] = useState('')
  const [hmUnitMax, setHmUnitMax] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingHourMeter, setEditingHourMeter] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [importResult, setImportResult] = useState(null)
  const [importResultOpen, setImportResultOpen] = useState(false)

  const isHeadOffice = hasAllProjectsAccess(auth.user)

  const fetchMeta = useCallback(async () => {
    try {
      const [equipmentRes, projectRes] = await Promise.all([
        arkaApi.get('/fleet/units'),
        arkaApi.get('/fleet/projects')
      ])
      setEquipments(unwrapListPayload(equipmentRes.data))
      setProjects(Array.isArray(projectRes.data) ? projectRes.data : [])
    } catch (error) {
      await notifyApiError(error, 'Failed to load filter options', toast.error)
    }
  }, [])

  useEffect(() => {
    fetchMeta()
  }, [fetchMeta])

  const refreshHourMeters = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  const toggleDrawer = () => {
    setDrawerOpen(prev => !prev)
    if (drawerOpen) setEditingHourMeter(null)
  }

  const openAddDrawer = () => {
    setEditingHourMeter(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = useCallback(row => {
    setEditingHourMeter(row)
    setDrawerOpen(true)
  }, [])

  const requestDelete = useCallback(row => {
    setDeleteTarget(row)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await arkaApi.delete(`/hour-meters/${deleteTarget.idHm}`)
      toast.success('Hour meter deleted')
      setDeleteTarget(null)
      refreshHourMeters()
    } catch (error) {
      await notifyApiError(error, 'Delete failed', toast.error)
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, refreshHourMeters])

  const showImportResult = useCallback(result => {
    setImportResult(result)
    setImportResultOpen(true)
  }, [])

  const handleImport = async event => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await arkaApi.post('/imports/hour-meters', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (data.imported > 0) {
        refreshHourMeters()
      }

      showImportResult({
        imported: data.imported ?? 0,
        created: data.created ?? 0,
        updated: data.updated ?? 0,
        restored: data.restored ?? 0,
        errors: data.errors ?? [],
        failed: false
      })
    } catch (error) {
      const payload = error.response?.data ?? {}

      const errors = Array.isArray(payload.errors)
        ? payload.errors
        : Array.isArray(payload.details)
          ? payload.details.map((detail, index) =>
              typeof detail === 'string'
                ? { row: index + 1, column: 'data', value: null, message: detail }
                : detail
            )
          : []

      showImportResult({
        imported: payload.imported ?? 0,
        created: payload.created ?? 0,
        updated: payload.updated ?? 0,
        restored: payload.restored ?? 0,
        errors,
        message: payload.error ?? 'Import gagal',
        failed: true
      })
    } finally {
      event.target.value = ''
    }
  }

  const tableFilters = useMemo(
    () => ({
      ...(projectCode ? { projectCode } : {}),
      ...(fleetUnitId ? { fleetUnitId } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(hmUnitMin !== '' ? { hmUnitMin } : {}),
      ...(hmUnitMax !== '' ? { hmUnitMax } : {})
    }),
    [projectCode, fleetUnitId, dateFrom, dateTo, hmUnitMin, hmUnitMax]
  )

  const exportParams = useMemo(
    () => ({
      ...tableFilters,
      ...(search ? { search } : {})
    }),
    [tableFilters, search]
  )

  const gridSx = useMemo(
    () => ({
      '& .MuiDataGrid-columnHeaders': { borderRadius: 0 }
    }),
    []
  )

  const columns = useMemo(
    () => [
      { flex: 0.12, minWidth: 100, field: 'unitNo', headerName: 'Unit No' },
      {
        flex: 0.18,
        minWidth: 160,
        field: 'equipmentDescription',
        headerName: 'Description',
        valueGetter: ({ row }) => row.unit?.description ?? '—'
      },
      { flex: 0.1, minWidth: 90, field: 'projectCode', headerName: 'Project' },
      {
        flex: 0.12,
        minWidth: 110,
        field: 'hmUnit',
        headerName: 'HM Unit',
        valueFormatter: ({ value }) => formatDecimal(value)
      },
      { flex: 0.08, minWidth: 80, field: 'whDay', headerName: 'WH/Day' },
      {
        flex: 0.12,
        minWidth: 110,
        field: 'dateHm',
        headerName: 'Date',
        valueFormatter: ({ value }) => formatDate(value)
      },
      {
        flex: 0.1,
        minWidth: 80,
        sortable: false,
        field: 'actions',
        headerName: 'Actions',
        renderCell: ({ row }) => (
          <TableCrudActions row={row} canEdit={canEdit} onEdit={openEditDrawer} onDelete={requestDelete} />
        )
      }
    ],
    [canEdit, openEditDrawer, requestDelete]
  )

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Hour Meters</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Record working hours per equipment unit
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <HmTableHeader
            value={search}
            handleFilter={setSearch}
            fleetUnitId={fleetUnitId}
            handleEquipmentChange={setFleetUnitId}
            projectCode={projectCode}
            handleProjectChange={setProjectCode}
            dateFrom={dateFrom}
            handleDateFromChange={setDateFrom}
            dateTo={dateTo}
            handleDateToChange={setDateTo}
            hmUnitMin={hmUnitMin}
            handleHmUnitMinChange={setHmUnitMin}
            hmUnitMax={hmUnitMax}
            handleHmUnitMaxChange={setHmUnitMax}
            projects={projects}
            equipments={equipments}
            showProjectFilter={isHeadOffice}
            canEdit={canEdit}
            canImport={canImport}
            exportParams={exportParams}
            toggle={openAddDrawer}
            onImport={handleImport}
          />
          <TableServerSide
            hideCard
            hideToolbar
            title={null}
            apiPath='hour-meters'
            apiClient={arkaApi}
            columns={columns}
            getRowId={row => row.idHm}
            defaultSortField='idHm'
            defaultSortOrder='desc'
            extraParams={tableFilters}
            searchValue={search}
            onSearchChange={setSearch}
            refreshKey={refreshKey}
            checkboxSelection={false}
            disableRowSelectionOnClick
            serverPagination
            initialPageSize={10}
            pageSizeOptions={[10, 25, 50]}
            sx={gridSx}
          />
        </Card>
      </Grid>
      <AddHourMeterDrawer
        open={drawerOpen}
        toggle={toggleDrawer}
        hourMeter={editingHourMeter}
        equipments={equipments}
        onSaved={refreshHourMeters}
      />
      <HmImportResultDialog
        open={importResultOpen}
        result={importResult}
        onClose={() => setImportResultOpen(false)}
      />
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Hour Meter?'
        message={
          deleteTarget
            ? `Are you sure you want to delete hour meter for "${deleteTarget.unitNo}" on ${formatDate(deleteTarget.dateHm)}? You won't be able to revert this!`
            : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Grid>
  )
}

HourMetersPage.authGuard = true

export default HourMetersPage
