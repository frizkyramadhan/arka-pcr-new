/**
 * Units list — TableHeader filters + TableServerSide DataGrid (fleet_equipment_cache).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/router'

import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import PageHeader from 'src/@core/components/page-header'
import TableRowActions from 'src/@core/components/table-row-actions'

import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'

import EquipmentStatusChip from 'src/views/pcr/units/EquipmentStatusChip'
import TableHeader from 'src/views/pcr/units/TableHeader'
import TableServerSide from 'src/views/table/data-grid/TableServerSide'

const UnitsPage = () => {
  const router = useRouter()

  const [unitNoFilter, setUnitNoFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [manufactureFilter, setManufactureFilter] = useState('')
  const [plantGroupFilter, setPlantGroupFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [tableLoading, setTableLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUnitsResponse = useCallback(() => {
    setTableLoading(false)
  }, [])

  const refreshUnits = useCallback(() => {
    setTableLoading(true)
    setRefreshKey(prev => prev + 1)
  }, [])

  const handleManualSync = async () => {
    try {
      setSyncing(true)
      const response = await arkaApi.post('/fleet/sync')
      const synced = response?.data?.synced ?? 0
      const modelsSynced = response?.data?.modelsSynced ?? 0

      toast.success(`Sync complete: ${synced} unit(s), ${modelsSynced} model(s)`)
      refreshUnits()
    } catch (error) {
      notifyApiError(error, 'Failed to sync unit data')
    } finally {
      setSyncing(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        flex: 0.15,
        minWidth: 120,
        field: 'unit_no',
        headerName: 'Unit No',
        renderCell: ({ row }) => (
          <Typography sx={{ fontWeight: 500 }}>{row.unit_no}</Typography>
        )
      },
      { flex: 0.25, minWidth: 200, field: 'description', headerName: 'Description' },
      { flex: 0.15, minWidth: 120, field: 'project_code', headerName: 'Project' },
      { flex: 0.15, minWidth: 140, field: 'model', headerName: 'Model' },
      { flex: 0.15, minWidth: 120, field: 'manufacture', headerName: 'Manufacture' },
      { flex: 0.12, minWidth: 130, field: 'plant_group', headerName: 'Plant group' },
      { flex: 0.12, minWidth: 120, field: 'plant_type', headerName: 'Plant type' },
      {
        flex: 0.1,
        minWidth: 110,
        field: 'unitstatus',
        headerName: 'Status',
        renderCell: ({ row }) => <EquipmentStatusChip status={row.unitstatus} />
      },
      {
        flex: 0.08,
        minWidth: 70,
        sortable: false,
        field: 'actions',
        headerName: 'Actions',
        renderCell: ({ row }) => (
          <TableRowActions
            buttonSize='medium'
            actions={[{ key: 'view', label: 'View', onClick: () => router.push(`/units/${row.id}`) }]}
          />
        )
      }
    ],
    [router]
  )

  const tableFilters = useMemo(
    () => ({
      unitNo: unitNoFilter,
      model: modelFilter,
      project: projectFilter,
      manufacture: manufactureFilter,
      plantGroup: plantGroupFilter,
      ...(statusFilter ? { status: statusFilter } : {})
    }),
    [unitNoFilter, modelFilter, projectFilter, manufactureFilter, plantGroupFilter, statusFilter]
  )

  useEffect(() => {
    setTableLoading(true)
  }, [tableFilters, refreshKey])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Units</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Read-only unit list from local cache (fleet_equipment_cache). Use Sync to refresh from ARKFleet.
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <TableHeader
            unitNoFilter={unitNoFilter}
            modelFilter={modelFilter}
            projectFilter={projectFilter}
            manufactureFilter={manufactureFilter}
            plantGroupFilter={plantGroupFilter}
            statusFilter={statusFilter}
            handleUnitNoChange={setUnitNoFilter}
            handleModelChange={setModelFilter}
            handleProjectChange={setProjectFilter}
            handleManufactureChange={setManufactureFilter}
            handlePlantGroupChange={setPlantGroupFilter}
            handleStatusChange={setStatusFilter}
            onSync={handleManualSync}
            syncing={syncing}
            loading={tableLoading}
          />
          <TableServerSide
            hideCard
            hideToolbar
            title={null}
            apiPath='fleet/units'
            apiClient={arkaApi}
            columns={columns}
            getRowId={row => row.id}
            defaultSortField='unit_no'
            extraParams={tableFilters}
            refreshKey={refreshKey}
            onResponse={handleUnitsResponse}
            onRowClick={({ row }) => router.push(`/units/${row.id}`)}
            checkboxSelection={false}
            disableRowSelectionOnClick
            serverPagination
            initialPageSize={10}
            pageSizeOptions={[10, 25, 50]}
            sx={{ cursor: 'pointer', '& .MuiDataGrid-columnHeaders': { borderRadius: 0 } }}
          />
        </Card>
      </Grid>
    </Grid>
  )
}

UnitsPage.authGuard = true

export default UnitsPage
