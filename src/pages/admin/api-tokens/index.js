/**
 * API Tokens (System menu) — tokens other applications use to read the FMS API (`/api/v1/fms/*`, spec section 17).
 * A token acts as the chosen user: same site scope and permissions. The plain token is shown once after creating;
 * revoke a token to cut access at once. Permissions: api-tokens.read / .create / .revoke (administrator role).
 * API reference: docs/fms-api.md.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import PageHeader from 'src/@core/components/page-header'
import useCan from 'src/hooks/useCan'
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'
import { apiPath } from 'src/utils/base-path'
import { formatDateTime } from 'src/views/dashboards/maintenance-control/shared'

const EMPTY_FORM = { userId: '', name: '', expiresInDays: '90' }

const STATUS_CHIP = {
  active: { label: 'Active', color: 'success' },
  expired: { label: 'Expired', color: 'warning' },
  revoked: { label: 'Revoked', color: 'secondary' }
}

const codeSx = { fontFamily: 'monospace', fontSize: '0.8125rem', wordBreak: 'break-all' }

/** Copies text and confirms with a toast (the token is only visible once). */
const copyText = async text => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Copied')
  } catch {
    toast.error('Copy failed — select the text and copy it manually')
  }
}

const ApiTokensPage = () => {
  const { can } = useCan()
  const canCreate = can('api-tokens.create')
  const canRevoke = can('api-tokens.revoke')

  const [tokens, setTokens] = useState([])
  const [users, setUsers] = useState([])
  const [expiryDays, setExpiryDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null)
  const [revokeTarget, setRevokeTarget] = useState(null)
  const [revoking, setRevoking] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    arkaApi
      .get('/api-tokens')
      .then(res => {
        setTokens(res.data?.tokens || [])
        setUsers(res.data?.users || [])
        setExpiryDays(res.data?.expiryDays || [])
      })
      .catch(error => {
        setTokens([])
        notifyApiError(error, 'Failed to load API tokens', toast.error)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const userOptions = useMemo(() => users.map(user => ({ value: String(user.id), label: `${user.name} (${user.username})` })), [users])

  const expiryOptions = useMemo(
    () => [...expiryDays.map(days => ({ value: String(days), label: `${days} days` })), { value: 'never', label: 'Never expires' }],
    [expiryDays]
  )

  /** Absolute API base shown in the usage card (follows NEXT_PUBLIC_BASE_PATH). */
  const [apiBase, setApiBase] = useState(apiPath('/api/v1/fms'))
  useEffect(() => {
    setApiBase(`${window.location.origin}${apiPath('/api/v1/fms')}`)
  }, [])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await arkaApi.post('/api-tokens', {
        userId: Number(form.userId),
        name: form.name,
        expiresInDays: form.expiresInDays === 'never' ? null : Number(form.expiresInDays)
      })
      setDialogOpen(false)
      setCreated(res.data)
      load()
    } catch (error) {
      await notifyApiError(error, 'Failed to create API token', toast.error)
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await arkaApi.delete(`/api-tokens/${revokeTarget.id}`)
      toast.success('API token revoked')
      setRevokeTarget(null)
      load()
    } catch (error) {
      await notifyApiError(error, 'Revoke failed', toast.error)
    } finally {
      setRevoking(false)
    }
  }

  const columns = useMemo(
    () => [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
      {
        field: 'user',
        headerName: 'Acts as user',
        width: 200,
        valueGetter: ({ row }) => `${row.user.name} (${row.user.username})`,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{`${row.user.name} (${row.user.username})`}</span>
            {!row.user.isActive && <CustomChip size='small' skin='light' color='error' label='Inactive' />}
          </Box>
        )
      },
      {
        field: 'tokenPrefix',
        headerName: 'Token',
        width: 150,
        renderCell: ({ value }) => <Box sx={codeSx}>{`${value}…`}</Box>
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        renderCell: ({ value }) => (
          <CustomChip size='small' skin='light' color={STATUS_CHIP[value]?.color} label={STATUS_CHIP[value]?.label ?? value} />
        )
      },
      {
        field: 'expiresAt',
        headerName: 'Expires',
        width: 160,
        valueFormatter: ({ value }) => (value ? formatDateTime(value) : 'Never')
      },
      {
        field: 'lastUsedAt',
        headerName: 'Last used',
        width: 200,
        valueGetter: ({ row }) => row.lastUsedAt,
        renderCell: ({ row }) =>
          row.lastUsedAt ? `${formatDateTime(row.lastUsedAt)}${row.lastUsedIp ? ` · ${row.lastUsedIp}` : ''}` : 'Never'
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 200,
        valueGetter: ({ row }) => row.createdAt,
        renderCell: ({ row }) => `${formatDateTime(row.createdAt)}${row.createdBy ? ` · ${row.createdBy}` : ''}`
      },
      {
        field: 'actions',
        headerName: 'Action',
        width: 90,
        sortable: false,
        renderCell: ({ row }) =>
          canRevoke && row.status === 'active' ? (
            <Tooltip title='Revoke'>
              <IconButton size='small' color='error' onClick={() => setRevokeTarget(row)}>
                <Icon icon='tabler:ban' fontSize='1.25rem' />
              </IconButton>
            </Tooltip>
          ) : null
      }
    ],
    [canRevoke]
  )

  const formValid = form.userId && form.name.trim() && form.expiresInDays

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>API Tokens</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Tokens for other applications reading the FMS KPI API. A token sees the same sites and data as its user.
            </Typography>
          }
        />
      </Grid>

      {/* Usage: endpoint base and header */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 2 }}>
              How to call the API
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary', mb: 3 }}>
              Send the token in the Authorization header. The user needs permission maintenance-dashboard.read (plus
              maintenance-dashboard.drilldown for /details). Full reference: docs/fms-api.md.
            </Typography>
            <Box sx={{ ...codeSx, p: 3, borderRadius: 1, bgcolor: 'action.hover', whiteSpace: 'pre-wrap' }}>
              {`curl -H "Authorization: Bearer <token>" "${apiBase}/kpi/?site=ALL&period=2026-09&view=YTD"\n`}
              {`curl -H "Authorization: Bearer <token>" "${apiBase}/details/backlog/?bucket=gt30&page=1&page_size=100"\n`}
              {`curl -H "Authorization: Bearer <token>" "${apiBase}/meta/"`}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          {canCreate && (
            <>
              <CardContent sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant='contained'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => {
                    setForm(EMPTY_FORM)
                    setDialogOpen(true)
                  }}
                >
                  Create token
                </Button>
              </CardContent>
              <Divider sx={{ m: '0 !important' }} />
            </>
          )}
          <DataGrid
            autoHeight
            loading={loading}
            rows={tokens}
            columns={columns}
            disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
          />
        </Card>
      </Grid>

      {/* Create token */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>Create API token</DialogTitle>
        <DialogContent>
          <Grid container spacing={4} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <CustomTextField
                fullWidth
                label='Name'
                placeholder='e.g. Power BI — HO dashboard'
                value={form.name}
                inputProps={{ maxLength: 100 }}
                onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
                helperText='Which application uses this token'
              />
            </Grid>
            <Grid item xs={12}>
              <SearchableSelect
                label='Acts as user'
                value={form.userId}
                onChange={event => setForm(prev => ({ ...prev, userId: event.target.value }))}
                placeholder='Search user…'
                options={userOptions}
              />
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                The API returns only the sites this user can see. Use a dedicated service user where possible.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Expires after'
                value={form.expiresInDays}
                onChange={event => setForm(prev => ({ ...prev, expiresInDays: event.target.value }))}
                options={expiryOptions}
                disableClearable
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' disabled={saving} onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant='contained' disabled={saving || !formValid} onClick={handleCreate}>
            {saving ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Show the new token once */}
      <Dialog open={Boolean(created)} maxWidth='sm' fullWidth disableEscapeKeyDown>
        <DialogTitle>Token created</DialogTitle>
        <DialogContent>
          <Alert severity='warning' sx={{ mb: 4 }}>
            Copy the token now. It is not stored and cannot be shown again.
          </Alert>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 3, borderRadius: 1, bgcolor: 'action.hover' }}>
            <Box sx={{ ...codeSx, flex: 1 }}>{created?.token}</Box>
            <Tooltip title='Copy'>
              <IconButton onClick={() => copyText(created?.token ?? '')}>
                <Icon icon='tabler:copy' />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant='body2' sx={{ mt: 3, color: 'text.secondary' }}>
            {created
              ? `${created.record.name} · acts as ${created.record.user.name} · ${
                  created.record.expiresAt ? `expires ${formatDateTime(created.record.expiresAt)}` : 'never expires'
                }`
              : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant='contained' onClick={() => setCreated(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmDialog
        open={Boolean(revokeTarget)}
        title='Revoke API token?'
        message={
          revokeTarget
            ? `Revoke "${revokeTarget.name}" (${revokeTarget.tokenPrefix}…)? Applications using it get 401 from now on. This cannot be undone.`
            : ''
        }
        confirmLabel='Revoke'
        loading={revoking}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
      />
    </Grid>
  )
}

ApiTokensPage.acl = {
  action: 'read',
  subject: 'api-tokens'
}

export default ApiTokensPage
