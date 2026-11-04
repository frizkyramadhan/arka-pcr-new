/**
 * Summary Breakdown board — accordion sections per plant group.
 * ETA RFU (date) and ETA RFU IF PART SUPPLIED (days) editable on open BD rows.
 * Edit BD opens BreakdownForm in a modal without leaving the board.
 */
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import EditBreakdownDialog from 'src/views/apps/breakdown/EditBreakdownDialog'
import { partitionBreakdownReportGroups } from '@/lib/dmbd/report-layout'
import { formatWallClockDate } from 'src/utils/date-format'

const PROCESS_COLOR = { BD: 'error', RFU: 'success', OP: 'warning', SB: 'info', AJ: 'secondary' }

const formatHm = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return num.toLocaleString('id-ID')
}

const formatBdStart = value => formatWallClockDate(value, '—')

const agingDays = label => {
  const match = /^(\d+)\s+day/.exec(String(label || ''))

  return match ? Number(match[1]) : null
}

const agingColor = days => {
  if (days == null) return 'text.secondary'
  if (days >= 30) return 'error.main'
  if (days >= 7) return 'warning.main'

  return 'text.primary'
}

const StatCard = ({ icon, label, value, color = 'primary' }) => (
  <Box
    sx={{
      flex: '1 1 140px',
      minWidth: 140,
      px: 4,
      py: 3,
      borderRadius: 1,
      border: theme => `1px solid ${theme.palette.divider}`,
      bgcolor: theme => alpha(theme.palette[color].main, 0.06)
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, color: 'text.secondary' }}>
      <Icon icon={icon} fontSize={18} />
      <Typography variant='caption' sx={{ fontWeight: 600, letterSpacing: 0.3 }}>
        {label}
      </Typography>
    </Box>
    <Typography variant='h5' sx={{ fontWeight: 700, color: `${color}.main`, lineHeight: 1.2 }}>
      {value}
    </Typography>
  </Box>
)

const headCellSx = {
  fontWeight: 700,
  fontSize: '0.7rem',
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  bgcolor: theme => alpha(theme.palette.primary.main, 0.06),
  borderBottom: theme => `1px solid ${theme.palette.divider}`
}

async function patchEta(breakdownId, field, value) {
  const res = await fetch(`/api/breakdowns/${encodeURIComponent(breakdownId)}/eta`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: value == null || value === '' ? null : value })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Failed to save ETA')
}

const etaFieldSx = {
  m: 0,
  '& .MuiInputBase-root': { minHeight: 32 },
  '& .MuiInputBase-input': { py: 1, fontSize: '0.8125rem' }
}

/** Date input that PATCHes ETA RFU on blur when the value changed. */
const EtaDateField = ({ breakdownId, field, value, onSaved, onError }) => {
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(value || '')
  }, [value, breakdownId])

  const commit = useCallback(async () => {
    const next = draft || ''
    const prev = value || ''
    if (next === prev) return
    setSaving(true)
    try {
      await patchEta(breakdownId, field, next || null)
      onSaved?.(breakdownId, field, next || null)
    } catch (err) {
      setDraft(prev)
      onError?.(err?.message || 'Failed to save ETA')
    } finally {
      setSaving(false)
    }
  }, [breakdownId, draft, field, onError, onSaved, value])

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
      <CustomTextField
        type='date'
        size='small'
        fullWidth
        value={draft}
        disabled={saving}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => {
          void commit()
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        InputLabelProps={{ shrink: true }}
        sx={etaFieldSx}
      />
      {saving ? <CircularProgress size={14} /> : null}
    </Box>
  )
}

