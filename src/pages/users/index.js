/**
 * User list — TableHeader filters + TableServerSide DataGrid + AddUserDrawer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import CustomChip from 'src/@core/components/mui/chip'
import CustomAvatar from 'src/@core/components/mui/avatar'
import PageHeader from 'src/@core/components/page-header'
import { getInitials } from 'src/@core/utils/get-initials'

import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'
import { unwrapListPayload } from 'src/utils/unwrap-list-payload'
import { getRoleDisplayLabel } from '@/lib/rbac/role-display'
import useCan from 'src/hooks/useCan'

import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import { TableCrudActions } from 'src/@core/components/table-row-actions'

import TableHeader from 'src/views/apps/user/list/TableHeader'
import AddUserDrawer from 'src/views/apps/user/list/AddUserDrawer'
import TableServerSide from 'src/views/table/data-grid/TableServerSide'

const userStatusObj = {
  active: 'success',
  inactive: 'secondary'
}

/** Roles column: prefer API roleDetails, fallback to role name strings. */
function resolveUserRoles(row) {
  if (row.roleDetails?.length) return row.roleDetails
  
return (row.roles ?? []).map(name => ({ idRole: name, name, description: null }))
}

function rolesRowHeight(row, baseHeight = 62) {
  const count = resolveUserRoles(row).length
  if (count <= 2) return baseHeight

  return baseHeight + Math.ceil((count - 2) / 2) * 28
}

const renderUserAvatar = row => (
  <CustomAvatar
    skin='light'
    color='primary'
    sx={{ mr: 2.5, width: 38, height: 38, fontWeight: 500, fontSize: theme => theme.typography.body1.fontSize }}
  >
    {getInitials(row.fullName || row.username || 'U')}
  </CustomAvatar>
)

const UsersPage = () => {
  const { can } = useCan()
  const canEdit = can('users.access')

  const [projects, setProjects] = useState([])
  const [roles, setRoles] = useState([])
  const [value, setValue] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchMeta = useCallback(async () => {
    try {
      const [projectsRes, rolesRes] = await Promise.all([
        arkaApi.get('/projects'),
        arkaApi.get('/roles', { params: { status: 'active' } })
      ])
      setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : [])
      setRoles(unwrapListPayload(rolesRes.data))
    } catch (error) {
      await notifyApiError(error, 'Failed to load filter options', toast.error)
    }
  }, [])

  useEffect(() => {
    if (canEdit) fetchMeta()
  }, [canEdit, fetchMeta])

  const refreshUsers = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  const toggleDrawer = () => {
    setDrawerOpen(prev => !prev)
    if (drawerOpen) setEditingUser(null)
  }

  const openAddDrawer = () => {
    setEditingUser(null)
    setDrawerOpen(true)
  }

  const openEditDrawer = useCallback(row => {
    setEditingUser(row)
    setDrawerOpen(true)
  }, [])

  const requestDelete = useCallback(row => {
    setDeleteTarget(row)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await arkaApi.delete(`/users/${deleteTarget.idUser}`)
      toast.success('User deleted')
      setDeleteTarget(null)
      refreshUsers()
    } catch (error) {
      await notifyApiError(error, 'Delete failed', toast.error)
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, refreshUsers])

  const columns = useMemo(
    () => [
      {
        flex: 0.25,
        minWidth: 280,
        field: 'fullName',
        headerName: 'User',
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {renderUserAvatar(row)}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column' }}>
              <Typography noWrap sx={{ fontWeight: 500, color: 'text.secondary' }}>
                {row.fullName || row.username}
              </Typography>
              <Typography noWrap variant='body2' sx={{ color: 'text.disabled' }}>
                @{row.username}
              </Typography>
            </Box>
          </Box>
        )
      },
      {
        flex: 0.18,
        minWidth: 160,
        field: 'email',
        headerName: 'Email',
        renderCell: ({ row }) => (
          <Typography noWrap sx={{ color: 'text.secondary' }} title={row.email ?? ''}>
            {row.email || '—'}
          </Typography>
        )
      },
      {
        flex: 0.22,
        field: 'roles',
        minWidth: 220,
        headerName: 'Roles',
        sortable: false,
        renderCell: ({ row }) => {
          const assignedRoles = resolveUserRoles(row)

          if (!assignedRoles.length) {
            return (
              <Typography variant='body2' sx={{ color: 'text.disabled' }}>
                —
              </Typography>
            )
          }

          return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, py: 1.5, alignItems: 'center' }}>
              {assignedRoles.map(role => (
                <CustomChip
                  key={role.idRole ?? role.name}
                  skin='light'
                  size='small'
                  label={getRoleDisplayLabel(role)}
                  color='primary'
                  title={role.description ?? role.name}
                />
              ))}
            </Box>
          )
        }
      },
      {
        flex: 0.22,
        minWidth: 200,
        field: 'projectCodes',
        headerName: 'Project Scopes',
        sortable: false,
        renderCell: ({ row }) => (
          <Typography noWrap sx={{ color: 'text.secondary' }} title={row.projectCodes?.join(', ')}>
            {row.projectCodes?.length ? row.projectCodes.join(', ') : '—'}
          </Typography>
        )
      },
      {
        flex: 0.1,
        minWidth: 100,
        field: 'isActive',
        headerName: 'Status',
        renderCell: ({ row }) => {
          const label = row.isActive ? 'active' : 'inactive'

          return (
            <CustomChip
              rounded
              skin='light'
              size='small'
              label={label}
              color={userStatusObj[label]}
              sx={{ textTransform: 'capitalize' }}
            />
          )
        }
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
      role: roleFilter,
      project: projectFilter,
      status: statusFilter
    }),
    [roleFilter, projectFilter, statusFilter]
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
          title={<Typography variant='h4'>Users</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>Manage user accounts, roles, and project access</Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <TableHeader
            value={value}
            roleFilter={roleFilter}
            projectFilter={projectFilter}
            statusFilter={statusFilter}
            roles={roles}
            projects={projects}
            handleFilter={setValue}
            handleRoleChange={setRoleFilter}
            handleProjectChange={setProjectFilter}
            handleStatusChange={setStatusFilter}
            toggle={openAddDrawer}
          />
          <TableServerSide
            hideCard
            hideToolbar
            title={null}
            apiPath='users'
            apiClient={arkaApi}
            columns={columns}
            getRowId={row => row.idUser}
            defaultSortField='fullName'
            extraParams={tableFilters}
            searchValue={value}
            onSearchChange={setValue}
            refreshKey={refreshKey}
            checkboxSelection={false}
            disableRowSelectionOnClick
            serverPagination
            getRowHeight={({ model }) => rolesRowHeight(model)}
            initialPageSize={10}
            pageSizeOptions={[10, 25, 50]}
            sx={{ '& .MuiDataGrid-columnHeaders': { borderRadius: 0 } }}
          />
        </Card>
      </Grid>
      <AddUserDrawer
        open={drawerOpen}
        toggle={toggleDrawer}
        user={editingUser}
        projects={projects}
        roles={roles}
        onSaved={refreshUsers}
      />
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete User?'
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.fullName || deleteTarget.username}"? You won't be able to revert this!`
            : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Grid>
  )
}

UsersPage.authGuard = true

export default UsersPage
