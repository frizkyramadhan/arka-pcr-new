/**
 * Fleet models — read-only list from fleet_model_cache + commod CRUD panel.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import CustomChip from 'src/@core/components/mui/chip'
import PageHeader from 'src/@core/components/page-header'

import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'

import ModelComponentsPanel from 'src/views/pcr/models/ModelComponentsPanel'
import TableHeader from 'src/views/pcr/models/TableHeader'
import TableServerSide from 'src/views/table/data-grid/TableServerSide'

const ModelsPage = () => {
  const [modelFilter, setModelFilter] = useState('')
  const [manufactureFilter, setManufactureFilter] = useState('')
  const [plantGroupFilter, setPlantGroupFilter] = useState('')
  const [tableLoading, setTableLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedModel, setSelectedModel] = useState(null)
  const componentsPanelRef = useRef(null)

  const handleModelRowClick = useCallback(({ row }) => {
    setSelectedModel(row)

    requestAnimationFrame(() => {
      componentsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const handleModelsResponse = useCallback(() => {
    setTableLoading(false)
  }, [])

  const refreshModels = useCallback(() => {
    setTableLoading(true)
    setRefreshKey(prev => prev + 1)
  }, [])

  const handleCommodChanged = useCallback(() => {
    refreshModels()
  }, [refreshModels])

  const handleManualSync = async () => {
    try {
      setSyncing(true)
      const response = await arkaApi.post('/fleet/sync')

      toast.success(
        `Sync complete: ${response?.data?.synced ?? 0} unit(s), ${response?.data?.modelsSynced ?? 0} model(s)`
      )
      refreshModels()
    } catch (error) {
      notifyApiError(error, 'Failed to sync fleet data')
    } finally {
      setSyncing(false)
    }
  }

  const columns = useMemo(
    () => [
      { flex: 0.28, minWidth: 180, field: 'model', headerName: 'Model' },
      { flex: 0.22, minWidth: 140, field: 'manufacture', headerName: 'Manufacture' },
      { flex: 0.22, minWidth: 140, field: 'plantGroup', headerName: 'Plant group' },
      {
        flex: 0.12,
        minWidth: 90,
        field: 'unitCount',
        headerName: 'Units',
        type: 'number'
      },
      {
        flex: 0.16,
        minWidth: 110,
        field: 'componentCount',
        headerName: 'Components',
        type: 'number',
        renderCell: ({ row }) => (
          <CustomChip
            rounded
            skin='light'
            size='small'
            label={row.componentCount}
            color={row.componentCount > 0 ? 'primary' : 'secondary'}
          />
        )
      }
    ],
    []
  )

  const tableFilters = useMemo(
    () => ({
      model: modelFilter,
      manufacture: manufactureFilter,
      plantGroup: plantGroupFilter
    }),
    [modelFilter, manufactureFilter, plantGroupFilter]
  )

  useEffect(() => {
    setTableLoading(true)
  }, [tableFilters, refreshKey])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Models</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Read-only model list from local cache (fleet_model_cache). Use Sync to refresh from ARKFleet.
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <TableHeader
            modelFilter={modelFilter}
            manufactureFilter={manufactureFilter}
            plantGroupFilter={plantGroupFilter}
            handleModelChange={setModelFilter}
            handleManufactureChange={setManufactureFilter}
            handlePlantGroupChange={setPlantGroupFilter}
            onSync={handleManualSync}
            syncing={syncing}
            loading={tableLoading}
          />
          <TableServerSide
            hideCard
            hideToolbar
            title={null}
            apiPath='models'
            apiClient={arkaApi}
            columns={columns}
            getRowId={row => row.fleetModelId}
            defaultSortField='model'
            extraParams={tableFilters}
            refreshKey={refreshKey}
            onResponse={handleModelsResponse}
            onRowClick={handleModelRowClick}
            checkboxSelection={false}
            disableRowSelectionOnClick={false}
            serverPagination
            initialPageSize={10}
            pageSizeOptions={[10, 25, 50]}
            sx={{
              cursor: 'pointer',
              '& .MuiDataGrid-columnHeaders': { borderRadius: 0 },
              '& .MuiDataGrid-row.Mui-selected': {
                bgcolor: 'action.selected'
              }
            }}
          />
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card ref={componentsPanelRef} id='model-components-panel' sx={{ scrollMarginTop: 24, overflow: 'hidden' }}>
          <ModelComponentsPanel model={selectedModel} onCommodChanged={handleCommodChanged} />
        </Card>
      </Grid>
    </Grid>
  )
}

ModelsPage.authGuard = true

export default ModelsPage
