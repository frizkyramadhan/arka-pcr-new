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
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import { DataGrid } from '@mui/x-data-grid'

import CustomTextField from 'src/@core/components/mui/text-field'
import { useDispatch, useSelector } from 'react-redux'
import Icon from 'src/@core/components/icon'
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

/** Kolom DataGrid list maintenance actual: Project, Type, Unit, Date, HM, Remarks, Created By, Action */
const columns = (onEdit, onView) => [
  {
    flex: 1,
    minWidth: 100,
    field: 'planProjectId',
    headerName: 'Project',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 500 }}>
        {row.planProjectId || '—'}
      </Typography>
    )
  },
  {
    flex: 1,
    minWidth: 120,
    field: 'planTypeName',
    headerName: 'Type',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ color: 'text.secondary' }}>
        {row.planTypeName || '—'}
      </Typography>
    )
  },
  {
    flex: 1,
    minWidth: 90,
    field: 'unitCode',
    headerName: 'Unit',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ color: 'text.secondary' }}>
        {row.unitCode || '—'}
      </Typography>
    )
  },
  {
    flex: 1,
    minWidth: 110,
    field: 'maintenanceDate',
    headerName: 'Date',
    renderCell: ({ row }) => <Typography noWrap>{row.maintenanceDate || '—'}</Typography>
  },
  {
    flex: 1,
    minWidth: 70,
    field: 'hourMeter',
    headerName: 'HM',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 500 }}>
        {row.hourMeter != null ? row.hourMeter : '—'}
      </Typography>
    )
  },
  {
    flex: 1,
    minWidth: 120,
    field: 'remarks',
    headerName: 'Remarks',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ color: 'text.secondary' }} title={row.remarks || ''}>
        {row.remarks ? (row.remarks.length > 30 ? row.remarks.slice(0, 30) + '…' : row.remarks) : '—'}
      </Typography>
    )
  },
  {
    flex: 1,
    minWidth: 100,
    field: 'createdByUsername',
    headerName: 'Created By',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ color: 'text.secondary' }}>
        {row.createdByUsername || '—'}
      </Typography>
    )
  },
  {
    flex: 0,
    minWidth: 120,
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
    <Grid container spacing={6.5}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title='Maintenance Actuals' />
          <CardContent>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={2}>
                <CustomTextField
                  fullWidth
                  select
                  label='Project'
                  value={projectId || ''}
                  onChange={e => setProjectId(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value=''>All projects</MenuItem>
                  {projectOptions.map(p => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.value}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <CustomTextField
                  fullWidth
                  select
                  label='Type'
                  value={maintenanceTypeId || ''}
                  onChange={e => setMaintenanceTypeId(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value=''>All types</MenuItem>
                  {typeOptions.map(t => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <CustomTextField
                  fullWidth
                  select
                  label='Unit'
                  value={unitId || ''}
                  onChange={e => setUnitId(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value=''>All units</MenuItem>
                  {units.map(u => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.code || u.id}
                    </MenuItem>
                  ))}
                </CustomTextField>
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
            sx={{ '& .MuiDataGrid-columnHeaders': { minHeight: 48 }, '& .MuiDataGrid-cell': { minHeight: 62 } }}
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
