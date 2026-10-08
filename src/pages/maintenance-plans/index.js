/**
 * Maintenance Plan List — satu baris = project, tahun, bulan, program.
 * Edit membuka grid unit × tanggal. Total plan = jumlah detail, atau kuota lama.
 * Filter tetap project / tahun / bulan / program.
 * Export mengikuti filter: satu baris per tanggal unit (Project, Year, Month, Unit, Plan Date, Maintenance Type).
 * Import memakai file yang sama. Site, tahun, dan bulan diisi ulang dari unit dan plan date.
 */
import arkaApi from 'src/utils/arka-api'

// ** React Imports
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'
import { DataGrid } from '@mui/x-data-grid'

// ** Custom Components
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'

// ** Store Imports
import { useDispatch, useSelector } from 'react-redux'

// ** Icon Imports
import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'

// ** Third Party
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

// ** Actions
import { fetchData as fetchPlans } from 'src/store/apps/maintenancePlan'
import { fetchData as fetchMaintenanceTypes } from 'src/store/apps/maintenanceType'

// ** Hooks
import useProjects from 'src/hooks/useProjects'
import { useAuth } from 'src/hooks/useAuth'

// ** Views
import TableHeader from 'src/views/apps/maintenance-plan/list/TableHeader'

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

const scheduleQuery = row =>
  new URLSearchParams({
    projectId: row.projectId || '',
    year: String(row.year || ''),
    month: String(row.month || ''),
    maintenanceTypeId: row.maintenanceTypeId || ''
  }).toString()

const RowActions = ({ row }) => {
  const router = useRouter()

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Tooltip title='Edit'>
        <IconButton
          size='small'
          sx={{ color: 'text.secondary' }}
          onClick={() => router.push(`/maintenance-plans/edit?${scheduleQuery(row)}`)}
        >
          <Icon icon='tabler:edit' />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

/** Definisi kolom DataGrid list maintenance plan */
const columns = [
  {
    flex: 0.8,
    minWidth: 110,
    field: 'projectId',
    headerName: 'Project',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 500 }}>
        {row.projectId || '—'}
      </Typography>
    )
  },
  {
    flex: 0.5,
    minWidth: 80,
    field: 'year',
    headerName: 'Year'
  },
  {
    flex: 0.7,
    minWidth: 110,
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
    flex: 0.6,
    minWidth: 100,
    field: 'sumPlan',
    headerName: 'Total Plan',
    renderCell: ({ row }) => (
      <Typography noWrap sx={{ fontWeight: 500 }}>
        {row.sumPlan ?? 0}
      </Typography>
    )
  },
  {
    flex: 0.5,
    minWidth: 90,
    sortable: false,
    field: 'actions',
    headerName: 'Actions',
    renderCell: ({ row }) => <RowActions row={row} />
  }
]

/**
 * Halaman list Maintenance Plans.
 * Export memakai baris yang sedang terfilter. Import: Unit, Plan Date, Program.
 */
