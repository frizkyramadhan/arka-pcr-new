/**
 * PCR Components — TableHeader + TableServerSide DataGrid + AddComponentDrawer.
 */
import { useCallback, useMemo, useState } from 'react'

import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import CustomChip from 'src/@core/components/mui/chip'
import PageHeader from 'src/@core/components/page-header'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import { TableCrudActions } from 'src/@core/components/table-row-actions'

import arkaApi from 'src/utils/arka-api'

import TableHeader from 'src/views/pcr/components/TableHeader'
import AddComponentDrawer from 'src/views/pcr/components/AddComponentDrawer'
import TableServerSide from 'src/views/table/data-grid/TableServerSide'

import useCan from 'src/hooks/useCan'

const ComponentsPage = () => {
  const { can } = useCan()
  const canEdit = can('components.update') || can('components.create')

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingComponent, setEditingComponent] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshComponents = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  const toggleDrawer = () => {
    setDrawerOpen(prev => !prev)
    if (drawerOpen) setEditingComponent(null)
  }

  const openAddDrawer = () => {
    setEditingComponent(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = useCallback(row => {
    setEditingComponent(row)
    setDrawerOpen(true)
  }, [])

  const getRowId = useCallback(row => row.idComp, [])

  const gridSx = useMemo(
    () => ({
      '& .MuiDataGrid-columnHeaders': { borderRadius: 0 }
    }),
    []
  )

  const requestDelete = useCallback(row => {
    setDeleteTarget(row)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await arkaApi.delete(`/components/${deleteTarget.idComp}`)
      toast.success('Component deleted')
      setDeleteTarget(null)
      refreshComponents()
    } catch (error) {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, refreshComponents])

  const handleImport = async event => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await arkaApi.post('/imports/components', formData)
      toast.success(`Imported ${data.imported} component(s)`)
      refreshComponents()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Import failed')
    } finally {
      event.target.value = ''
    }
  }

  const columns = useMemo(
    () => [
      { flex: 0.4, minWidth: 220, field: 'compDesc', headerName: 'Description' },
      { flex: 0.25, minWidth: 160, field: 'compType', headerName: 'Type' },
      {
        flex: 0.2,
        minWidth: 120,
        field: 'status',
        headerName: 'Status',
        renderCell: ({ row }) => (
          <CustomChip
            rounded
            skin='light'
            size='small'
            label={row.status}
            color={row.status === 'Active' ? 'success' : 'secondary'}
          />
        )
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
    [canEdit, requestDelete, openEditDrawer]
  )

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Components</Typography>}
          subtitle={<Typography sx={{ color: 'text.secondary' }}>Master catalog of replaceable components</Typography>}
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <TableHeader
            value={search}
            handleFilter={setSearch}
            canEdit={canEdit}
            onAdd={openAddDrawer}
            onImport={handleImport}
          />
          <TableServerSide
            hideCard
            hideToolbar
            title={null}
            apiPath='components'
            apiClient={arkaApi}
            columns={columns}
            getRowId={getRowId}
            defaultSortField='compDesc'
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
      <AddComponentDrawer
        open={drawerOpen}
        toggle={toggleDrawer}
        component={editingComponent}
        onSaved={refreshComponents}
      />
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Component?'
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.compDesc}"? You won't be able to revert this!`
            : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Grid>
  )
}

ComponentsPage.authGuard = true

export default ComponentsPage