/** Days estimate for ETA RFU IF PART SUPPLIED — whole number of days. */
const EtaDaysField = ({ breakdownId, value, onSaved, onError }) => {
  const toDraft = days => (days == null || days === '' ? '' : String(days))
  const [draft, setDraft] = useState(toDraft(value))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(toDraft(value))
  }, [value, breakdownId])

  const commit = useCallback(async () => {
    const trimmed = String(draft).trim()
    const next = trimmed === '' ? null : Number(trimmed)
    const prev = value == null || value === '' ? null : Number(value)
    if (next === prev || (next == null && prev == null)) return
    if (next != null && (!Number.isInteger(next) || next < 0)) {
      setDraft(toDraft(prev))
      onError?.('ETA RFU IF PART SUPPLIED must be a whole number of days')

      return
    }
    setSaving(true)
    try {
      await patchEta(breakdownId, 'etaRfuIfPart', next)
      onSaved?.(breakdownId, 'etaRfuIfPart', next)
    } catch (err) {
      setDraft(toDraft(prev))
      onError?.(err?.message || 'Failed to save ETA')
    } finally {
      setSaving(false)
    }
  }, [breakdownId, draft, onError, onSaved, value])

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
      <CustomTextField
        type='number'
        size='small'
        fullWidth
        placeholder='Days'
        value={draft}
        disabled={saving}
        inputProps={{ min: 0, step: 1 }}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => {
          void commit()
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        InputProps={{
          endAdornment: (
            <Typography variant='caption' sx={{ color: 'text.secondary', whiteSpace: 'nowrap', pr: 1 }}>
              day{draft === '1' ? '' : 's'}
            </Typography>
          )
        }}
        sx={etaFieldSx}
      />
      {saving ? <CircularProgress size={14} /> : null}
    </Box>
  )
}

