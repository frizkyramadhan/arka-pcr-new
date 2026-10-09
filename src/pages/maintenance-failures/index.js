/**
 * Maintenance Failure list — satu baris = satu temuan.
 * Finding date terpisah dari tanggal record dibuat. Buka actual dari kolom aksi.
 * Tombol export butuh exports.maintenance_actuals. Tombol import butuh imports.maintenance_actuals.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
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
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import { toUnitSearchOption } from 'src/utils/unit-select-options'
import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'
import { useAuth } from 'src/hooks/useAuth'
import useCan from 'src/hooks/useCan'
import useProjects from 'src/hooks/useProjects'
import arkaApi from 'src/utils/arka-api'
import { actualImportMessage, downloadActualSheet, readActualSheetRows } from 'src/utils/maintenance-actual-sheet'
import toast from 'react-hot-toast'
import { formatDisplayDate } from 'src/utils/date-format'
import { fetchData as fetchUnits } from 'src/store/apps/unit'
import { useDispatch, useSelector } from 'react-redux'

const SEVERITY_COLOR = { CRITICAL: 'error', MAJOR: 'warning', MINOR: 'info' }

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' }
]

const codeLabel = (code, name, fallback = '') => [code, name].filter(Boolean).join(' · ') || fallback || '—'

/** Local midnight of a YYYY-MM-DD date, or null. */
const localDayStart = value => {
  const [year, month, day] = String(value ?? '').slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null

  return new Date(year, month - 1, day).getTime()
}

/** Whole hours from finding date to closed on (closed) or `now` (open). */
const downtimeHours = (row, now) => {
  const start = localDayStart(row.occurredAt)
  if (start == null) return null
  const end = row.closureDate ? localDayStart(row.closureDate) : now
  if (end == null) return null

  return Math.max(0, Math.floor((end - start) / 3600000))
}

const columns = (onView, now) => [
  {
    flex: 0.6,
    minWidth: 90,
    field: 'projectId',
    headerName: 'Project',
    renderCell: ({ row }) => <Typography noWrap sx={{ fontWeight: 500 }}>{row.projectId || '—'}</Typography>
  },
  {
    flex: 0.7,
    minWidth: 100,
    field: 'unitNo',
    headerName: 'Unit',
    renderCell: ({ row }) => <Typography noWrap>{row.unitNo || '—'}</Typography>
  },
  {
    flex: 0.7,
    minWidth: 110,
    field: 'severity',
    headerName: 'Severity',
    renderCell: ({ row }) => (
      <CustomChip size='small' skin='light' color={SEVERITY_COLOR[row.severity] || 'secondary'} label={row.severity} />
    )
  },
  {
    flex: 1.4,
    minWidth: 200,
    field: 'description',
    headerName: 'Finding',
    renderCell: ({ row }) => (
      <Typography noWrap title={row.description || ''}>
        {row.description || '—'}
      </Typography>
    )
  },
  {
    flex: 0.5,
    minWidth: 90,
    field: 'frequency',
    headerName: 'Frequency'
  },
  {
    flex: 0.7,
    minWidth: 120,
    field: 'occurredAt',
    headerName: 'Finding date',
    valueFormatter: ({ value }) => formatDisplayDate(value, '—')
  },
  {
    flex: 0.7,
    minWidth: 120,
    field: 'closureDate',
    headerName: 'Closed on',
    valueFormatter: ({ value }) => formatDisplayDate(value, '—')
  },
  {
    flex: 0.6,
    minWidth: 120,
    field: 'downtimeHours',
    headerName: 'Downtime Hours',
    type: 'number',
    valueGetter: ({ row }) => downtimeHours(row, now),
    valueFormatter: ({ value }) => (value == null ? '—' : value.toLocaleString())
  },
  {
    flex: 0.8,
    minWidth: 140,
    field: 'picName',
    headerName: 'PIC',
    renderCell: ({ row }) => <Typography noWrap>{row.picName || '—'}</Typography>
  },
  {
    flex: 0.9,
    minWidth: 160,
    field: 'componentCode',
    headerName: 'Component',
    renderCell: ({ row }) => (
      <Typography noWrap>{codeLabel(row.componentCode, row.componentName, row.sapFailureCode)}</Typography>
    )
  },
  {
    flex: 0.9,
    minWidth: 160,
    field: 'subComponentCode',
    headerName: 'Sub component',
    renderCell: ({ row }) => (
      <Typography noWrap>{codeLabel(row.subComponentCode, row.subComponentName)}</Typography>
    )
  },
  {
    flex: 0.9,
    minWidth: 160,
    field: 'damageCode',
    headerName: 'Damage',
    renderCell: ({ row }) => <Typography noWrap>{codeLabel(row.damageCode, row.damageName)}</Typography>
  },
  {
    flex: 0,
    minWidth: 80,
    sortable: false,
    field: 'actions',
    headerName: 'Action',
    align: 'center',
    headerAlign: 'center',
    renderCell: ({ row }) =>
      row.maintenanceActualId ? (
        <Tooltip title={row.registerNo ? `Actual ${row.registerNo}` : 'View actual'}>
          <IconButton size='small' sx={{ color: 'text.secondary' }} onClick={() => onView(row.maintenanceActualId)}>
            <Icon icon='tabler:eye' />
          </IconButton>
        </Tooltip>
      ) : null
  }
]

