/**
 * Admin activity log — Spatie-style audit trail (system.admin).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

import CustomChip from 'src/@core/components/mui/chip'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'

import useCan from 'src/hooks/useCan'
import useServerDataGrid from 'src/hooks/useServerDataGrid'
import arkaApi from 'src/utils/arka-api'

const EVENT_COLORS = {
  created: 'success',
  updated: 'info',
  deleted: 'error',
  submitted: 'warning',
  approved: 'success',
  rejected: 'error',
  logged: 'secondary'
}

const formatWhen = value => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
}

const jsonPreview = value => {
  if (!value || typeof value !== 'object') return '—'
  const text = JSON.stringify(value)
  if (text === '{}' || text === 'null') return '—'

  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

const ActivityLogsPage = () => {
  const { can } = useCan()
  const isAdmin = can('system.admin')

  const [q, setQ] = useState('')
  const [logName, setLogName] = useState('')
  const [event, setEvent] = useState('')
  const [subjectType, setSubjectType] = useState('')
  const [options, setOptions] = useState({ logNames: [], events: [], subjectTypes: [] })
  const [detail, setDetail] = useState(null)

  const filterParams = useMemo(
    () => ({
      logName,
      event,
      subjectType
    }),
    [logName, event, subjectType]
  )

  const { serverGridProps } = useServerDataGrid({
    apiPath: '/admin/activity-logs',
    filterParams,
    searchValue: q,
    defaultSortField: 'createdAt',
    defaultSortOrder: 'desc',
    enabled: isAdmin
  })

  const fetchMeta = useCallback(async () => {
    try {
      const res = await arkaApi.get('/admin/activity-logs', { params: { meta: 1 } })
      setOptions(res.data?.data ?? { logNames: [], events: [], subjectTypes: [] })
    } catch {
      setOptions({ logNames: [], events: [], subjectTypes: [] })
    }
  }, [])

  useEffect(() => {
    if (isAdmin) fetchMeta()
  }, [isAdmin, fetchMeta])

  const columns = useMemo(
    () => [
      {
        field: 'createdAt',
        headerName: 'When',
        minWidth: 150,
        flex: 0.16,
        renderCell: ({ row }) => (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {formatWhen(row.createdAt)}
          </Typography>
        )
      },
      {
        field: 'logName',
        headerName: 'Log',
        minWidth: 110,
        flex: 0.1,
        renderCell: ({ row }) => (
          <CustomChip rounded size='small' skin='light' label={row.logName || 'default'} color='secondary' />
        )
      },
      {
        field: 'event',
        headerName: 'Event',
        minWidth: 110,
        flex: 0.1,
        renderCell: ({ row }) => (
          <CustomChip
            rounded
            size='small'
            skin='light'
            label={row.event || '—'}
            color={EVENT_COLORS[row.event] || 'primary'}
          />
        )
      },
      {
        field: 'description',
        headerName: 'Description',
        minWidth: 240,
        flex: 0.28,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography noWrap variant='body2' title={row.description}>
            {row.description}
          </Typography>
        )
      },
      {
        field: 'causerName',
        headerName: 'Causer',
        minWidth: 140,
        flex: 0.14,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography noWrap variant='body2'>
            {row.causerName || row.causerUsername || (row.causerId ? `#${row.causerId}` : 'system')}
          </Typography>
        )
      },
      {
        field: 'subjectType',
        headerName: 'Subject',
        minWidth: 150,
        flex: 0.14,
        renderCell: ({ row }) => (
          <Typography noWrap variant='body2' sx={{ color: 'text.secondary' }}>
            {row.subjectType ? `${row.subjectType} #${row.subjectId ?? '—'}` : '—'}
          </Typography>
        )
      },
      {
        field: 'actions',
        headerName: '',
        width: 64,
        sortable: false,
        renderCell: ({ row }) => (
          <IconButton size='small' onClick={() => setDetail(row)} aria-label='View activity detail'>
            <Icon icon='tabler:eye' fontSize='1.25rem' />
          </IconButton>
        )
      }
    ],
    []
  )

  if (!isAdmin) {
    return (
      <Box>
        <PageHeader title='Activity Logs' subtitle='Admin audit trail' />
        <Typography>You need system.admin permission to view this page.</Typography>
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Activity Logs</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Audit trail of user actions (Spatie activitylog style)
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <Box sx={{ py: 4, px: 6, display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
            <CustomTextField
              label='Search'
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder='Description, user, event…'
              sx={{ minWidth: 220 }}
            />
            <SearchableSelect
              label='Log'
              value={logName}
              onChange={e => setLogName(e.target.value)}
              options={[
                { value: '', label: 'All logs' },
                ...options.logNames.map(name => ({ value: name, label: name }))
              ]}
              sx={{ minWidth: 140 }}
            />
            <SearchableSelect
              label='Event'
              value={event}
              onChange={e => setEvent(e.target.value)}
              options={[
                { value: '', label: 'All events' },
                ...options.events.map(code => ({ value: code, label: code }))
              ]}
              sx={{ minWidth: 140 }}
            />
            <SearchableSelect
              label='Subject'
              value={subjectType}
              onChange={e => setSubjectType(e.target.value)}
              options={[
                { value: '', label: 'All subjects' },
                ...options.subjectTypes.map(type => ({ value: type, label: type }))
              ]}
              sx={{ minWidth: 160 }}
            />
          </Box>
          <DataGrid
            autoHeight
            columns={columns}
            getRowId={row => row.id}
            disableRowSelectionOnClick
            {...serverGridProps}
          />
        </Card>
      </Grid>

      <Drawer anchor='right' open={Boolean(detail)} onClose={() => setDetail(null)} PaperProps={{ sx: { width: 420, p: 6 } }}>
        {detail ? (
          <Box>
            <Typography variant='h5' sx={{ mb: 4 }}>
              Activity #{detail.id}
            </Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              <strong>When:</strong> {formatWhen(detail.createdAt)}
            </Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              <strong>Log / event:</strong> {detail.logName} / {detail.event}
            </Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              <strong>Causer:</strong>{' '}
              {detail.causerName || detail.causerUsername || (detail.causerId ? `User #${detail.causerId}` : 'system')}
            </Typography>
            <Typography variant='body2' sx={{ mb: 2 }}>
              <strong>Subject:</strong>{' '}
              {detail.subjectType ? `${detail.subjectType} #${detail.subjectId}` : '—'}
            </Typography>
            <Typography variant='body2' sx={{ mb: 4 }}>
              {detail.description}
            </Typography>
            <Typography variant='subtitle2'>Properties</Typography>
            <Box
              component='pre'
              sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 1, fontSize: 12, overflow: 'auto' }}
            >
              {jsonPreview(detail.properties) === '—' ? '—' : JSON.stringify(detail.properties, null, 2)}
            </Box>
            <Typography variant='subtitle2' sx={{ mt: 4 }}>
              Attribute changes
            </Typography>
            <Box
              component='pre'
              sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 1, fontSize: 12, overflow: 'auto' }}
            >
              {jsonPreview(detail.attributeChanges) === '—'
                ? '—'
                : JSON.stringify(detail.attributeChanges, null, 2)}
            </Box>
          </Box>
        ) : null}
      </Drawer>
    </Grid>
  )
}

ActivityLogsPage.acl = {
  action: 'read',
  subject: 'system-admin'
}

export default ActivityLogsPage