const GroupTable = ({ rows, canEdit, onEditBd, onEtaSaved, onEtaError }) => (
  <TableContainer sx={{ overflowX: 'auto' }}>
    <Table size='small' sx={{ minWidth: 1180 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ ...headCellSx, width: 56 }} align='center'>
            No
          </TableCell>
          <TableCell sx={{ ...headCellSx, minWidth: 120 }}>Unit</TableCell>
          <TableCell sx={{ ...headCellSx, width: 88 }} align='center'>
            RFU
          </TableCell>
          <TableCell sx={{ ...headCellSx, width: 88 }} align='center'>
            BD
          </TableCell>
          <TableCell sx={{ ...headCellSx, minWidth: 100 }} align='right'>
            HM BD
          </TableCell>
          <TableCell sx={{ ...headCellSx, minWidth: 100 }} align='right'>
            HM Update
          </TableCell>
          <TableCell sx={{ ...headCellSx, minWidth: 240 }}>Description</TableCell>
          <TableCell sx={{ ...headCellSx, minWidth: 120 }}>BD Start</TableCell>
          <TableCell sx={{ ...headCellSx, minWidth: 100 }}>Aging</TableCell>
          <TableCell sx={{ ...headCellSx, minWidth: 180 }}>Status</TableCell>
          <TableCell sx={{ ...headCellSx, minWidth: 150 }}>ETA RFU</TableCell>
          <TableCell sx={{ ...headCellSx, minWidth: 180 }}>ETA RFU IF PART SUPPLIED</TableCell>
          {canEdit ? (
            <TableCell sx={{ ...headCellSx, width: 88 }} align='center'>
              Action
            </TableCell>
          ) : null}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(row => {
          const isBd = row.statusBd === 'BD'
          const days = agingDays(row.agingBd)

          return (
            <TableRow
              key={row.id}
              hover
              sx={{
                bgcolor: theme => (isBd ? alpha(theme.palette.error.main, 0.03) : 'transparent'),
                '& td': { borderColor: 'divider', verticalAlign: 'top' }
              }}
            >
              <TableCell align='center' sx={{ color: 'text.secondary' }}>
                {row.listNo}
              </TableCell>
              <TableCell>
                <Typography variant='body2' sx={{ fontWeight: 600, color: isBd ? 'text.primary' : 'text.secondary' }}>
                  {row.unitNo}
                </Typography>
              </TableCell>
              <TableCell align='center'>
                {row.statusRfu ? <CustomChip size='small' skin='light' color='success' label='RFU' /> : null}
              </TableCell>
              <TableCell align='center'>
                {row.statusBd ? <CustomChip size='small' skin='light' color='error' label='BD' /> : null}
              </TableCell>
              <TableCell align='right' sx={{ whiteSpace: 'nowrap' }}>
                {isBd ? (row.hourMeter == null ? '—' : formatHm(row.hourMeter)) : ''}
              </TableCell>
              <TableCell align='right' sx={{ whiteSpace: 'nowrap', color: isBd ? 'text.primary' : 'text.secondary' }}>
                {row.hmUpdate == null ? (isBd ? '—' : '') : formatHm(row.hmUpdate)}
              </TableCell>
              <TableCell sx={{ minWidth: 240, maxWidth: 360 }}>
                {isBd && row.problem ? (
                  <Typography variant='body2' sx={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
                    {row.problem}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{isBd ? formatBdStart(row.startedAt) : ''}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                {isBd && row.agingBd ? (
                  <Typography variant='body2' sx={{ fontWeight: 600, color: agingColor(days) }}>
                    {row.agingBd}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell>
                {isBd && row.processStatus ? (
                  <CustomChip
                    size='small'
                    skin='light'
                    color={PROCESS_COLOR[row.statusUnit] || 'secondary'}
                    label={row.processStatus}
                  />
                ) : null}
              </TableCell>
              <TableCell>
                {isBd ? (
                  <EtaDateField
                    breakdownId={row.id}
                    field='etaRfuDate'
                    value={row.etaRfuDate}
                    onSaved={onEtaSaved}
                    onError={onEtaError}
                  />
                ) : null}
              </TableCell>
              <TableCell>
                {isBd ? (
                  <EtaDaysField
                    breakdownId={row.id}
                    value={row.etaRfuIfPart}
                    onSaved={onEtaSaved}
                    onError={onEtaError}
                  />
                ) : null}
              </TableCell>
              {canEdit ? (
                <TableCell align='center'>
                  {isBd ? (
                    <Tooltip title='Edit BD'>
                      <IconButton
                        size='small'
                        color='primary'
                        aria-label={`Edit BD ${row.unitNo}`}
                        onClick={() => onEditBd?.(row.id)}
                      >
                        <Icon icon='tabler:edit' fontSize={18} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  </TableContainer>
)

const BreakdownReportBoard = ({ rows = [], loading = false, onReload = null }) => {
  const ability = useContext(AbilityContext)
  const canEdit = Boolean(ability?.can?.('update', 'breakdown'))
  const [localRows, setLocalRows] = useState(rows)
  const [etaError, setEtaError] = useState('')
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    setLocalRows(rows)
  }, [rows])

  const groups = useMemo(() => partitionBreakdownReportGroups(localRows), [localRows])
  const groupKeys = useMemo(() => groups.map(group => group.key), [groups])
  const [expanded, setExpanded] = useState(() => new Set())

  useEffect(() => {
    // Open groups that currently have BD units; keep RFU-only groups collapsed.
    setExpanded(new Set(groups.filter(group => group.bd > 0).map(group => group.key)))
  }, [groups])

  const summary = useMemo(() => {
    const total = groups.reduce((sum, group) => sum + group.rows.length, 0)
    const rfu = groups.reduce((sum, group) => sum + group.rfu, 0)
    const bd = groups.reduce((sum, group) => sum + group.bd, 0)

    return { total, rfu, bd, groups: groups.length }
  }, [groups])

  const asOf = useMemo(
    () =>
      new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
    []
  )

  const onEtaSaved = useCallback((breakdownId, field, value) => {
    setEtaError('')
    setLocalRows(prev => prev.map(row => (row.id === breakdownId ? { ...row, [field]: value } : row)))
  }, [])

  const allExpanded = groupKeys.length > 0 && groupKeys.every(key => expanded.has(key))

  const toggleGroup = key => {
    setExpanded(current => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)

      return next
    })
  }

  const expandAll = () => setExpanded(new Set(groupKeys))
  const collapseAll = () => setExpanded(new Set())

  if (loading && !groups.length) {
    return (
      <Box sx={{ px: 5, pb: 5 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          Loading board…
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ px: { xs: 3, sm: 5 }, pb: 5 }}>
      {etaError ? (
        <Alert severity='error' sx={{ mb: 3 }} onClose={() => setEtaError('')}>
          {etaError}
        </Alert>
      ) : null}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 3,
          mb: 4
        }}
      >
        <Box>
          <Typography variant='overline' sx={{ color: 'text.secondary', letterSpacing: 1 }}>
            Board as of {asOf}
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {summary.groups} plant group · ETA inline · Edit BD opens form in modal
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, flex: 1, justifyContent: 'flex-end' }}>
          <StatCard icon='tabler:truck' label='Units' value={summary.total} color='primary' />
          <StatCard icon='tabler:circle-check' label='RFU' value={summary.rfu} color='success' />
          <StatCard icon='tabler:alert-triangle' label='BD' value={summary.bd} color='error' />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 3 }}>
        <Button
          size='small'
          variant='tonal'
          color='secondary'
          startIcon={<Icon icon={allExpanded ? 'tabler:fold' : 'tabler:fold-down'} />}
          onClick={allExpanded ? collapseAll : expandAll}
          disabled={!groupKeys.length}
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {groups.map(group => {
          const open = expanded.has(group.key)

          return (
            <Accordion
              key={group.key}
              disableGutters
              elevation={0}
              expanded={open}
              onChange={() => toggleGroup(group.key)}
              sx={{
                border: theme => `1px solid ${theme.palette.divider}`,
                borderRadius: '6px !important',
                '&:before': { display: 'none' },
                overflow: 'hidden'
              }}
            >
              <AccordionSummary
                expandIcon={<Icon icon='tabler:chevron-down' fontSize={18} />}
                sx={{
                  minHeight: 40,
                  px: 2.5,
                  bgcolor: theme => alpha(theme.palette.secondary.main, open ? 0.1 : 0.05),
                  '& .MuiAccordionSummary-content': {
                    my: 0.75,
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap'
                  },
                  '& .MuiAccordionSummary-expandIconWrapper': { color: 'text.secondary' }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 160, flex: 1 }}>
                  <Icon icon='tabler:category' fontSize={16} />
                  <Typography variant='subtitle2' sx={{ fontWeight: 700, letterSpacing: 0.2, lineHeight: 1.2 }}>
                    {group.label}
                  </Typography>
                  <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    {group.rows.length} unit
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
                  <CustomChip size='small' skin='light' color='success' label={`RFU ${group.rfu}`} />
                  <CustomChip size='small' skin='light' color='error' label={`BD ${group.bd}`} />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, borderTop: theme => `1px solid ${theme.palette.divider}` }}>
                <GroupTable
                  rows={group.rows}
                  canEdit={canEdit}
                  onEditBd={setEditId}
                  onEtaSaved={onEtaSaved}
                  onEtaError={setEtaError}
                />
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 3,
                    px: 2.5,
                    py: 1.25,
                    bgcolor: theme => alpha(theme.palette.warning.main, 0.1),
                    borderTop: theme => `1px solid ${theme.palette.divider}`
                  }}
                >
                  <Typography variant='caption' sx={{ fontWeight: 700 }}>
                    Total
                  </Typography>
                  <Typography variant='caption' sx={{ fontWeight: 700, color: 'success.main' }}>
                    RFU {group.rfu}
                  </Typography>
                  <Typography variant='caption' sx={{ fontWeight: 700, color: 'error.main' }}>
                    BD {group.bd}
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          )
        })}
      </Box>

      <EditBreakdownDialog
        open={Boolean(editId)}
        breakdownId={editId}
        onClose={() => setEditId(null)}
        onSaved={() => {
          onReload?.()
        }}
      />
    </Box>
  )
}

export default BreakdownReportBoard
