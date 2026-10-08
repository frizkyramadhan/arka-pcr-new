/**
 * Maintenance Actual List — FMS
 *
 * List realisasi maintenance per unit (terhubung ke plan).
 * Filter: Project, Type, Unit, Date range.
 */
import arkaApi from 'src/utils/arka-api'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { DataGrid } from '@mui/x-data-grid'

import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomChip from 'src/@core/components/mui/chip'
import { toUnitSearchOption } from 'src/utils/unit-select-options'
import { formatDisplayDate } from 'src/utils/date-format'
import { useDispatch, useSelector } from 'react-redux'
import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'
import toast from 'react-hot-toast'

import { fetchData as fetchActuals, deleteMaintenanceActual } from 'src/store/apps/maintenanceActual'
import { fetchData as fetchPlans } from 'src/store/apps/maintenancePlan'
import { fetchData as fetchUnits } from 'src/store/apps/unit'
import { useAuth } from 'src/hooks/useAuth'
import useProjects from 'src/hooks/useProjects'

import TableHeader from 'src/views/apps/maintenance-actual/list/TableHeader'

/** Tombol View, Edit, Delete per baris; Delete pakai toast konfirmasi */
const RowActions = ({ id, onEdit, onView }) => {
  const dispatch = useDispatch()

  const handleDeleteClick = () => {
    toast(
      t => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 280 }}>
          <Typography>Delete this maintenance actual?</Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size='small' variant='tonal' color='secondary' onClick={() => toast.dismiss(t.id)}>
              Cancel
            </Button>
            <Button
              size='small'
              variant='tonal'
              color='error'
              onClick={() => {
                toast.dismiss(t.id)
                dispatch(deleteMaintenanceActual(id))
                  .unwrap()
                  .then(() => toast.success('Actual deleted'))
                  .catch(err => toast.error(err?.message || err?.response?.data?.error || 'Delete failed'))
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      ),
      { duration: Infinity, style: { minWidth: 280 } }
    )
  }

  return (
    <Box>
      {onView && (
        <Tooltip title='View'>
          <IconButton size='small' sx={{ color: 'text.secondary' }} onClick={() => onView(id)}>
            <Icon icon='tabler:eye' />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title='Edit'>
        <IconButton size='small' sx={{ color: 'text.secondary' }} onClick={() => onEdit(id)}>
          <Icon icon='tabler:edit' />
        </IconButton>
      </Tooltip>
      <Tooltip title='Delete'>
        <IconButton size='small' sx={{ color: 'error.main' }} onClick={handleDeleteClick}>
          <Icon icon='tabler:trash' />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

const ACTUAL_STATUS = {
  OPEN: { label: 'Open', color: 'info' },
  CLOSED: { label: 'Closed', color: 'success' },
  CANCELLED: { label: 'Cancelled', color: 'error' }
}

const QC_STATUS = {
  PASS: { label: 'Pass', color: 'success' },
  FAIL: { label: 'Fail', color: 'error' },
  NA: { label: 'N/A', color: 'secondary' }
}

/** Days between plan date and actual date (both YYYY-MM-DD); null for legacy rows without a plan date. */
const dayOffset = (planDate, actualDate) => {
  if (!planDate || !actualDate) return null
  const plan = Date.parse(`${planDate.slice(0, 10)}T00:00:00Z`)
  const actual = Date.parse(`${actualDate.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(plan) || Number.isNaN(actual)) return null

  return Math.round((actual - plan) / 86400000)
}

const offsetCaption = days => {
  if (days == null) return null
  if (days === 0) return { text: 'On plan date', color: 'success.main' }
  if (days > 0) return { text: `${days} day${days > 1 ? 's' : ''} late`, color: 'warning.main' }

  return { text: `${-days} day${days < -1 ? 's' : ''} early`, color: 'info.main' }
}

/** Fixed widths keep values readable; the grid scrolls horizontally when the screen is narrower. */
const columns = (onEdit, onView) => [
  {
    width: 200,
    field: 'registerNo',
    headerName: 'Register No',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 600 }}>
        {row.registerNo || '—'}
      </Typography>
    )
  },
  {
    width: 100,
    field: 'planProjectId',
    headerName: 'Project',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 500 }}>
        {row.planProjectId || '—'}
      </Typography>
    )
  },
  {
    width: 170,
    field: 'planTypeName',
    headerName: 'Type',
    renderCell: ({ row }) => (
      <Typography noWrap title={row.planTypeName || ''}>
        {row.planTypeName || '—'}
      </Typography>
    )
  },
  {
    width: 120,
    field: 'unitCode',
    headerName: 'Unit',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 500 }}>
        {row.unitCode || '—'}
      </Typography>
    )
  },
  {
    width: 130,
    field: 'planDate',
    headerName: 'Plan Date',
    renderCell: ({ row }) => <Typography noWrap>{formatDisplayDate(row.planDate)}</Typography>
  },
  {
    width: 150,
    field: 'maintenanceDate',
    headerName: 'Actual Date',
    renderCell: ({ row }) => {
      const caption = offsetCaption(dayOffset(row.planDate, row.maintenanceDate))

      return (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap>{formatDisplayDate(row.maintenanceDate)}</Typography>
          {caption && (
            <Typography variant='caption' noWrap sx={{ display: 'block', color: caption.color }}>
              {caption.text}
            </Typography>
          )}
        </Box>
      )
    }
  },
  {
    width: 110,
    field: 'hourMeter',
    headerName: 'HM',
    type: 'number',
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 500 }}>
        {row.hourMeter != null ? Number(row.hourMeter).toLocaleString('en-US') : '—'}
      </Typography>
    )
  },
  {
    width: 120,
    field: 'status',
    headerName: 'Status',
    renderCell: ({ row }) => (
      <CustomChip
        size='small'
        skin='light'
        label={ACTUAL_STATUS[row.status]?.label || row.status || '—'}
        color={ACTUAL_STATUS[row.status]?.color || 'secondary'}
      />
    )
  },
  {
    width: 130,
    field: 'qcStatus',
    headerName: 'QC',
    renderCell: ({ row }) => (
      <CustomChip
        size='small'
        skin='light'
        label={QC_STATUS[row.qcStatus]?.label || 'Not checked'}
        color={QC_STATUS[row.qcStatus]?.color || 'secondary'}
      />
    )
  },
  {
    width: 170,
    field: 'picName',
    headerName: 'PIC',
    renderCell: ({ row }) => (
      <Typography noWrap title={row.picName || ''}>
        {row.picName || '—'}
      </Typography>
    )
  },
  {
    flex: 1,
    minWidth: 240,
    field: 'remarks',
    headerName: 'Remarks',
    renderCell: ({ row }) =>
      row.remarks ? (
        <Tooltip title={<Box sx={{ whiteSpace: 'pre-wrap' }}>{row.remarks}</Box>} placement='top-start'>
          <Typography noWrap sx={{ color: 'text.secondary' }}>
            {row.remarks}
          </Typography>
        </Tooltip>
      ) : (
        <Typography sx={{ color: 'text.secondary' }}>—</Typography>
      )
  },
  {
    width: 140,
    field: 'createdByUsername',
    headerName: 'Created By',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ color: 'text.secondary' }}>
        {row.createdByUsername || '—'}
      </Typography>
    )
  },
  {
    width: 130,
    sortable: false,
    field: 'actions',
    headerName: 'Action',
    align: 'center',
    headerAlign: 'center',
    renderCell: ({ row }) => (
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <RowActions id={row.id} onEdit={onEdit} onView={onView} />
      </Box>
    )
  }
]

const MaintenanceActualList = () => {
  const [projectId, setProjectId] = useState('')
  const [maintenanceTypeId, setMaintenanceTypeId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })

  const dispatch = useDispatch()
  const { user } = useAuth()
  const { projects: projectsFromApi } = useProjects()
  const actualStore = useSelector(state => state.maintenanceActual)
  const planStore = useSelector(state => state.maintenancePlan)
  const unitStore = useSelector(state => state.unit)

  const allPlans = planStore.allData || []
  const allUnits = unitStore.allData?.length ? unitStore.allData : unitStore.data || []

  const projectCodes = useMemo(
    () => (user?.projectCodes ?? []).map(c => String(c).trim().toUpperCase()).filter(Boolean),
    [user?.projectCodes]
  )

  const isHeadOffice = useMemo(
    () => projectCodes.includes('000H') || projectCodes.includes('001H'),
    [projectCodes]
  )

  /** 000H/001H = semua project; selain itu filter by projectCodes */
  const projectOptions = useMemo(() => {
    const list = projectsFromApi || []
    if (isHeadOffice) return list
    if (!projectCodes.length) return []

    return list.filter(p => projectCodes.includes(String(p.value ?? '').trim().toUpperCase()))
  }, [isHeadOffice, projectCodes, projectsFromApi])

  /** Type options: unik dari plan yang boleh diakses user */
  const plans = useMemo(() => {
    if (isHeadOffice) return allPlans
    if (!projectCodes.length) return []

    return allPlans.filter(p => projectCodes.includes(String(p.projectId ?? '').trim().toUpperCase()))
  }, [isHeadOffice, projectCodes, allPlans])

  const typeOptions = useMemo(() => {
    const seen = new Set()
    
return plans
      .filter(p => p.maintenanceTypeId && !seen.has(p.maintenanceTypeId) && seen.add(p.maintenanceTypeId))
      .map(p => ({ id: p.maintenanceTypeId, name: p.maintenanceTypeName || p.maintenanceType?.name || '—' }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }, [plans])

  /** Unit: HO = semua; lain = filter projectCodes */
  const units = useMemo(() => {
    if (isHeadOffice) return allUnits
    if (!projectCodes.length) return []

    return allUnits.filter(u => {
      const pid = String(u.projectId ?? '')
        .trim()
        .toUpperCase()

      const pname = String(u.projectName ?? '')
        .trim()
        .toUpperCase()

      return (
        projectCodes.includes(pid) ||
        projectCodes.some(c => pname === c || (pname !== '' && pname.includes(c)))
      )
    })
  }, [isHeadOffice, projectCodes, allUnits])

  useEffect(() => {
    dispatch(fetchPlans({}))
    dispatch(fetchUnits({}))
  }, [dispatch])

  useEffect(() => {
    dispatch(
      fetchActuals({
        projectId: projectId || undefined,
        maintenanceTypeId: maintenanceTypeId || undefined,
        unitId: unitId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      })
    )
  }, [dispatch, projectId, maintenanceTypeId, unitId, dateFrom, dateTo])

  const router = useRouter()

  const handleEdit = useCallback(
    id => {
      router.push(`/maintenance-actuals/edit/${id}`)
    },
    [router]
  )

  const handleView = useCallback(
    id => {
      router.push(`/maintenance-actuals/view/${id}`)
    },
    [router]
  )

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Maintenance Actuals</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Executions recorded against a plan date
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
                  onChange={e => setProjectId(e.target.value)}
                  placeholder='Search project…'
                  options={[
                    { value: '', label: 'All projects' },
                    ...projectOptions.map(p => ({ value: p.value, label: p.value }))
                  ]}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <SearchableSelect
                  label='Type'
                  value={maintenanceTypeId}
                  onChange={e => setMaintenanceTypeId(e.target.value)}
                  placeholder='Search type…'
                  options={[{ value: '', label: 'All types' }, ...typeOptions.map(t => ({ value: t.id, label: t.name }))]}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <SearchableSelect
                  label='Unit'
                  value={unitId}
                  onChange={e => setUnitId(e.target.value)}
                  placeholder='Search unit…'
                  options={[{ value: '', label: 'All units' }, ...units.map(toUnitSearchOption)]}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Date From'
                  value={dateFrom || ''}
                  onChange={e => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Date To'
                  value={dateTo || ''}
                  onChange={e => setDateTo(e.target.value)}
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
                    setMaintenanceTypeId('')
                    setUnitId('')
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
          <TableHeader addHref='/maintenance-actuals/add' />
          <DataGrid
            autoHeight
            rowHeight={62}
            rows={actualStore.data}
            columns={columns(handleEdit, handleView)}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sx={{
              '& .MuiDataGrid-columnHeaders': { minHeight: 48 },
              '& .MuiDataGrid-cell': { minHeight: 62 },
              '& .MuiDataGrid-virtualScroller': { overflowX: 'auto' }
            }}
          />
        </Card>
      </Grid>
    </Grid>
  )
}

MaintenanceActualList.acl = {
  subject: 'maintenance-actual',
  action: 'read'
}

export default MaintenanceActualList
