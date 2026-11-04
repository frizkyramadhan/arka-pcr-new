/**
 * Breakdown list — one row is one open or closed work order.
 */
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'

import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import { useAuth } from 'src/hooks/useAuth'
import useProjects from 'src/hooks/useProjects'
import arkaApi from 'src/utils/arka-api'
import { toUnitSearchOption } from 'src/utils/unit-select-options'
import { fetchData as fetchUnits } from 'src/store/apps/unit'
import ImportGuideDialog from 'src/views/apps/maintenance-import/ImportGuideDialog'
import TableServerSide from 'src/views/table/data-grid/TableServerSide'
import { personLabel } from '@/lib/dmbd/employee-label'
import { formatDisplayDateTime } from 'src/utils/date-format'

const formatStamp = formatDisplayDateTime

/** Download import row errors as Excel via API. */
async function downloadImportErrorsXlsx(errors) {
  const response = await arkaApi.post('/breakdowns/history/import-errors', { errors }, { responseType: 'blob' })

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'breakdown-import-errors.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}

const POSITION_COLOR = { BD: 'error', OP: 'warning', SB: 'info', AJ: 'secondary', RFU: 'success', CANCEL: 'secondary' }


const formatHours = value =>
  value == null ? '—' : Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 })

/** Downtime berjalan untuk baris terbuka, berhenti di finish untuk baris selesai. */
const downtimeOf = (row, now) => {
  const start = new Date(row.startedAt).getTime()
  if (Number.isNaN(start)) return null
  const end = row.finishedAt ? new Date(row.finishedAt).getTime() : now
  if (Number.isNaN(end)) return null

  return Math.max(0, Math.round(((end - start) / 3600000) * 10) / 10)
}

const textCell = value => (
  <Typography noWrap title={value || ''}>
    {value || '—'}
  </Typography>
)

// Kolom mengikuti header laporan harian, dengan Project di paling kiri.
const columns = (onView, now) => [
  {
    minWidth: 210,
    flex: 0,
    field: 'registerNo',
    headerName: 'Register No',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 600 }} title={row.registerNo || ''}>
        {row.registerNo || '—'}
      </Typography>
    )
  },
  { minWidth: 100, field: 'projectCode', headerName: 'Project', renderCell: ({ row }) => textCell(row.projectCode) },
  { minWidth: 110, field: 'modelName', headerName: 'TYPE', sortable: false, renderCell: ({ row }) => textCell(row.modelName) },
  {
    minWidth: 100,
    field: 'unitNo',
    headerName: 'UNIT',
    sortable: false,
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 600 }}>
        {row.unitNo || '—'}
      </Typography>
    )
  },
  {
    minWidth: 90,
    field: 'hourMeter',
    headerName: 'HM',
    sortable: false,
    type: 'number',
    renderCell: ({ row }) => <Typography noWrap>{formatHours(row.hourMeter)}</Typography>
  },
  { minWidth: 120, field: 'workOrder', headerName: 'WO', renderCell: ({ row }) => textCell(row.workOrder) },
  {
    minWidth: 105,
    field: 'workOrderStatus',
    headerName: 'STATUS WO',
    sortable: false,
    renderCell: ({ row }) =>
      row.workOrder ? (
        <CustomChip
          size='small'
          skin='light'
          color={row.workOrderStatus === 'CLOSE' ? 'success' : 'warning'}
          label={row.workOrderStatus || '—'}
        />
      ) : (
        '—'
      )
  },
  {
    minWidth: 180,
    field: 'operatorName',
    headerName: 'OPERATOR',
    sortable: false,
    renderCell: ({ row }) => textCell(personLabel(row.operatorCode, row.operatorName))
  },
  {
    minWidth: 180,
    field: 'mechanicLeaderName',
    headerName: 'MECHANIC',
    sortable: false,
    renderCell: ({ row }) => textCell(personLabel(row.mechanicLeaderCode, row.mechanicLeaderName))
  },
  {
    minWidth: 105,
    field: 'statusUnit',
    headerName: 'STATUS UNIT',
    sortable: false,
    renderCell: ({ row }) => (
      <CustomChip size='small' skin='light' color={POSITION_COLOR[row.statusUnit] || 'secondary'} label={row.statusUnit || '—'} />
    )
  },
  {
    minWidth: 90,
    field: 'latestCode',
    headerName: 'BD CODE',
    sortable: false,
    renderCell: ({ row }) =>
      row.latestCode ? (
        <CustomChip size='small' skin='light' color='primary' label={row.latestCode} title={row.latestCodeName || ''} />
      ) : (
        '—'
      )
  },
  {
    minWidth: 260,
    flex: 1,
    field: 'problem',
    headerName: 'DESCRIPTION',
    sortable: false,
    renderCell: ({ row }) => textCell(row.problem)
  },
  {
    minWidth: 150,
    field: 'bdDate',
    headerName: 'BD DATE',
    sortable: false,
    valueGetter: ({ row }) => row.startedAt,
    valueFormatter: ({ value }) => formatStamp(value)
  },
  { minWidth: 150, field: 'finishedAt', headerName: 'FINISH DATE', sortable: false, valueFormatter: ({ value }) => formatStamp(value) },
  {
    minWidth: 110,
    field: 'downtimeHours',
    headerName: 'DOWN TIME (Hrs)',
    sortable: false,
    type: 'number',
    valueGetter: ({ row }) => downtimeOf(row, now),
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: row.finishedAt ? 400 : 600, color: row.finishedAt ? 'text.primary' : 'error.main' }}>
        {formatHours(downtimeOf(row, now))}
      </Typography>
    )
  },
  {
    minWidth: 140,
    field: 'componentCode',
    headerName: 'Component Code',
    sortable: false,
    renderCell: ({ row }) => (
      <Typography noWrap title={row.componentName || ''}>
        {row.componentCode || '—'}
      </Typography>
    )
  },
  { minWidth: 160, field: 'remark', headerName: 'REMARK', sortable: false, renderCell: ({ row }) => textCell(row.remark) },
  {
    minWidth: 90,
    field: 'actions',
    headerName: 'Action',
    sortable: false,
    filterable: false,
    renderCell: ({ row }) => (
      <Tooltip title='View'>
        <IconButton size='small' onClick={() => onView(row.id)}>
          <Icon icon='tabler:eye' />
        </IconButton>
      </Tooltip>
    )
  }
]