const MaintenancePlanList = () => {
  // --- Filter & pagination
  const [projectId, setProjectId] = useState('')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [maintenanceTypeId, setMaintenanceTypeId] = useState('')
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
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

  /**
   * Export Excel tanggal unit pada filter yang sedang tampil.
   * Kolom sama dengan yang dibaca import. Tanpa tanggal, unduh template header saja.
   */
  const handleExport = useCallback(async () => {
    const blank = {
      Project: '',
      Year: '',
      Month: '',
      Unit: '',
      'Plan Date': '',
      'Maintenance Type': ''
    }
    try {
      const { data: result } = await arkaApi.get('/maintenance-plans', {
        params: {
          ...(projectId ? { projectId } : {}),
          ...(year ? { year } : {}),
          ...(month ? { month } : {}),
          ...(maintenanceTypeId ? { maintenanceTypeId } : {}),
          details: '1'
        }
      })
      const plans = result?.maintenancePlans || []

      const rows = []
      for (const plan of plans) {
        for (const detail of plan.details || []) {
          if (!detail?.unitNo || !detail?.planDate) continue
          rows.push({
            Project: plan.projectId ?? '',
            Year: plan.year ?? '',
            Month: plan.month ?? '',
            Unit: detail.unitNo,
            'Plan Date': detail.planDate,
            'Maintenance Type': plan.maintenanceTypeName ?? ''
          })
        }
      }

      const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [blank])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Plans')
      const date = new Date()

      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
        date.getDate()
      ).padStart(2, '0')}`
      XLSX.writeFile(wb, `maintenance-plans-${dateStr}.xlsx`)
      toast.success(rows.length ? `Export downloaded (${rows.length} baris)` : 'Template downloaded')
    } catch (err) {
      toast.error(err?.message || 'Export failed')
    }
  }, [projectId, year, month, maintenanceTypeId])

  /**
   * Import Excel hasil export: Project, Year, Month, Unit, Plan Date, Maintenance Type.
   * Program boleh nama atau id. Server mengisi site, tahun, dan bulan dari unit dan tanggal.
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
        const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: true })

        const nameToTypeId = Object.fromEntries(
          (maintenanceTypes || []).map(t => [String(t.name).trim().toLowerCase(), t.id])
        )
        const plans = []
        const clientErrors = []
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]
          const unitNo = String(r.Unit ?? r.unit_no ?? r.unitNo ?? '').trim()
          const planDate = r['Plan Date'] ?? r.plan_date ?? r.planDate ?? ''
          const program = String(r.Program ?? r['Maintenance Type'] ?? r.maintenance_type_name ?? '').trim()
          const project = String(r.Project ?? r.project_id ?? r.projectId ?? '').trim()
          const excelRow = i + 2
          if (!unitNo && (planDate === '' || planDate == null) && !program && !project) continue
          if (!unitNo) {
            clientErrors.push({ row: excelRow, message: 'Unit is required' })
            continue
          }
          if (planDate === '' || planDate == null) {
            clientErrors.push({ row: excelRow, message: 'Plan Date is required' })
            continue
          }
          const maintenanceTypeId = nameToTypeId[program.toLowerCase()] || ''
          if (!program && !maintenanceTypeId) {
            clientErrors.push({ row: excelRow, message: 'Program is required' })
            continue
          }
          plans.push({
            row: excelRow,
            unitNo,
            planDate,
            program,
            ...(maintenanceTypeId ? { maintenanceTypeId } : {}),
            ...(project ? { projectId: project } : {})
          })
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
                      'File kosong atau format kolom tidak sesuai (harus: Project, Year, Month, Unit, Plan Date, Maintenance Type).'
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
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Maintenance Plans</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              One schedule per site, year, month, and program
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            {/* Filter: Project, Year, Month, Maintenance Type */}
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <SearchableSelect
                  label='Project'
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  disabled={projectsLoading}
                  placeholder='Search project…'
                  options={[
                    { value: '', label: 'All projects' },
                    ...(projects || []).map(p => ({ value: p.value, label: p.value }))
                  ]}
                />
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
                <SearchableSelect
                  label='Month'
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  placeholder='Search month…'
                  options={MONTH_OPTIONS}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <SearchableSelect
                  label='Type'
                  value={maintenanceTypeId}
                  onChange={e => setMaintenanceTypeId(e.target.value)}
                  placeholder='Search type…'
                  options={[
                    { value: '', label: 'All types' },
                    ...maintenanceTypes.map(t => ({ value: t.id, label: t.name }))
                  ]}
                />
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
          <TableHeader onExport={handleExport} onImport={handleImport} />
          <DataGrid
            autoHeight
            rowHeight={62}
            rows={planStore.data}
            columns={columns}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sx={{ '& .MuiDataGrid-columnHeaders': { minHeight: 48 }, '& .MuiDataGrid-cell': { minHeight: 62 } }}
          />
        </Card>
      </Grid>

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
