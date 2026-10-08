/**
 * Drill-down dialog for the Fundamental Maintenance Control dashboard (spec section 13).
 * Loads GET /api/dashboard/maintenance-control/drilldown with the dashboard filters and renders the list the server
 * describes (summary chips, columns, rows). WO numbers open the maintenance actual; backlog rows can carry a
 * pending reason (users with maintenance-plan update). Search filters the rows; CSV exports what is shown.
 */
import { useContext, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate } from 'src/utils/date-format'

const cellSx = { py: 1.5, px: 2.5, fontSize: '0.8rem', verticalAlign: 'top' }
const headSx = { ...cellSx, fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'background.paper' }

const formatNumber = value => (value == null ? '—' : Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 }))

/** Plain text of a cell, for search and CSV. */
function cellText(column, value) {
  if (value == null) return ''
  switch (column.type) {
    case 'wo':
      return [value.no, value.note].filter(Boolean).join(' ')
    case 'chip':
      return value.label
    case 'reason':
      return value.text ?? ''
    case 'list':
      return value.join('; ')
    default:
      return String(value)
  }
}

/** Download the shown rows as CSV (Excel opens it directly). */
function exportCsv(title, columns, rows) {
  const escape = text => `"${String(text).replace(/"/g, '""')}"`
  const lines = [columns.map(column => escape(column.label)).join(',')]
  for (const row of rows) lines.push(columns.map(column => escape(cellText(column, row[column.key]))).join(','))
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/** WO register number linking to the maintenance actual (new tab). */
const WoLink = ({ value }) => {
  if (!value?.id) return '—'

  return (
    <Box sx={{ whiteSpace: 'nowrap' }}>
      <Link href={`/maintenance-actuals/view/${value.id}`} target='_blank' style={{ fontWeight: 600 }}>
        {value.no || 'Open'}
      </Link>
      {value.note && (
        <Typography variant='caption' sx={{ display: 'block', color: 'text.secondary' }}>
          {formatDisplayDate(value.note)}
        </Typography>
      )}
    </Box>
  )
}

/** Pending reason for a backlog row; editable inline when allowed. */
const ReasonCell = ({ value, canEdit, onSaved }) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value?.text ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await arkaApi.patch(`/maintenance-plans/details/${value.detailId}/reason`, { reason: draft })
      onSaved(res.data)
      setEditing(false)
      toast.success(res.data.text ? 'Reason saved' : 'Reason cleared')
    } catch {
      // arkaApi shows the error toast
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 260 }}>
        <CustomTextField
          size='small'
          multiline
          maxRows={4}
          autoFocus
          fullWidth
          value={draft}
          placeholder='Why is this job still pending?'
          inputProps={{ maxLength: 500 }}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              save()
            }
            if (event.key === 'Escape') setEditing(false)
          }}
        />
        <IconButton size='small' color='primary' disabled={saving} onClick={save}>
          <Icon icon='tabler:check' fontSize='1.1rem' />
        </IconButton>
        <IconButton size='small' disabled={saving} onClick={() => setEditing(false)}>
          <Icon icon='tabler:x' fontSize='1.1rem' />
        </IconButton>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 180 }}>
      <Box sx={{ flex: 1 }}>
        {value?.text ? (
          <>
            <Typography variant='body2' sx={{ fontSize: '0.8rem' }}>
              {value.text}
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {[value.updatedBy, value.updatedAt && formatDisplayDate(value.updatedAt.slice(0, 10))].filter(Boolean).join(' · ')}
            </Typography>
          </>
        ) : (
          <Typography variant='caption' sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
            No reason yet
          </Typography>
        )}
      </Box>
      {canEdit && (
        <Tooltip title={value?.text ? 'Edit reason' : 'Add reason'} arrow>
          <IconButton
            size='small'
            onClick={() => {
              setDraft(value?.text ?? '')
              setEditing(true)
            }}
          >
            <Icon icon={value?.text ? 'tabler:pencil' : 'tabler:plus'} fontSize='1rem' />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

function Cell({ column, value, canEditReason, onReasonSaved }) {
  switch (column.type) {
    case 'date':
      return value ? <Box sx={{ whiteSpace: 'nowrap' }}>{formatDisplayDate(value)}</Box> : '—'
    case 'number':
      return formatNumber(value)
    case 'wo':
      return <WoLink value={value} />
    case 'chip':
      return value ? <CustomChip size='small' skin='light' color={value.color} label={value.label} /> : '—'
    case 'reason':
      return <ReasonCell value={value} canEdit={canEditReason} onSaved={onReasonSaved} />
    case 'list':
      return value?.length ? (
        <Box component='ul' sx={{ m: 0, pl: 3 }}>
          {value.map(item => (
            <li key={item}>
              <Typography variant='caption'>{item}</Typography>
            </li>
          ))}
        </Box>
      ) : (
        '—'
      )
    default:
      return value == null || value === '' ? '—' : String(value)
  }
}

/** Query params for the drill-down API from the dashboard filters and the list's own options. */
function drilldownParams(filters, request) {
  const [year, month] = filters.period.split('-').map(Number)
  const options = request.options ?? {}

  return {
    kind: request.kind,
    year,
    month,
    mode: filters.mode,
    projectId: filters.projectId || undefined,
    programId: filters.programId || undefined,
    bucket: options.bucket,
    qc: options.qc,
    severity: options.severity,
    open: options.open ? '1' : undefined,
    overdue: options.overdue ? '1' : undefined,
    repeat: options.repeat ? '1' : undefined
  }
}

const DrilldownDialog = ({ request, filters, onClose }) => {
  const ability = useContext(AbilityContext)
  const canEditReason = Boolean(ability?.can('update', 'maintenance-plan'))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  useEffect(() => {
    if (!request || !filters) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setData(null)
    setSearch('')
    setPage(0)
    arkaApi
      .get('/dashboard/maintenance-control/drilldown', { params: drilldownParams(filters, request) })
      .then(res => !cancelled && setData(res.data))
      .catch(err => !cancelled && setError(err?.userMessage || err?.message || 'Failed to load the list'))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [request, filters])

  const filtered = useMemo(() => {
    if (!data) return []
    const term = search.trim().toLowerCase()
    if (!term) return data.rows

    return data.rows.filter(row => data.columns.some(column => cellText(column, row[column.key]).toLowerCase().includes(term)))
  }, [data, search])

  /** Put a saved reason back into the loaded rows. */
  const onReasonSaved = saved =>
    setData(current => ({
      ...current,
      rows: current.rows.map(row => (row.reason?.detailId === saved.detailId ? { ...row, reason: { ...row.reason, ...saved } } : row))
    }))

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  const scope = data?.period

  return (
    <Dialog open={Boolean(request)} onClose={onClose} fullWidth maxWidth='xl' scroll='paper'>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, pb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant='h5' sx={{ fontWeight: 700 }}>
            {data?.title ?? request?.label ?? 'Detail'}
          </Typography>
          {data?.subtitle && (
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              {data.subtitle}
            </Typography>
          )}
          {scope && (
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {scope.mode} {formatDisplayDate(scope.start)} – {formatDisplayDate(scope.end)} · {filters.projectId || 'All sites'} ·{' '}
              {scope.programName || 'All programs'} · Cut-off {formatDisplayDate(scope.cutoff)}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose}>
          <Icon icon='tabler:x' />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {loading && <LinearProgress />}
        {error && (
          <Alert severity='error' sx={{ m: 4 }}>
            {error}
          </Alert>
        )}

        {data && (
          <>
            {/* Summary numbers — these match the KPI that opened the list */}
            <Box sx={{ px: 5, py: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {data.summary.map(item => (
                <CustomChip
                  key={item.label}
                  skin='light'
                  color='primary'
                  label={
                    <span>
                      {item.label}: <strong>{item.value == null ? '—' : `${formatNumber(item.value)}${item.unit === '%' ? '%' : item.unit ? ` ${item.unit}` : ''}`}</strong>
                    </span>
                  }
                />
              ))}
            </Box>

            {/* Search + export */}
            <Box sx={{ px: 5, pb: 3, display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              <CustomTextField
                size='small'
                placeholder='Search unit, Reg. No, program, reason…'
                value={search}
                onChange={event => {
                  setSearch(event.target.value)
                  setPage(0)
                }}
                sx={{ width: 320 }}
                InputProps={{ startAdornment: <Icon icon='tabler:search' fontSize='1rem' style={{ marginRight: 8 }} /> }}
              />
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {filtered.length.toLocaleString('en-US')} rows
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button
                size='small'
                variant='tonal'
                startIcon={<Icon icon='tabler:file-spreadsheet' fontSize='1rem' />}
                disabled={!filtered.length}
                onClick={() => exportCsv(data.title, data.columns, filtered)}
              >
                Export CSV
              </Button>
            </Box>

            <TableContainer sx={{ maxHeight: '60vh' }}>
              <Table size='small' stickyHeader>
                <TableHead>
                  <TableRow>
                    {data.columns.map(column => (
                      <TableCell key={column.key} sx={headSx} align={column.align ?? 'left'}>
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.map(row => (
                    <TableRow key={row.id} hover>
                      {data.columns.map(column => (
                        <TableCell key={column.key} sx={cellSx} align={column.align ?? 'left'}>
                          <Cell column={column} value={row[column.key]} canEditReason={canEditReason} onReasonSaved={onReasonSaved} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {!pageRows.length && (
                    <TableRow>
                      <TableCell colSpan={data.columns.length} sx={{ ...cellSx, textAlign: 'center', color: 'text.secondary', py: 6 }}>
                        No rows for this filter
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component='div'
              count={filtered.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[25, 50, 100]}
              onPageChange={(_, next) => setPage(next)}
              onRowsPerPageChange={event => {
                setRowsPerPage(Number(event.target.value))
                setPage(0)
              }}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default DrilldownDialog
