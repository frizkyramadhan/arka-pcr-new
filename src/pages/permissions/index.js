/**
 * Permission list — TableHeader filters + TableServerSide DataGrid + AddPermissionDrawer.
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
import { formatPermissionModuleLabel, getPermissionModuleKey } from 'src/utils/permission-groups'
import { unwrapListPayload } from 'src/utils/unwrap-list-payload'

import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import { TableCrudActions } from 'src/@core/components/table-row-actions'

import TableHeader from 'src/views/apps/permissions/list/TableHeader'
import AddPermissionDrawer from 'src/views/apps/permissions/list/AddPermissionDrawer'
import TableServerSide from 'src/views/table/data-grid/TableServerSide'

const permissionStatusObj = {
  active: 'success',
  inactive: 'secondary'
}

const PermissionsPage = () => {
  const { can } = useCan()
  const canEdit = can('permissions.access')

  const [roles, setRoles] = useState([])
  const [permissionCatalog, setPermissionCatalog] = useState([])
  const [value, setValue] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchMeta = useCallback(async () => {
    try {
      const [permissionsRes, rolesRes] = await Promise.all([
        arkaApi.get('/permissions'),
        arkaApi.get('/roles')
      ])
      setPermissionCatalog(unwrapListPayload(permissionsRes.data))
      setRoles(unwrapListPayload(rolesRes.data))
    } catch (error) {
      await notifyApiError(error, 'Failed to load filter options', toast.error)
    }
  }, [])

  useEffect(() => {
    if (canEdit) fetchMeta()
  }, [canEdit, fetchMeta])

  const moduleOptions = useMemo(() => {
    const keys = new Set()
    for (const row of permissionCatalog) {
      if (row?.code) keys.add(getPermissionModuleKey(row.code))
    }

    return Array.from(keys).sort((a, b) => a.localeCompare(b))
  }, [permissionCatalog])

  const refreshPermissions = useCallback(() => {
    setRefreshKey(prev => prev + 1)
    fetchMeta()
  }, [fetchMeta])

  const toggleDrawer = () => {
    setDrawerOpen(prev => !prev)
    if (drawerOpen) setEditingPermission(null)
  }

  const openAddDrawer = () => {
    setEditingPermission(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = useCallback(row => {
    setEditingPermission(row)
    setDrawerOpen(true)
  }, [])

  const requestDelete = useCallback(row => {
    setDeleteTarget(row)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await arkaApi.delete(`/permissions/${deleteTarget.idPermission}`)
      toast.success('Permission deleted')
      setDeleteTarget(null)
      refreshPermissions()
    } catch (error) {
      await notifyApiError(error, 'Delete failed', toast.error)
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, refreshPermissions])

  const columns = useMemo(
    () => [
      {
        flex: 0.2,
        minWidth: 160,
        field: 'module',
        headerName: 'Module',
        sortable: false,
        valueGetter: ({ row }) => getPermissionModuleKey(row?.code),
        renderCell: ({ row }) => (
          <CustomChip
            skin='light'
            size='small'
            label={formatPermissionModuleLabel(getPermissionModuleKey(row?.code))}
            color='info'
          />
        )
      },
      {
        flex: 0.25,
        minWidth: 200,
        field: 'code',
        headerName: 'Permission',
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography noWrap variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
              {row.code}
            </Typography>
            <Typography noWrap variant='caption' color='text.secondary'>
              {row.description || '—'}
            </Typography>
          </Box>
        )
      },
      {
        flex: 0.35,
        minWidth: 220,
        field: 'roles',
        headerName: 'Roles',
        sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 2 }}>
            {(row.roles ?? []).map(item => (
              <CustomChip key={item.idRole} skin='light' size='small' label={item.name} color='primary' />
            ))}
          </Box>
        )
      },
      {
        flex: 0.1,
        minWidth: 110,
        field: 'isActive',
        headerName: 'Status',
        renderCell: ({ row }) => (
          <CustomChip
            rounded
            skin='light'
            size='small'
            label={row.isActive ? 'Active' : 'Inactive'}
            color={permissionStatusObj[row.isActive ? 'active' : 'inactive']}
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
      role: roleFilter,
      status: statusFilter
    }),
    [moduleFilter, roleFilter, statusFilter]
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
          title={<Typography variant='h4'>Permissions</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Permission catalog for API and UI access control
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <TableHeader
            value={value}
            moduleFilter={moduleFilter}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            modules={moduleOptions}
            roles={roles}
            handleFilter={setValue}
            handleModuleChange={setModuleFilter}
            handleRoleChange={setRoleFilter}
            handleStatusChange={setStatusFilter}
            toggle={openAddDrawer}
          />
          <TableServerSide
            hideCard
            hideToolbar
            title={null}
            apiPath='permissions'
            apiClient={arkaApi}
            columns={columns}
            getRowId={row => row.idPermission}
            defaultSortField='code'
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
      <AddPermissionDrawer
        open={drawerOpen}
        toggle={toggleDrawer}
        permission={editingPermission}
        roles={roles}
        onSaved={refreshPermissions}
      />
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete Permission?'
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.code}"? You won't be able to revert this!`
            : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Grid>
  )
}

PermissionsPage.authGuard = true

export default PermissionsPage
