/**
 * Maintenance Type List Page — FMS
 * Halaman daftar tipe maintenance. DataGrid dengan kolom Name, Created,
 * dan aksi Edit/Delete per baris. Tambah/edit tipe lewat drawer.
 */
import arkaApi from 'src/utils/arka-api'

// ** React Imports
import { useState, useEffect, useCallback } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import { DataGrid } from '@mui/x-data-grid'

// ** Store Imports
import { useDispatch, useSelector } from 'react-redux'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Third Party
import toast from 'react-hot-toast'

// ** Actions Imports
import { fetchData, deleteMaintenanceType } from 'src/store/apps/maintenanceType'

// ** Custom Table Components Imports
import TableHeader from 'src/views/apps/maintenance-type/list/TableHeader'
import AddMaintenanceTypeDrawer from 'src/views/apps/maintenance-type/list/AddMaintenanceTypeDrawer'
import EditMaintenanceTypeDrawer from 'src/views/apps/maintenance-type/list/EditMaintenanceTypeDrawer'

/**
 * Aksi per baris: Edit (buka drawer) & Delete (toast konfirmasi → dispatch deleteMaintenanceType).
 */
const RowActions = ({ id, onEdit }) => {
  const dispatch = useDispatch()

  const handleDeleteClick = () => {
    toast(
      t => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 280 }}>
          <Typography>Delete this maintenance type?</Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size='small' variant='tonal' color='secondary' onClick={() => toast.dismiss(t.id)}>
              Cancel
            </Button>
            <Button
              size='small'
              variant='tonal'
              color='error'
              onClick={() => {
                toast.dismiss(t.id)
                dispatch(deleteMaintenanceType(id))
                  .unwrap()
                  .then(() => toast.success('Maintenance type deleted'))
                  .catch(err => toast.error(err?.message || err?.response?.data?.error || 'Delete failed'))
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      ),
      { duration: Infinity, style: { minWidth: 280 } }
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Tooltip title='Edit'>
        <IconButton size='small' sx={{ color: 'text.secondary' }} onClick={() => onEdit(id)}>
          <Icon icon='tabler:edit' />
        </IconButton>
      </Tooltip>
      <Tooltip title='Delete'>
        <IconButton size='small' sx={{ color: 'error.main' }} onClick={handleDeleteClick}>
          <Icon icon='tabler:trash' />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

/** Kolom DataGrid. onEdit = callback saat klik Edit (buka EditMaintenanceTypeDrawer). */
const columns = onEdit => [
  {
    flex: 1,
    minWidth: 200,
    field: 'name',
    headerName: 'Name',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 500 }}>
        {row.name}
      </Typography>
    )
  },
  {
    flex: 1,
    minWidth: 160,
    field: 'createdAt',
    headerName: 'Created',
    renderCell: ({ row }) => (
      <Typography noWrap variant='body2' sx={{ color: 'text.secondary' }}>
        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
      </Typography>
    )
  },
  {
    flex: 1,
    minWidth: 200,
    sortable: false,
    align: 'center',
    headerAlign: 'center',
    field: 'actions',
    headerName: 'Actions',
    renderCell: ({ row }) => (
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <RowActions id={row.id} onEdit={onEdit} />
      </Box>
    )
  }
]

const MaintenanceTypeList = () => {
  // Search & drawer state
  const [value, setValue] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })

  const dispatch = useDispatch()
  const store = useSelector(state => state.maintenanceType)

  // Fetch daftar maintenance type saat search (q) berubah
  useEffect(() => {
    dispatch(fetchData({ q: value || undefined }))
  }, [dispatch, value])

  const handleFilter = useCallback(val => setValue(val), [])
  const toggleAddDrawer = () => setAddOpen(!addOpen)

  const toggleEditDrawer = () => {
    setEditOpen(!editOpen)
    if (editOpen) setEditId(null)
  }

  const handleEdit = id => {
    setEditId(id)
    setEditOpen(true)
  }

  return (
    <Grid container spacing={6.5}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title='Maintenance Types' />
          <Divider sx={{ m: '0 !important' }} />
          {/* Search + tombol Add */}
          <TableHeader value={value} handleFilter={handleFilter} toggle={toggleAddDrawer} />
          {/* Tabel: data dari store.maintenanceType */}
          <DataGrid
            autoHeight
            rowHeight={62}
            rows={store.data}
            columns={columns(handleEdit)}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sx={{ '& .MuiDataGrid-columnHeaders': { minHeight: 48 }, '& .MuiDataGrid-cell': { minHeight: 62 } }}
          />
        </Card>
      </Grid>

      {/* Drawer tambah tipe maintenance */}
      <AddMaintenanceTypeDrawer open={addOpen} toggle={toggleAddDrawer} />
      {/* Drawer edit tipe (maintenanceTypeId = null saat tutup) */}
      <EditMaintenanceTypeDrawer open={editOpen} toggle={toggleEditDrawer} maintenanceTypeId={editId} />
    </Grid>
  )
}

MaintenanceTypeList.acl = {
  subject: 'maintenance-type',
  action: 'read'
}

export default MaintenanceTypeList
