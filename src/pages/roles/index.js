/**
 * Role list — TableHeader filters + TableServerSide DataGrid + AddRoleDrawer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import toast from 'react-hot-toast'

import CustomChip from 'src/@core/components/mui/chip'
import PageHeader from 'src/@core/components/page-header'

import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'
import useCan from 'src/hooks/useCan'
import { getPermissionModuleKey } from 'src/utils/permission-groups'
import { unwrapListPayload } from 'src/utils/unwrap-list-payload'

import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import { TableCrudActions } from 'src/@core/components/table-row-actions'

import TableHeader from 'src/views/apps/roles/list/TableHeader'
import AddRoleDrawer from 'src/views/apps/roles/list/AddRoleDrawer'
import TableServerSide from 'src/views/table/data-grid/TableServerSide'

const roleStatusObj = {
  active: 'success',
  inactive: 'secondary'
}

const RolesPage = () => {
  const { can } = useCan()
  const canEdit = can('roles.access')

  const [permissions, setPermissions] = useState([])
  const [value, setValue] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchMeta = useCallback(async () => {
    try {
      const permissionsRes = await arkaApi.get('/permissions', { params: { status: 'active' } })
      setPermissions(unwrapListPayload(permissionsRes.data))
    } catch (error) {
      await notifyApiError(error, 'Failed to load permissions', toast.error)
    }
  }, [])

  useEffect(() => {
    if (canEdit) fetchMeta()
  }, [canEdit, fetchMeta])

  const moduleOptions = useMemo(() => {
    const keys = new Set()
    for (const permission of permissions) {
      keys.add(getPermissionModuleKey(permission.code))
    }

    return Array.from(keys).sort((a, b) => a.localeCompare(b))
  }, [permissions])

  const refreshRoles = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  const toggleDrawer = () => {
    setDrawerOpen(prev => !prev)
    if (drawerOpen) setEditingRole(null)
  }

  const openAddDrawer = () => {
    setEditingRole(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = useCallback(row => {
    setEditingRole(row)
    setDrawerOpen(true)
  }, [])

  const requestDelete = useCallback(row => {
    setDeleteTarget(row)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await arkaApi.delete(`/roles/${deleteTarget.idRole}`)
      toast.success('Role deleted')
      setDeleteTarget(null)
      refreshRoles()
    } catch (error) {
      await notifyApiError(error, 'Delete failed', toast.error)
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, refreshRoles])

  const columns = useMemo(
    () => [
      {
        flex: 0.25,
        minWidth: 180,
        field: 'name',
        headerName: 'Role',
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography noWrap variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
              {row.name}
            </Typography>
            <Typography noWrap variant='caption' color='text.secondary'>
              {row.description || '—'}
            </Typography>
          </Box>
        )
      },
      {
        flex: 0.45,
        minWidth: 280,
        field: 'permissions',
        headerName: 'Permissions',
        sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 2 }}>
            {(row.permissions ?? [])
              .filter(item => item?.code)
              .slice(0, 6)
              .map(item => (
                <CustomChip key={item.idPermission} skin='light' size='small' label={item.code} color='primary' />
              ))}
            {(row.permissions ?? []).length > 6 ? (
              <CustomChip skin='light' size='small' label={`+${row.permissions.length - 6}`} color='secondary' />
            ) : null}
          </Box>
        )
      },
      {
        flex: 0.15,
        minWidth: 120,
        field: 'isActive',
        headerName: 'Status',
        renderCell: ({ row }) => (
          <CustomChip
            rounded
            skin='light'
            size='small'
            label={row.isActive ? 'Active' : 'Inactive'}
            color={roleStatusObj[row.isActive ? 'active' : 'inactive']}
          />
        )
      },
      {
        flex: 0.1,
        minWidth: 90,
        sortable: false,
        field: 'actions',
        headerName: 'Actions',
        renderCell: ({ row }) => (
          <TableCrudActions row={row} onEdit={openEditDrawer} onDelete={requestDelete} />
        )
      }
    ],
    [requestDelete, openEditDrawer]
  )

  const tableFilters = useMemo(
    () => ({
      module: moduleFilter,
      status: statusFilter
    }),
    [moduleFilter, statusFilter]
  )

  if (!canEdit) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Typography variant='h5'>Access denied. Admin only.</Typography>
        </Grid>
      </Grid>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Roles</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Define roles and group permissions for user assignment
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <TableHeader
            value={value}
            moduleFilter={moduleFilter}
            statusFilter={statusFilter}
            modules={moduleOptions}
            handleFilter={setValue}
            handleModuleChange={setModuleFilter}
            handleStatusChange={setStatusFilter}
            toggle={openAddDrawer}
          />
          <TableServerSide
            hideCard
            hideToolbar
            title={null}
            apiPath='roles'
            apiClient={arkaApi}
            columns={columns}
            getRowId={row => row.idRole}
            defaultSortField='name'
            extraParams={tableFilters}
            searchValue={value}
            onSearchChange={setValue}
            refreshKey={refreshKey}
            checkboxSelection={false}
            disableRowSelectionOnClick
            serverPagination
            initialPageSize={10}
            pageSizeOptions={[10, 25, 50]}
            rowHeight={62}
            sx={{ '& .MuiDataGrid-columnHeaders': { borderRadius: 0 } }}
          />
        </Card>
      </Grid>
      <AddRoleDrawer
        open={drawerOpen}
        toggle={toggleDrawer}
        role={editingRole}
        permissions={permissions}
        onSaved={refreshRoles}
      />
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Role?'
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? You won't be able to revert this!`
            : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Grid>
  )
}

RolesPage.authGuard = true

export default RolesPage
