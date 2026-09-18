/**
 * Maintenance Plan List — FMS
 *
 * Halaman list rencana maintenance (agregat per project, year, month, maintenance type).
 * Fitur:
 * - Filter: Project, Year, Month, Maintenance Type
 * - CRUD: Add Plan (drawer), Edit/Delete per baris (DataGrid)
 * - Export Excel: hanya data bulan terakhir tahun terakhir (dari data yang tampil)
 * - Import Excel: upload file dengan kolom Project, Year, Month, Maintenance Type, Total Plan (upsert by unique)
 * - Dialog detail error import menampilkan Row (nomor baris Excel) dan pesan error
 */
import arkaApi from 'src/utils/arka-api'

// ** React Imports
import { useState, useEffect, useCallback } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import { DataGrid } from '@mui/x-data-grid'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Store Imports
import { useDispatch, useSelector } from 'react-redux'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Third Party
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

// ** Actions
import { fetchData as fetchPlans, deleteMaintenancePlan } from 'src/store/apps/maintenancePlan'
import { fetchData as fetchMaintenanceTypes } from 'src/store/apps/maintenanceType'

// ** Hooks
import useProjects from 'src/hooks/useProjects'
import { useAuth } from 'src/hooks/useAuth'

// ** Views
import TableHeader from 'src/views/apps/maintenance-plan/list/TableHeader'
import AddMaintenancePlanDrawer from 'src/views/apps/maintenance-plan/list/AddMaintenancePlanDrawer'
import EditMaintenancePlanDrawer from 'src/views/apps/maintenance-plan/list/EditMaintenancePlanDrawer'

/** Nama bulan Inggris (index 0 kosong, 1=January .. 12=December) untuk tampilan dan export */
const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

/** Map nama bulan → angka (January→1 .. December→12), dipakai saat parse import Excel */
const MONTH_NAME_TO_NUMBER = Object.fromEntries(MONTH_NAMES.slice(1).map((name, i) => [name, i + 1]))

/** Opsi filter Month di list (value 1-12 + All) */
const MONTH_OPTIONS = [
  { value: '', label: 'All' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
]

/**
 * Tombol Edit dan Delete per baris DataGrid.
 * Delete memakai toast konfirmasi (Cancel/Delete) lalu dispatch deleteMaintenancePlan(id).
 */
const RowActions = ({ id, onEdit }) => {
  const dispatch = useDispatch()

  const handleDeleteClick = () => {
    toast(
      t => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 280 }}>
          <Typography>Delete this maintenance plan?</Typography>
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
                dispatch(deleteMaintenancePlan(id))
                  .unwrap()
                  .then(() => toast.success('Plan deleted'))
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
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
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

/** Definisi kolom DataGrid list maintenance plan */
const columns = onEdit => [
  {
    flex: 1,
    minWidth: 120,
    field: 'projectId',
    headerName: 'Project',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 500 }}>
        {row.projectId || '—'}
      </Typography>
    )
  },
  {
    flex: 0.6,
    minWidth: 70,
    field: 'year',
    headerName: 'Year',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ color: 'text.secondary' }}>
        {row.year}
      </Typography>
    )
  },
  {
    flex: 0.6,
    minWidth: 70,
    field: 'month',
    headerName: 'Month',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ color: 'text.secondary' }}>
        {MONTH_NAMES[row.month] || row.month}
      </Typography>
    )
  },
  {
    flex: 1,
    minWidth: 140,
    field: 'maintenanceTypeName',
    headerName: 'Type',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ color: 'text.secondary' }}>
        {row.maintenanceTypeName || '—'}
      </Typography>
    )
  },
  {
    flex: 0.7,
    minWidth: 90,
    field: 'sumPlan',
    headerName: 'Total Plan',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 500 }}>
        {row.sumPlan}
      </Typography>
    )
  },
  {
    flex: 1,
    minWidth: 120,
    field: 'createdByUsername',
    headerName: 'Created By',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ color: 'text.secondary' }}>
        {row.createdByUsername || '—'}
      </Typography>
    )
  },
  {
    flex: 0.8,
    minWidth: 100,
    sortable: false,
    field: 'actions',
    headerName: 'Actions',
    renderCell: ({ row }) => <RowActions id={row.id} onEdit={onEdit} />
  }
]

/**
 * Halaman list Maintenance Plans.
 * Data di-fetch dengan order createdAt desc (API); export hanya periode bulan terakhir tahun terakhir.
 */
