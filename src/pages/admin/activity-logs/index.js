/**
 * Admin activity log — Spatie-style audit trail (activity-logs.access).
 * Advanced filters: log, event, subject, causer, project, date range.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

import CustomAvatar from 'src/@core/components/mui/avatar'
import CustomChip from 'src/@core/components/mui/chip'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'
import { getInitials } from 'src/@core/utils/get-initials'

import useCan from 'src/hooks/useCan'
import useProjects from 'src/hooks/useProjects'
import useServerDataGrid from 'src/hooks/useServerDataGrid'
import arkaApi from 'src/utils/arka-api'
import { getInspectionTypeByCode } from 'src/views/pcr/inspections/inspectionMeta'

/** Equal-width filter cells — 4 per row on md+, 2 on sm. */
const FILTER_ITEM = { xs: 12, sm: 6, md: 3 }

const EVENT_COLORS = {
  created: 'success',
  updated: 'info',
  deleted: 'error',
  submitted: 'warning',
  approved: 'success',
  rejected: 'error',
  logged: 'secondary'
}

const LOG_NAME_LABELS = {
  'maintenance-plans': 'Maintenance Plans',
  'maintenance-actuals': 'Maintenance Actuals',
  replacements: 'Replacements (PCR)',
  inspections: 'Inspections',
  sos: 'SOS',
  'hour-meters': 'Hour Meters',
  forecasts: 'Forecasts',
  cannibals: 'Cannibals',
  approvals: 'Approvals',
  users: 'Users',
  conditions: 'Conditions',
  system: 'System'
}

const LOG_NAME_COLORS = {
  'maintenance-plans': 'primary',
  'maintenance-actuals': 'primary',
  replacements: 'warning',
  inspections: 'info',
  sos: 'info',
  'hour-meters': 'secondary',
  forecasts: 'success',
  cannibals: 'error',
  approvals: 'warning',
  users: 'secondary',
  conditions: 'info',
  system: 'secondary'
}

const EMPTY_OPTIONS = { logNames: [], events: [], subjectTypes: [], causers: [] }

const filterFieldSx = {
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    color: 'text.secondary'
  }
}

const formatWhen = value => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
}

const formatRelative = value => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const diffMs = Date.now() - date.getTime()
  const abs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (abs < minute) return 'just now'
  if (abs < hour) {
    const n = Math.floor(abs / minute)

    return `${n}m ago`
  }
  if (abs < day) {
    const n = Math.floor(abs / hour)

    return `${n}h ago`
  }
  if (abs < 7 * day) {
    const n = Math.floor(abs / day)

    return `${n}d ago`
  }

  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const logLabel = name => LOG_NAME_LABELS[name] || name || 'default'
const logColor = name => LOG_NAME_COLORS[name] || 'secondary'

const causerDisplay = row =>
  row?.causerName || row?.causerUsername || (row?.causerId ? `User #${row.causerId}` : 'system')

const causerSelectLabel = causer => {
  if (!causer) return '—'
  const name = causer.fullName || causer.username

  return name ? `${name} (#${causer.id})` : `User #${causer.id}`
}

const subjectLabel = row => {
  if (!row?.subjectType) return '—'
  if (row.subjectId != null) return `${row.subjectType} #${row.subjectId}`
  const entityId = row.properties?.entityId
  if (entityId) return `${row.subjectType} · ${String(entityId).slice(0, 8)}…`

  return row.subjectType
}

const subjectFullLabel = row => {
  if (!row?.subjectType) return '—'
  if (row.subjectId != null) return `${row.subjectType} #${row.subjectId}`
  if (row.properties?.entityId) return `${row.subjectType} (${row.properties.entityId})`

  return row.subjectType
}

const projectFromRow = row =>
  row?.properties?.projectCode || row?.properties?.projectId || row?.properties?.planProjectId || null

/** Inspection type label from activity properties (new + legacy logs). */
const inspectionTypeFromRow = row => {
  if (!row?.properties?.type && !row?.properties?.typeLabel) return null
  if (row.logName && row.logName !== 'inspections' && row.subjectType !== 'Inspection') return null

  const code = row.properties.type
  const meta = code ? getInspectionTypeByCode(code) : null
  if (meta) return { code: meta.code, label: meta.label }
  if (row.properties.typeLabel) {
    return { code: code || null, label: String(row.properties.typeLabel) }
  }
  if (code) return { code: String(code), label: String(code) }

  return null
}