const BreakdownListPage = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const ability = useContext(AbilityContext)
  const { user } = useAuth()
  const { projects: projectsFromApi } = useProjects()
  const unitStore = useSelector(state => state.unit)
  const [projectId, setProjectId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [status, setStatus] = useState('')
  const [position, setPosition] = useState('')
  const [bdFrom, setBdFrom] = useState('')
  const [bdTo, setBdTo] = useState('')
  const [finishFrom, setFinishFrom] = useState('')
  const [finishTo, setFinishTo] = useState('')
  const [description, setDescription] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [importGuideOpen, setImportGuideOpen] = useState(false)
  const [importErrorDetails, setImportErrorDetails] = useState(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)

    return () => clearInterval(timer)
  }, [])

  const projectCodes = useMemo(
    () => (user?.projectCodes ?? []).map(code => String(code).trim().toUpperCase()).filter(Boolean),
    [user?.projectCodes]
  )
  const isHeadOffice = projectCodes.includes('000H') || projectCodes.includes('001H')

  const siteCodes = useMemo(
    () => projectCodes.filter(code => code !== '000H' && code !== '001H'),
    [projectCodes]
  )
  const projectLocked = !isHeadOffice && siteCodes.length === 1

  const projectOptions = useMemo(() => {
    const list = projectsFromApi || []
    if (isHeadOffice) return list
    if (!projectCodes.length) return []

    return list.filter(project => projectCodes.includes(String(project.value ?? '').trim().toUpperCase()))
  }, [isHeadOffice, projectCodes, projectsFromApi])

  const units = useMemo(() => {
    const allUnits = unitStore.allData?.length ? unitStore.allData : unitStore.data || []

    const scoped = isHeadOffice
      ? allUnits
      : allUnits.filter(unit =>
          projectCodes.includes(String(unit.projectId ?? unit.projectCode ?? '').trim().toUpperCase())
        )
    if (!projectId) return scoped

    return scoped.filter(
      unit => String(unit.projectId ?? unit.projectCode ?? '').trim().toUpperCase() === projectId.toUpperCase()
    )
  }, [isHeadOffice, projectCodes, projectId, unitStore.allData, unitStore.data])

  useEffect(() => {
    if (!projectLocked) return
    const only = projectOptions[0]?.value
    if (only) setProjectId(String(only))
  }, [projectLocked, projectOptions])

  const tableFilters = useMemo(
    () => ({
      ...(projectId ? { projectId } : {}),
      ...(unitId ? { unitId } : {}),
      ...(status ? { status } : {}),
      ...(position ? { position } : {}),
      ...(bdFrom ? { bdFrom } : {}),
      ...(bdTo ? { bdTo } : {}),
      ...(finishFrom ? { finishFrom } : {}),
      ...(finishTo ? { finishTo } : {}),
      ...(description.trim() ? { description: description.trim() } : {})
    }),
    [projectId, unitId, status, position, bdFrom, bdTo, finishFrom, finishTo, description]
  )

  useEffect(() => {
    dispatch(fetchUnits({}))
  }, [dispatch])

  const handleView = useCallback(id => router.push(`/breakdowns/view/${id}`), [router])
  const gridColumns = useMemo(() => columns(handleView, now), [handleView, now])

  const handleExportHistory = useCallback(async () => {
    setExporting(true)
    try {
      const response = await arkaApi.get('/breakdowns/history/export', {
        params: tableFilters,
        responseType: 'blob'
      })

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `breakdown-history-${projectId || 'all'}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Export history failed')
    } finally {
      setExporting(false)
    }
  }, [projectId, tableFilters])

  const handleImportHistory = useCallback(
    async event => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      setImporting(true)
      try {
        const body = new FormData()
        body.append('file', file)
        if (projectId) body.append('projectCode', projectId)
        const response = await arkaApi.post('/breakdowns/history/import', body)
        const data = response.data || {}
        const errors = Array.isArray(data.errors) ? data.errors : []
        const summary = `Import: ${data.createdBreakdowns || 0} BD, ${data.createdActivities || 0} activity, ${data.skipped || 0} skipped, ${data.linkedSap || 0} WO linked`
        toast.success(summary + (errors.length ? `, ${errors.length} error(s)` : ''))
        if (errors.length) {
          setImportErrorDetails({ summary, errors })
        }
        setReloadToken(value => value + 1)
      } catch (error) {
        toast.error(error?.response?.data?.error || 'Import history failed')
      } finally {
        setImporting(false)
      }
    },
    [projectId]
  )

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Daily Report — Breakdown Unit</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Kolom mengikuti laporan harian. Down time baris terbuka berjalan sampai sekarang.
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={2}>
                <SearchableSelect
                  label='Project'
                  value={projectId}
                  disabled={projectLocked}
                  disableClearable={projectLocked}
                  onChange={event => {
                    setProjectId(event.target.value)
                    setUnitId('')
                  }}
                  options={[
                    ...(projectLocked ? [] : [{ value: '', label: 'All projects' }]),
                    ...projectOptions.map(project => ({ value: project.value, label: project.value }))
                  ]}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <SearchableSelect
                  label='Unit'
                  value={unitId}
                  onChange={event => setUnitId(event.target.value)}
                  options={[{ value: '', label: 'All units' }, ...units.map(toUnitSearchOption)]}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <SearchableSelect
                  label='Open / closed'
                  value={status}
                  onChange={event => setStatus(event.target.value)}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'open', label: 'Open' },
                    { value: 'closed', label: 'Closed' },
                    { value: 'cancelled', label: 'Cancelled' }
                  ]}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <SearchableSelect
                  label='Status unit'
                  value={position}
                  onChange={event => setPosition(event.target.value)}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'RFU', label: 'RFU' },
                    { value: 'BD', label: 'BD' },
                    { value: 'OP', label: 'OP' },
                    { value: 'SB', label: 'SB' },
                    { value: 'AJ', label: 'AJ' },
                    { value: 'CANCEL', label: 'CANCEL' }
                  ]}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='BD date from'
                  value={bdFrom}
                  onChange={event => setBdFrom(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='BD date to'
                  value={bdTo}
                  onChange={event => setBdTo(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Finish date from'
                  value={finishFrom}
                  onChange={event => setFinishFrom(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Finish date to'
                  value={finishTo}
                  onChange={event => setFinishTo(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <CustomTextField
                  fullWidth
                  label='Description'
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                />
              </Grid>
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end',
                  gap: 2,
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  pb: 0.25,
                  ml: 'auto'
                }}
              >
                <Button
                  variant='tonal'
                  color='secondary'
                  startIcon={<Icon icon='tabler:refresh' />}
                  sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                  onClick={() => {
                    setProjectId(projectLocked ? String(projectOptions[0]?.value ?? '') : '')
                    setUnitId('')
                    setStatus('')
                    setPosition('')
                    setBdFrom('')
                    setBdTo('')
                    setFinishFrom('')
                    setFinishTo('')
                    setDescription('')
                  }}
                >
                  Reset
                </Button>
                {ability?.can('read', 'breakdown') ? (
                  <Button
                    variant='tonal'
                    color='secondary'
                    startIcon={<Icon icon='tabler:download' />}
                    disabled={exporting}
                    sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                    onClick={handleExportHistory}
                  >
                    {exporting ? 'Exporting…' : 'Export'}
                  </Button>
                ) : null}
                {ability?.can('create', 'breakdown') ? (
                  <>
                    <Button
                      variant='tonal'
                      color='secondary'
                      startIcon={<Icon icon='tabler:upload' />}
                      disabled={importing}
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                      onClick={() => setImportGuideOpen(true)}
                    >
                      {importing ? 'Importing…' : 'Import'}
                    </Button>
                    <Button
                      variant='contained'
                      startIcon={<Icon icon='tabler:plus' />}
                      sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                      onClick={() => router.push('/breakdowns/add')}
                    >
                      Add
                    </Button>
                  </>
                ) : null}
              </Grid>
            </Grid>
          </CardContent>
          <Divider sx={{ m: '0 !important' }} />
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'nowrap',
              alignItems: 'center',
              gap: 1.25,
              px: 5,
              py: 2.5,
              bgcolor: 'action.hover',
              overflowX: 'auto'
            }}
          >
            <Typography variant='subtitle2' sx={{ mr: 0.5, flexShrink: 0, whiteSpace: 'nowrap' }}>
              STATUS UNIT
            </Typography>
            <CustomChip size='small' skin='light' color='success' label='RFU · selesai' sx={{ flexShrink: 0 }} />
            <CustomChip size='small' skin='light' color='error' label='BD · breakdown' sx={{ flexShrink: 0 }} />
            <CustomChip size='small' skin='light' color='warning' label='OP · operation' sx={{ flexShrink: 0 }} />
            <CustomChip size='small' skin='light' color='info' label='SB · standby' sx={{ flexShrink: 0 }} />
            <CustomChip size='small' skin='light' color='secondary' label='AJ · additional job' sx={{ flexShrink: 0 }} />
            <CustomChip size='small' skin='light' color='secondary' label='CANCEL · dibatalkan' sx={{ flexShrink: 0 }} />
          </Box>
          <Divider sx={{ m: '0 !important' }} />
          <TableServerSide
            key={reloadToken}
            hideCard
            hideToolbar
            apiPath='breakdowns'
            apiClient={arkaApi}
            columns={gridColumns}
            defaultSortField='startedAt'
            defaultSortOrder='desc'
            extraParams={tableFilters}
            checkboxSelection={false}
            disableRowSelectionOnClick
            serverPagination
            rowHeight={62}
            initialPageSize={10}
            pageSizeOptions={[10, 25, 50]}
          />
        </Card>
      </Grid>

      <ImportGuideDialog
        open={importGuideOpen}
        onClose={() => setImportGuideOpen(false)}
        kind='breakdownHistory'
        inputId='breakdown-history-import'
        onFileChange={handleImportHistory}
      />

      <Dialog open={Boolean(importErrorDetails)} onClose={() => setImportErrorDetails(null)} maxWidth='sm' fullWidth>
        <DialogTitle>Detail error import history</DialogTitle>
        <DialogContent>
          {importErrorDetails ? (
            <>
              <Typography variant='body2' sx={{ mb: 2 }}>
                {importErrorDetails.summary}
              </Typography>
              <List dense sx={{ bgcolor: 'action.hover', borderRadius: 1, py: 0, maxHeight: 360, overflow: 'auto' }}>
                {importErrorDetails.errors.map((err, idx) => (
                  <ListItem key={`${err.row}-${idx}`} sx={{ py: 1, alignItems: 'flex-start', gap: 1 }}>
                    <Typography variant='body2' component='span' sx={{ fontWeight: 600, minWidth: 64 }}>
                      Row {err.row}:
                    </Typography>
                    <Typography variant='body2' component='span' sx={{ color: 'error.main' }}>
                      {err.message}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            variant='tonal'
            color='secondary'
            startIcon={<Icon icon='tabler:download' />}
            onClick={async () => {
              try {
                await downloadImportErrorsXlsx(importErrorDetails?.errors || [])
              } catch {
                toast.error('Could not download error sheet')
              }
            }}
            disabled={!importErrorDetails?.errors?.length}
          >
            Download errors
          </Button>
          <Button variant='tonal' color='secondary' onClick={() => setImportErrorDetails(null)}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

BreakdownListPage.acl = {
  subject: 'breakdown',
  action: 'read'
}

export default BreakdownListPage