const MaintenancePlanList = () => {
  // --- Filter & pagination
  const [projectId, setProjectId] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [maintenanceTypeId, setMaintenanceTypeId] = useState('')
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })

  // --- Drawers & dialog
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [importErrorDetails, setImportErrorDetails] = useState(null) // { summary, errors: [{ row, message }] }

  const dispatch = useDispatch()
  const { user } = useAuth()
  const { projects, loading: projectsLoading } = useProjects()
  const planStore = useSelector(state => state.maintenancePlan)
  const typeStore = useSelector(state => state.maintenanceType)
  const maintenanceTypes = typeStore.allData || []

  /** Load master maintenance types sekali saat mount */
  useEffect(() => {
    dispatch(fetchMaintenanceTypes({}))
  }, [dispatch])

  /** Fetch list plans saat filter berubah (projectId, year, month, maintenanceTypeId) */
  useEffect(() => {
    dispatch(
      fetchPlans({
        projectId: projectId || undefined,
        year: year || undefined,
        month: month || undefined,
        maintenanceTypeId: maintenanceTypeId || undefined
      })
    )
  }, [dispatch, projectId, year, month, maintenanceTypeId])

  const toggleAddDrawer = () => setAddOpen(!addOpen)

  const toggleEditDrawer = () => {
    setEditOpen(!editOpen)
    if (editOpen) setEditId(null)
  }

  /** Buka drawer edit dengan plan id tertentu */
  const handleEdit = useCallback(id => {
    setEditId(id)
    setEditOpen(true)
  }, [])

  /**
   * Export Excel: hanya data bulan terakhir tahun terakhir dari planStore.data.
   * Kolom: Project, Year, Month (nama), Maintenance Type, Total Plan.
   * File: maintenance-plans-YYYYMMDD.xlsx
   */
  const handleExport = useCallback(() => {
    const data = planStore.data || []
    if (data.length === 0) {
      toast.error('Tidak ada data untuk diexport')
      
return
    }
    const maxYear = Math.max(...data.map(r => r.year))
    const lastYearData = data.filter(r => r.year === maxYear)
    const maxMonth = Math.max(...lastYearData.map(r => r.month))
    const toExport = data.filter(r => r.year === maxYear && r.month === maxMonth)

    const rows = toExport.map(row => ({
      Project: row.projectId ?? '',
      Year: row.year ?? '',
      Month: MONTH_NAMES[row.month] || row.month || '',
      'Maintenance Type': row.maintenanceTypeName ?? '',
      'Total Plan': row.sumPlan ?? 0
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Plans')
    const date = new Date()

    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
      date.getDate()
    ).padStart(2, '0')}`
    XLSX.writeFile(wb, `maintenance-plans-${dateStr}.xlsx`)
    toast.success(`Export downloaded (${MONTH_NAMES[maxMonth]} ${maxYear}, ${rows.length} baris)`)
  }, [planStore.data])

  /**
   * Import Excel: baca file, parse kolom (Project, Year, Month, Maintenance Type, Total Plan).
   * Month bisa nama bulan atau angka; Maintenance Type di-resolve ke id dari maintenanceTypes.
   * Validasi per baris (Excel row = index+2); kirim ke POST /api/maintenance-plans/import (upsert).
   * On error tampilkan dialog importErrorDetails dengan Row + message.
   */
  const handleImport = useCallback(
    async e => {
      const file = e?.target?.files?.[0]
      if (!file) return
      const createdById = user?.id
      if (!createdById) {
        toast.error('You must be logged in to import')
        e.target.value = ''
        
return
      }
      try {
        const data = await file.arrayBuffer()
        const wb = XLSX.read(data, { type: 'array' })
        const firstSheet = wb.SheetNames[0] ? wb.Sheets[wb.SheetNames[0]] : null
        if (!firstSheet) {
          toast.error('No sheet found in file')
          e.target.value = ''
          
return
        }
        const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
        const nameToTypeId = Object.fromEntries((maintenanceTypes || []).map(t => [t.name, t.id]))
        const plans = []
        const clientErrors = []
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]
          const projectId = String(r.Project ?? r.project_id ?? '').trim()
          const yearRaw = r.Year ?? r.year
          const monthRaw = r.Month ?? r.month
          const typeName = String(r['Maintenance Type'] ?? r.maintenance_type_name ?? '').trim()
          const sumPlanRaw = r['Total Plan'] ?? r.sum_plan
          const year = yearRaw !== '' && yearRaw != null ? Number(yearRaw) : NaN
          let month = NaN
          if (monthRaw !== '' && monthRaw != null) {
            month = MONTH_NAME_TO_NUMBER[String(monthRaw).trim()] ?? parseInt(String(monthRaw), 10)
          }
          const sumPlan = sumPlanRaw !== '' && sumPlanRaw != null ? Number(sumPlanRaw) : 0

          const maintenanceTypeId =
            nameToTypeId[typeName] || (r.maintenance_type_id ? String(r.maintenance_type_id).trim() : '')
          const excelRow = i + 2
          if (!projectId || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            clientErrors.push({ row: excelRow, message: 'Invalid Project, Year or Month' })
            continue
          }
          if (!maintenanceTypeId) {
            clientErrors.push({ row: excelRow, message: `Maintenance type "${typeName || '(empty)'}" not found` })
            continue
          }
          if (isNaN(sumPlan) || sumPlan < 0) {
            clientErrors.push({ row: excelRow, message: 'Total Plan must be non-negative number' })
            continue
          }
          plans.push({ projectId, year, month, maintenanceTypeId, sumPlan })
        }
        if (plans.length === 0) {
          setImportErrorDetails({
            summary: 'Tidak ada baris valid. Perbaiki error berikut lalu import ulang.',
            errors: clientErrors.length
              ? clientErrors
              : [
                  {
                    row: 0,
                    message:
                      'File kosong atau format kolom tidak sesuai (harus: Project, Year, Month, Maintenance Type, Sum Plan).'
                  }
                ]
          })
          toast.error('Import gagal. Lihat detail error di bawah.')
          e.target.value = ''
          
return
        }

        const { data: result } = await arkaApi.post('/maintenance-plans/import', { plans, createdById })

        if (!result) {
          setImportErrorDetails({
            summary: 'Import gagal',
            errors: [{ row: 0, message: 'Import failed' }]
          })
          toast.error('Import gagal. Lihat detail error.')
          e.target.value = ''

          return
        }

        if (result?.error && !result?.created && !result?.updated) {
          setImportErrorDetails({
            summary: result?.error || 'Import gagal',
            errors: [{ row: 0, message: result?.error || 'Import failed' }]
          })
          toast.error('Import gagal. Lihat detail error.')
          e.target.value = ''

          return
        }
        dispatch(
          fetchPlans({
            projectId: projectId || undefined,
            year: year || undefined,
            month: month || undefined,
            maintenanceTypeId: maintenanceTypeId || undefined
          })
        )
        const allErrors = [...(clientErrors || []), ...(result.errors || [])]

        const msg = [
          result.created > 0 && `${result.created} created`,
          result.updated > 0 && `${result.updated} updated`,
          allErrors.length > 0 && `${allErrors.length} error(s)`
        ]
          .filter(Boolean)
          .join(', ')
        if (allErrors.length > 0) {
          setImportErrorDetails({
            summary: msg,
            errors: allErrors
          })
          toast.error('Import selesai dengan error. Lihat detail di bawah.')
        } else {
          toast.success(msg || 'Import selesai.')
        }
      } catch (err) {
        setImportErrorDetails({
          summary: 'Import gagal',
          errors: [{ row: 0, message: err?.message || 'Import failed' }]
        })
        toast.error('Import gagal. Lihat detail error.')
      }
      e.target.value = ''
    },
    [user?.id, dispatch, projectId, year, month, maintenanceTypeId, maintenanceTypes]
  )

  return (
    <Grid container spacing={6.5}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title='Maintenance Plans' />
          <CardContent>
            {/* Filter: Project, Year, Month, Maintenance Type */}
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <CustomTextField
                  fullWidth
                  select
                  label='Project'
                  value={projectId || ''}
                  onChange={e => setProjectId(e.target.value)}
                  disabled={projectsLoading}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value=''>All projects</MenuItem>
                  {(projects || []).map(p => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.value}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <CustomTextField
                  fullWidth
                  type='number'
                  label='Year'
                  value={year || ''}
                  onChange={e => setYear(e.target.value)}
                  placeholder='e.g. 2025'
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <CustomTextField
                  fullWidth
                  select
                  label='Month'
                  value={month || ''}
                  onChange={e => setMonth(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  {MONTH_OPTIONS.map(m => (
                    <MenuItem key={m.value || 'all'} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <CustomTextField
                  fullWidth
                  select
                  label='Type'
                  value={maintenanceTypeId || ''}
                  onChange={e => setMaintenanceTypeId(e.target.value)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value=''>All types</MenuItem>
                  {maintenanceTypes.map(t => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button
                  fullWidth
                  variant='tonal'
                  color='secondary'
                  startIcon={<Icon icon='tabler:refresh' />}
                  onClick={() => {
                    setProjectId('')
                    setYear('')
                    setMonth('')
                    setMaintenanceTypeId('')
                  }}
                >
                  Reset
                </Button>
              </Grid>
            </Grid>
          </CardContent>
          <Divider sx={{ m: '0 !important' }} />
          {/* Toolbar: Export, Import, Add Plan */}
          <TableHeader toggle={toggleAddDrawer} onExport={handleExport} onImport={handleImport} />
          <DataGrid
            autoHeight
            rowHeight={62}
            rows={planStore.data}
            columns={columns(handleEdit)}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sx={{ '& .MuiDataGrid-columnHeaders': { minHeight: 48 }, '& .MuiDataGrid-cell': { minHeight: 62 } }}
          />
        </Card>
      </Grid>

      {/* Drawers Add / Edit */}
      <AddMaintenancePlanDrawer open={addOpen} toggle={toggleAddDrawer} maintenanceTypes={maintenanceTypes} />
      <EditMaintenancePlanDrawer
        open={editOpen}
        toggle={toggleEditDrawer}
        planId={editId}
        maintenanceTypes={maintenanceTypes}
      />

      {/* Dialog detail error import (Row + message per error) */}
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

MaintenancePlanList.acl = {
  subject: 'maintenance-plan',
  action: 'read'
}

export default MaintenancePlanList