const MaintenanceFailureList = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { can } = useCan()
  const canExportActual = can('exports.maintenance_actuals')
  const canImportActual = can('imports.maintenance_actuals')
  const [importErrorDetails, setImportErrorDetails] = useState(null)
  const { projects: projectsFromApi } = useProjects()
  const unitStore = useSelector(state => state.unit)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [projectId, setProjectId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)

    return () => clearInterval(timer)
  }, [])

  const projectCodes = useMemo(
    () => (user?.projectCodes ?? []).map(code => String(code).trim().toUpperCase()).filter(Boolean),
    [user?.projectCodes]
  )
  const isHeadOffice = projectCodes.includes('000H') || projectCodes.includes('001H')

  const projectOptions = useMemo(() => {
    const list = projectsFromApi || []
    if (isHeadOffice) return list
    if (!projectCodes.length) return []

    return list.filter(project => projectCodes.includes(String(project.value ?? '').trim().toUpperCase()))
  }, [isHeadOffice, projectCodes, projectsFromApi])

  const units = useMemo(() => {
    const allUnits = unitStore.allData?.length ? unitStore.allData : unitStore.data || []
    if (isHeadOffice) return allUnits
    if (!projectCodes.length) return []

    return allUnits.filter(unit =>
      projectCodes.includes(String(unit.projectId ?? unit.projectCode ?? '').trim().toUpperCase())
    )
  }, [isHeadOffice, projectCodes, unitStore.allData, unitStore.data])

  const load = useCallback(() => {
    setLoading(true)
    arkaApi
      .get('/maintenance-failures/list', {
        params: {
          projectId: projectId || undefined,
          unitId: unitId || undefined,
          status: status || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined
        }
      })
      .then(res => {
        setRows(res.data?.failures || [])
        setNow(Date.now())
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo, projectId, status, unitId])

  useEffect(() => {
    dispatch(fetchUnits({}))
  }, [dispatch])

  useEffect(() => {
    load()
  }, [load])

  const handleExport = useCallback(async () => {
    try {
      const { data } = await arkaApi.get('/maintenance-failures/sheet', {
        params: {
          projectId: projectId || undefined,
          unitId: unitId || undefined,
          status: status || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined
        }
      })
      const count = downloadActualSheet(data?.rows || [], 'maintenance-failures')
      toast.success(count ? `Export downloaded (${count} baris)` : 'Template downloaded')
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Export failed')
    }
  }, [projectId, unitId, status, dateFrom, dateTo])

  const handleImport = useCallback(
    async event => {
      const file = event?.target?.files?.[0]
      if (!file) return
      if (!user?.id) {
        toast.error('You must be logged in to import')
        event.target.value = ''

        return
      }
      try {
        const rows = await readActualSheetRows(file)
        if (!rows) {
          toast.error('No sheet found in file')
          event.target.value = ''

          return
        }
        const { data: result } = await arkaApi.post('/maintenance-actuals/import', { rows, createdById: user.id })
        load()
        const msg = actualImportMessage(result)
        if (result?.errors?.length) {
          setImportErrorDetails({ summary: msg || 'Import selesai dengan error', errors: result.errors })
          toast.error('Import selesai dengan error. Lihat detail di bawah.')
        } else {
          toast.success(msg || 'Import selesai.')
        }
      } catch (err) {
        setImportErrorDetails({
          summary: 'Import gagal',
          errors: [{ row: 0, message: err?.response?.data?.error || err?.message || 'Import failed' }]
        })
        toast.error('Import gagal. Lihat detail error.')
      }
      event.target.value = ''
    },
    [user?.id, load]
  )

  const handleView = useCallback(
    id => {
      router.push(`/maintenance-actuals/view/${id}`)
    },
    [router]
  )

  const gridColumns = useMemo(() => columns(handleView, now), [handleView, now])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Failures</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Findings recorded on a unit, with component and damage from SAP
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
                  onChange={event => setProjectId(event.target.value)}
                  placeholder='Search project…'
                  options={[
                    { value: '', label: 'All projects' },
                    ...projectOptions.map(project => ({ value: project.value, label: project.value }))
                  ]}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <SearchableSelect
                  label='Unit'
                  value={unitId}
                  onChange={event => setUnitId(event.target.value)}
                  placeholder='Search unit…'
                  options={[{ value: '', label: 'All units' }, ...units.map(toUnitSearchOption)]}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <SearchableSelect
                  label='Status'
                  value={status}
                  onChange={event => setStatus(event.target.value)}
                  placeholder='Search status…'
                  options={STATUS_OPTIONS}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Finding from'
                  value={dateFrom}
                  onChange={event => setDateFrom(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Finding to'
                  value={dateTo}
                  onChange={event => setDateTo(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  fullWidth
                  variant='tonal'
                  color='secondary'
                  startIcon={<Icon icon='tabler:refresh' />}
                  onClick={() => {
                    setProjectId('')
                    setUnitId('')
                    setStatus('')
                    setDateFrom('')
                    setDateTo('')
                  }}
                >
                  Reset
                </Button>
              </Grid>
            </Grid>
          </CardContent>
          <Divider sx={{ m: '0 !important' }} />
          <Box
            sx={{
              py: 4,
              px: 6,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              justifyContent: 'flex-end'
            }}
          >
            {canExportActual && (
              <Tooltip title='Export findings for the current filters'>
                <IconButton size='small' sx={{ color: 'text.secondary' }} onClick={handleExport}>
                  <Icon icon='tabler:file-spreadsheet' />
                </IconButton>
              </Tooltip>
            )}
            {canImportActual && (
              <Tooltip title='Import Excel'>
                <IconButton size='small' sx={{ color: 'text.secondary' }} component='label' htmlFor='maintenance-failure-import'>
                  <Icon icon='tabler:file-upload' />
                  <input
                    id='maintenance-failure-import'
                    type='file'
                    accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    hidden
                    onChange={handleImport}
                  />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <DataGrid
            autoHeight
            loading={loading}
            rowHeight={62}
            rows={rows}
            columns={gridColumns}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
          />
        </Card>
      </Grid>
      <Dialog open={!!importErrorDetails} onClose={() => setImportErrorDetails(null)} maxWidth='sm' fullWidth>
        <DialogTitle>Detail Error Import</DialogTitle>
        <DialogContent>
          {importErrorDetails && (
            <>
              <Typography variant='body2' sx={{ mb: 2 }}>
                {importErrorDetails.summary}
              </Typography>
              <List dense sx={{ bgcolor: 'action.hover', borderRadius: 1, py: 0 }}>
                {importErrorDetails.errors.map((err, idx) => (
                  <ListItem key={idx} sx={{ py: 1 }}>
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
          )}
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={() => setImportErrorDetails(null)}>
            Tutup
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

MaintenanceFailureList.acl = {
  subject: 'maintenance-actual',
  action: 'read'
}

export default MaintenanceFailureList