const DiffBlock = ({ changes }) => {
  if (!changes || typeof changes !== 'object') {
    return (
      <Typography variant='body2' color='text.secondary'>
        —
      </Typography>
    )
  }

  const next = changes.attributes || {}
  const prev = changes.old || {}
  const keys = Array.from(new Set([...Object.keys(next), ...Object.keys(prev)]))

  if (!keys.length) {
    return (
      <Typography variant='body2' color='text.secondary'>
        —
      </Typography>
    )
  }

  return (
    <Stack spacing={2}>
      {keys.map(key => (
        <Box
          key={key}
          sx={{
            p: 2.5,
            borderRadius: 1,
            bgcolor: 'action.hover',
            border: theme => `1px solid ${theme.palette.divider}`
          }}
        >
          <Typography variant='caption' sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
            {key}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography variant='body2' sx={{ color: 'error.main', textDecoration: 'line-through', opacity: 0.85 }}>
              {prev[key] == null || prev[key] === '' ? '—' : String(prev[key])}
            </Typography>
            <Typography variant='body2' sx={{ color: 'success.main', fontWeight: 500 }}>
              {next[key] == null || next[key] === '' ? '—' : String(next[key])}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  )
}

const JsonBlock = ({ value }) => {
  if (!value || typeof value !== 'object' || !Object.keys(value).length) {
    return (
      <Typography variant='body2' color='text.secondary'>
        —
      </Typography>
    )
  }

  return (
    <Box
      component='pre'
      sx={{
        m: 0,
        p: 3,
        bgcolor: 'action.hover',
        borderRadius: 1,
        border: theme => `1px solid ${theme.palette.divider}`,
        fontSize: 12,
        lineHeight: 1.55,
        overflow: 'auto',
        maxHeight: 240,
        fontFamily: 'Menlo, Consolas, monospace'
      }}
    >
      {JSON.stringify(value, null, 2)}
    </Box>
  )
}

const DetailRow = ({ icon, label, children }) => (
  <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
    <CustomAvatar skin='light' color='secondary' sx={{ width: 34, height: 34 }}>
      <Icon icon={icon} fontSize='1.1rem' />
    </CustomAvatar>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {children}
    </Box>
  </Box>
)

const ActivityLogsPage = () => {
  const { can } = useCan()
  const canView = can('activity-logs.access')

  const [q, setQ] = useState('')
  const [logName, setLogName] = useState('')
  const [event, setEvent] = useState('')
  const [subjectType, setSubjectType] = useState('')
  const [causerId, setCauserId] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [options, setOptions] = useState(EMPTY_OPTIONS)
  const [detail, setDetail] = useState(null)
  const { projects: projectOptions } = useProjects()

  const filterParams = useMemo(() => {
    const params = {}
    if (logName) params.logName = logName
    if (event) params.event = event
    if (subjectType) params.subjectType = subjectType
    if (causerId) params.causerId = causerId
    if (projectCode.trim()) params.projectCode = projectCode.trim()
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo

    return params
  }, [logName, event, subjectType, causerId, projectCode, dateFrom, dateTo])

  const hasActiveFilters = Boolean(
    q || logName || event || subjectType || causerId || projectCode.trim() || dateFrom || dateTo
  )

  const clearFilters = useCallback(() => {
    setQ('')
    setLogName('')
    setEvent('')
    setSubjectType('')
    setCauserId('')
    setProjectCode('')
    setDateFrom('')
    setDateTo('')
  }, [])

  const { serverGridProps, rowCount, reload } = useServerDataGrid({
    apiPath: '/admin/activity-logs',
    filterParams,
    searchValue: q,
    defaultSortField: 'createdAt',
    defaultSortOrder: 'desc',
    enabled: canView,
    initialPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100]
  })

  const fetchMeta = useCallback(async () => {
    try {
      const res = await arkaApi.get('/admin/activity-logs', { params: { meta: 1 } })
      setOptions({
        logNames: res.data?.data?.logNames ?? [],
        events: res.data?.data?.events ?? [],
        subjectTypes: res.data?.data?.subjectTypes ?? [],
        causers: res.data?.data?.causers ?? []
      })
    } catch {
      setOptions(EMPTY_OPTIONS)
    }
  }, [])

  useEffect(() => {
    if (canView) fetchMeta()
  }, [canView, fetchMeta])

  const activeFilterChips = useMemo(() => {
    const chips = []
    if (q) chips.push({ key: 'q', label: `Search: ${q}`, onDelete: () => setQ('') })
    if (logName) chips.push({ key: 'log', label: `Log: ${logLabel(logName)}`, onDelete: () => setLogName('') })
    if (event) chips.push({ key: 'event', label: `Event: ${event}`, onDelete: () => setEvent('') })
    if (subjectType) {
      chips.push({ key: 'subject', label: `Subject: ${subjectType}`, onDelete: () => setSubjectType('') })
    }
    if (causerId) {
      const user = options.causers.find(item => String(item.id) === String(causerId))
      chips.push({
        key: 'causer',
        label: `Causer: ${user ? causerSelectLabel(user) : `#${causerId}`}`,
        onDelete: () => setCauserId('')
      })
    }
    if (projectCode.trim()) {
      const project = projectOptions.find(item => String(item.value) === projectCode.trim())
      chips.push({
        key: 'project',
        label: `Project: ${project?.label || projectCode.trim()}`,
        onDelete: () => setProjectCode('')
      })
    }
    if (dateFrom) chips.push({ key: 'from', label: `From: ${dateFrom}`, onDelete: () => setDateFrom('') })
    if (dateTo) chips.push({ key: 'to', label: `To: ${dateTo}`, onDelete: () => setDateTo('') })

    return chips
  }, [q, logName, event, subjectType, causerId, projectCode, dateFrom, dateTo, options.causers, projectOptions])

  const columns = useMemo(
    () => [
      {
        field: 'createdAt',
        headerName: 'When',
        minWidth: 128,
        flex: 0.14,
        renderCell: ({ row }) => (
          <Tooltip title={formatWhen(row.createdAt)} placement='top'>
            <Box sx={{ py: 1.5, lineHeight: 1.25 }}>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {formatRelative(row.createdAt)}
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                {formatWhen(row.createdAt)}
              </Typography>
            </Box>
          </Tooltip>
        )
      },
      {
        field: 'logName',
        headerName: 'Module',
        minWidth: 150,
        flex: 0.14,
        renderCell: ({ row }) => (
          <CustomChip
            rounded
            size='small'
            skin='light'
            label={logLabel(row.logName)}
            color={logColor(row.logName)}
          />
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
        headerName: 'Activity',
        minWidth: 260,
        flex: 0.32,
        sortable: false,
        renderCell: ({ row }) => {
          const project = projectFromRow(row)
          const inspectionType = inspectionTypeFromRow(row)
          const metaParts = [subjectLabel(row), project].filter(Boolean)

          return (
            <Box sx={{ py: 1.5, minWidth: 0, width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap variant='body2' title={row.description} sx={{ fontWeight: 500 }}>
                  {row.description}
                </Typography>
                <Typography noWrap variant='caption' color='text.disabled' title={subjectFullLabel(row)}>
                  {metaParts.join(' · ')}
                </Typography>
              </Box>
              {inspectionType ? (
                <Tooltip title={inspectionType.label}>
                  <span>
                    <CustomChip
                      rounded
                      size='small'
                      skin='light'
                      color='info'
                      label={inspectionType.code || inspectionType.label}
                    />
                  </span>
                </Tooltip>
              ) : null}
            </Box>
          )
        }
      },
      {
        field: 'causerName',
        headerName: 'Causer',
        minWidth: 180,
        flex: 0.18,
        sortable: false,
        renderCell: ({ row }) => {
          const name = causerDisplay(row)
          const isSystem = !row.causerId

          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
              <CustomAvatar
                skin='light'
                color={isSystem ? 'secondary' : 'primary'}
                sx={{ width: 32, height: 32, fontSize: '0.75rem' }}
              >
                {isSystem ? <Icon icon='tabler:robot' fontSize='1rem' /> : getInitials(name)}
              </CustomAvatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap variant='body2' sx={{ fontWeight: 500 }}>
                  {name}
                </Typography>
                {row.causerUsername && row.causerName ? (
                  <Typography noWrap variant='caption' color='text.disabled'>
                    @{row.causerUsername}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          )
        }
      },
      {
        field: 'actions',
        headerName: '',
        width: 72,
        sortable: false,
        align: 'center',
        headerAlign: 'center',
        renderCell: ({ row }) => (
          <Tooltip title='View detail'>
            <IconButton
              size='small'
              onClick={e => {
                e.stopPropagation()
                setDetail(row)
              }}
              aria-label='View activity detail'
            >
              <Icon icon='tabler:eye' fontSize='1.25rem' />
            </IconButton>
          </Tooltip>
        )
      }
    ],
    []
  )

  const detailInspectionType = inspectionTypeFromRow(detail)

  if (!canView) {
    return (
      <Box>
        <PageHeader title='Activity Logs' subtitle='Admin audit trail' />
        <Typography>You need activity-logs.access permission to view this page.</Typography>
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
              Audit trail — siapa melakukan apa, kapan, dan pada modul mana
            </Typography>
          }
        />
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader
            title='Activity trail'
            subheader={`${rowCount.toLocaleString('id-ID')} record${rowCount === 1 ? '' : 's'} matched`}
            action={
              <Tooltip title='Refresh'>
                <IconButton onClick={reload} aria-label='Refresh activity logs'>
                  <Icon icon='tabler:refresh' />
                </IconButton>
              </Tooltip>
            }
          />
          <Divider />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, gap: 2 }}>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                Search Filters
              </Typography>
              {hasActiveFilters ? (
                <Button
                  size='small'
                  variant='tonal'
                  color='secondary'
                  onClick={clearFilters}
                  startIcon={<Icon icon='tabler:filter-off' />}
                >
                  Clear all
                </Button>
              ) : null}
            </Box>

            <Grid container spacing={3} alignItems='flex-end'>
              <Grid item {...FILTER_ITEM}>
                <CustomTextField
                  fullWidth
                  size='small'
                  label='Search'
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder='Description, user, event…'
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                        <Icon fontSize='1.125rem' icon='tabler:search' />
                      </Box>
                    )
                  }}
                  sx={filterFieldSx}
                />
              </Grid>
              <Grid item {...FILTER_ITEM}>
                <SearchableSelect
                  fullWidth
                  size='small'
                  label='Module'
                  value={logName}
                  onChange={e => setLogName(e.target.value)}
                  options={[
                    { value: '', label: 'All modules' },
                    ...options.logNames.map(name => ({
                      value: name,
                      label: logLabel(name)
                    }))
                  ]}
                  sx={filterFieldSx}
                />
              </Grid>
              <Grid item {...FILTER_ITEM}>
                <SearchableSelect
                  fullWidth
                  size='small'
                  label='Event'
                  value={event}
                  onChange={e => setEvent(e.target.value)}
                  options={[
                    { value: '', label: 'All events' },
                    ...options.events.map(code => ({ value: code, label: code }))
                  ]}
                  sx={filterFieldSx}
                />
              </Grid>
              <Grid item {...FILTER_ITEM}>
                <SearchableSelect
                  fullWidth
                  size='small'
                  label='Subject'
                  value={subjectType}
                  onChange={e => setSubjectType(e.target.value)}
                  options={[
                    { value: '', label: 'All subjects' },
                    ...options.subjectTypes.map(type => ({ value: type, label: type }))
                  ]}
                  sx={filterFieldSx}
                />
              </Grid>
              <Grid item {...FILTER_ITEM}>
                <SearchableSelect
                  fullWidth
                  size='small'
                  label='Causer'
                  value={causerId}
                  onChange={e => setCauserId(e.target.value)}
                  options={[
                    { value: '', label: 'All users' },
                    ...options.causers.map(user => ({
                      value: String(user.id),
                      label: causerSelectLabel(user)
                    }))
                  ]}
                  sx={filterFieldSx}
                />
              </Grid>
              <Grid item {...FILTER_ITEM}>
                <SearchableSelect
                  fullWidth
                  size='small'
                  label='Project'
                  value={projectCode}
                  onChange={e => setProjectCode(e.target.value)}
                  placeholder='Search project…'
                  options={[
                    { value: '', label: 'All projects' },
                    ...projectOptions
                  ]}
                  sx={filterFieldSx}
                />
              </Grid>
              <Grid item {...FILTER_ITEM}>
                <CustomTextField
                  fullWidth
                  size='small'
                  type='date'
                  label='From'
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={filterFieldSx}
                />
              </Grid>
              <Grid item {...FILTER_ITEM}>
                <CustomTextField
                  fullWidth
                  size='small'
                  type='date'
                  label='To'
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={filterFieldSx}
                />
              </Grid>
            </Grid>

            {activeFilterChips.length ? (
              <Stack direction='row' flexWrap='wrap' useFlexGap spacing={2} sx={{ mt: 4 }}>
                {activeFilterChips.map(chip => (
                  <CustomChip
                    key={chip.key}
                    rounded
                    size='small'
                    skin='light'
                    color='primary'
                    label={chip.label}
                    onDelete={chip.onDelete}
                  />
                ))}
              </Stack>
            ) : null}
          </CardContent>

          <DataGrid
            autoHeight
            columns={columns}
            getRowId={row => row.id}
            disableRowSelectionOnClick
            onRowClick={({ row }) => setDetail(row)}
            sx={{
              border: 0,
              '& .MuiDataGrid-row': { cursor: 'pointer' },
              '& .MuiDataGrid-cell': { alignItems: 'center' },
              '& .MuiDataGrid-columnHeaders': {
                borderTop: theme => `1px solid ${theme.palette.divider}`
              }
            }}
            {...serverGridProps}
          />
        </Card>
      </Grid>

      <Drawer
        anchor='right'
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 460 },
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        {detail ? (
          <>
            <Box
              sx={{
                px: 5,
                py: 4,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
                borderBottom: theme => `1px solid ${theme.palette.divider}`
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant='h5' sx={{ mb: 1 }}>
                  Activity #{detail.id}
                </Typography>
                <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                  <CustomChip
                    rounded
                    size='small'
                    skin='light'
                    label={logLabel(detail.logName)}
                    color={logColor(detail.logName)}
                  />
                  <CustomChip
                    rounded
                    size='small'
                    skin='light'
                    label={detail.event || '—'}
                    color={EVENT_COLORS[detail.event] || 'primary'}
                  />
                  {detailInspectionType ? (
                    <CustomChip
                      rounded
                      size='small'
                      skin='light'
                      color='info'
                      label={
                        detailInspectionType.code
                          ? `${detailInspectionType.label} (${detailInspectionType.code})`
                          : detailInspectionType.label
                      }
                    />
                  ) : null}
                </Stack>
              </Box>
              <IconButton onClick={() => setDetail(null)} aria-label='Close detail'>
                <Icon icon='tabler:x' />
              </IconButton>
            </Box>

            <Box sx={{ px: 5, py: 5, overflow: 'auto', flex: 1 }}>
              <Typography variant='body1' sx={{ mb: 5, fontWeight: 500, lineHeight: 1.6 }}>
                {detail.description}
              </Typography>

              <Stack spacing={4}>
                <DetailRow icon='tabler:clock' label='When'>
                  <Typography variant='body2' sx={{ fontWeight: 600 }}>
                    {formatRelative(detail.createdAt)}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {formatWhen(detail.createdAt)}
                  </Typography>
                </DetailRow>

                <DetailRow icon='tabler:user' label='Causer'>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CustomAvatar
                      skin='light'
                      color={detail.causerId ? 'primary' : 'secondary'}
                      sx={{ width: 28, height: 28, fontSize: '0.7rem' }}
                    >
                      {detail.causerId ? getInitials(causerDisplay(detail)) : <Icon icon='tabler:robot' fontSize='0.9rem' />}
                    </CustomAvatar>
                    <Box>
                      <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {causerDisplay(detail)}
                      </Typography>
                      {detail.causerUsername ? (
                        <Typography variant='caption' color='text.secondary'>
                          @{detail.causerUsername}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                </DetailRow>

                <DetailRow icon='tabler:target' label='Subject'>
                  <Typography variant='body2' sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                    {subjectFullLabel(detail)}
                  </Typography>
                  {projectFromRow(detail) ? (
                    <Typography variant='caption' color='text.secondary'>
                      Project {projectFromRow(detail)}
                    </Typography>
                  ) : null}
                </DetailRow>
              </Stack>

              <Divider sx={{ my: 5 }} />

              <Typography variant='subtitle2' sx={{ mb: 2 }}>
                Properties
              </Typography>
              <JsonBlock value={detail.properties} />

              <Typography variant='subtitle2' sx={{ mt: 5, mb: 2 }}>
                Attribute changes
              </Typography>
              <DiffBlock changes={detail.attributeChanges} />
            </Box>
          </>
        ) : null}
      </Drawer>
    </Grid>
  )
}

ActivityLogsPage.acl = {
  action: 'read',
  subject: 'activity-logs'
}

export default ActivityLogsPage
