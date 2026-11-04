/**
 * SAP Employees (System menu) — manage EmployeesInfo via Service Layer.
 * First open: meta only (empty grid). List loads after Search with ≥1 filter; client-side pagination.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'

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
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import PageHeader from 'src/@core/components/page-header'
import TableRowActions from 'src/@core/components/table-row-actions'
import useCan from 'src/hooks/useCan'
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'

const downloadBlob = (data, filename) => {
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const EMPTY_FORM = {
  firstName: '',
  middleName: '',
  lastName: '',
  nik: '',
  jobTitle: '',
  position: '',
  empCategory: '',
  branch: '',
  department: '',
  isMechanic: 'N',
  recordStatus: 'A'
}

const MECHANIC_OPTIONS = [
  { value: 'Y', label: 'Yes — mechanic (Plant)' },
  { value: 'N', label: 'No — operator (Production)' }
]

const STATUS_OPTIONS = [
  { value: 'A', label: 'Activated' },
  { value: 'D', label: 'Deactivated' }
]

const FILTER_ALL = ''

const hasAnyFilter = ({ q, branch, department, position, empCategory, status, mechanic }) =>
  Boolean(q?.trim() || branch || department || position || empCategory || status || mechanic)

const SapEmployeesPage = () => {
  const { can } = useCan()
  const canCreate = can('sap-employees.create')
  const canUpdate = can('sap-employees.update')
  const canImport = canCreate || canUpdate
  const fileInputRef = useRef(null)

  const [rows, setRows] = useState([])
  const [searched, setSearched] = useState(false)
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 })
  const [branches, setBranches] = useState([])
  const [departments, setDepartments] = useState([])
  const [positions, setPositions] = useState([])
  const [empCategories, setEmpCategories] = useState([])
  const [metaLoading, setMetaLoading] = useState(true)
  const [loading, setLoading] = useState(false)

  const [qDraft, setQDraft] = useState('')
  const [branchFilter, setBranchFilter] = useState(FILTER_ALL)
  const [departmentFilter, setDepartmentFilter] = useState(FILTER_ALL)
  const [positionFilter, setPositionFilter] = useState(FILTER_ALL)
  const [empCategoryFilter, setEmpCategoryFilter] = useState(FILTER_ALL)
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL)
  const [mechanicFilter, setMechanicFilter] = useState(FILTER_ALL)

  const [applied, setApplied] = useState({
    q: '',
    branch: '',
    department: '',
    position: '',
    empCategory: '',
    status: '',
    mechanic: ''
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [statusTarget, setStatusTarget] = useState(null)
  const [statusBusy, setStatusBusy] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const loadMeta = useCallback(() => {
    setMetaLoading(true)
    arkaApi
      .get('/admin/sap-employees/meta')
      .then(res => {
        setBranches(res.data?.branches || [])
        setDepartments(res.data?.departments || [])
        setPositions(res.data?.positions || [])
        setEmpCategories(res.data?.empCategories || [])
      })
      .catch(error => {
        setBranches([])
        setDepartments([])
        setPositions([])
        setEmpCategories([])
        notifyApiError(error, 'Failed to load lookups', toast.error)
      })
      .finally(() => setMetaLoading(false))
  }, [])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

  const searchParams = useMemo(
    () => ({
      q: applied.q || undefined,
      branch: applied.branch || undefined,
      department: applied.department || undefined,
      position: applied.position || undefined,
      empCategory: applied.empCategory || undefined,
      recordStatus: applied.status || undefined,
      isMechanic: applied.mechanic || undefined
    }),
    [applied]
  )

  const loadList = useCallback(
    filters => {
      if (!hasAnyFilter(filters)) {
        setRows([])
        setSearched(false)
        toast.error('Set at least one filter, then Search')

        return
      }

      setLoading(true)
      setSearched(true)
      arkaApi
        .get('/admin/sap-employees', {
          params: {
            q: filters.q || undefined,
            branch: filters.branch || undefined,
            department: filters.department || undefined,
            position: filters.position || undefined,
            empCategory: filters.empCategory || undefined,
            recordStatus: filters.status || undefined,
            isMechanic: filters.mechanic || undefined
          },
          skipGlobalErrorToast: true
        })
        .then(res => {
          setRows(res.data?.data || [])
        })
        .catch(error => {
          setRows([])
          notifyApiError(error, 'Failed to load SAP employees', toast.error)
        })
        .finally(() => setLoading(false))
    },
    []
  )

  const handleSearch = () => {
    const next = {
      q: qDraft.trim(),
      branch: branchFilter,
      department: departmentFilter,
      position: positionFilter,
      empCategory: empCategoryFilter,
      status: statusFilter,
      mechanic: mechanicFilter
    }
    setApplied(next)
    setPaginationModel(prev => ({ ...prev, page: 0 }))
    loadList(next)
  }

  const branchOptions = useMemo(
    () => branches.map(row => ({ value: String(row.code), label: row.name })),
    [branches]
  )

  const departmentOptions = useMemo(
    () => departments.map(row => ({ value: String(row.code), label: row.name })),
    [departments]
  )

  const positionOptions = useMemo(
    () => positions.map(row => ({ value: String(row.code), label: row.name })),
    [positions]
  )

  const empCategoryOptions = useMemo(
    () => empCategories.map(row => ({ value: String(row.code), label: row.name })),
    [empCategories]
  )

  const branchName = useCallback(
    code => {
      if (code == null) return '—'
      const found = branches.find(row => row.code === code)

      return found ? found.name : String(code)
    },
    [branches]
  )

  const departmentName = useCallback(
    code => {
      if (code == null) return '—'
      const found = departments.find(row => row.code === code)

      return found ? found.name : String(code)
    },
    [departments]
  )

  const positionName = useCallback(
    (code, fallback) => {
      if (code == null) return '—'
      if (fallback) return fallback
      const found = positions.find(row => row.code === code)

      return found ? found.name : String(code)
    },
    [positions]
  )

  const empCategoryLabel = useCallback(
    (code, fallback) => {
      if (!code) return '—'
      if (fallback) return fallback
      const found = empCategories.find(row => String(row.code).toUpperCase() === String(code).toUpperCase())

      return found ? found.name : String(code)
    },
    [empCategories]
  )

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = row => {
    setEditing(row)
    setForm({
      firstName: row.firstName || '',
      middleName: row.middleName || '',
      lastName: row.lastName || '',
      nik: row.nik || '',
      jobTitle: row.jobTitle || '',
      position: row.position == null ? '' : String(row.position),
      empCategory: row.empCategory || '',
      branch: row.branch == null ? '' : String(row.branch),
      department: row.department == null ? '' : String(row.department),
      isMechanic: row.isMechanic === 'Y' ? 'Y' : 'N',
      recordStatus: row.recordStatus === 'D' || row.recordStatus === 'I' ? 'D' : 'A'
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)

    const payload = {
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      nik: form.nik,
      jobTitle: form.jobTitle,
      position: form.position === '' ? null : Number(form.position),
      empCategory: form.empCategory,
      branch: form.branch === '' ? null : Number(form.branch),
      department: form.department === '' ? null : Number(form.department),
      isMechanic: form.isMechanic,
      recordStatus: form.recordStatus
    }

    try {
      if (editing) {
        await arkaApi.put(`/admin/sap-employees/${editing.employeeId}`, payload)
        toast.success('Employee updated in SAP')
      } else {
        await arkaApi.post('/admin/sap-employees', payload)
        toast.success('Employee created in SAP')
      }
      setDialogOpen(false)
      if (searched) loadList(applied)
    } catch (error) {
      await notifyApiError(error, editing ? 'Failed to update employee' : 'Failed to create employee', toast.error)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusConfirm = async () => {
    if (!statusTarget) return
    setStatusBusy(true)
    const action = statusTarget.recordStatus === 'A' ? 'deactivate' : 'activate'

    try {
      await arkaApi.patch(`/admin/sap-employees/${statusTarget.employeeId}`, { action })
      toast.success(action === 'activate' ? 'Employee activated' : 'Employee deactivated')
      setStatusTarget(null)
      if (searched) loadList(applied)
    } catch (error) {
      await notifyApiError(error, 'Failed to change employee status', toast.error)
    } finally {
      setStatusBusy(false)
    }
  }

  const handleExport = async () => {
    if (!hasAnyFilter(applied)) {
      toast.error('Search with a filter before export')

      return
    }
    setExporting(true)
    try {
      const response = await arkaApi.get('/admin/sap-employees/export', {
        params: searchParams,
        responseType: 'blob',
        skipGlobalErrorToast: true
      })
      downloadBlob(response.data, 'sap-employees.xlsx')
      toast.success('Export downloaded')
    } catch (error) {
      await notifyApiError(error, 'Export failed', toast.error)
    } finally {
      setExporting(false)
    }
  }

  const handleTemplate = async () => {
    try {
      const response = await arkaApi.get('/admin/sap-employees/export', {
        params: { template: 1 },
        responseType: 'blob',
        skipGlobalErrorToast: true
      })
      downloadBlob(response.data, 'sap-employees-template.xlsx')
    } catch (error) {
      await notifyApiError(error, 'Template download failed', toast.error)
    }
  }

  const handleImport = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    setImporting(true)

    try {
      const { data } = await arkaApi.post('/admin/sap-employees/import', formData, {
        skipGlobalErrorToast: true
      })
      setImportResult(data)
      if ((data.imported ?? 0) > 0 && searched) loadList(applied)
      if ((data.imported ?? 0) > 0 && !(data.errors ?? []).length) {
        toast.success(`Imported ${data.imported} employee(s)`)
      }
    } catch (error) {
      const payload = error.response?.data ?? {}
      if (payload.errors || payload.created != null || payload.updated != null) {
        setImportResult(payload)
      } else {
        await notifyApiError(error, 'Import failed', toast.error)
      }
    } finally {
      setImporting(false)
    }
  }

  const columns = useMemo(
    () => [
      { field: 'employeeId', headerName: 'ID', width: 80 },
      {
        field: 'displayName',
        headerName: 'Name',
        flex: 1,
        minWidth: 150,
        valueGetter: ({ row }) => row.displayName || `${row.firstName} ${row.lastName}`.trim()
      },
      { field: 'nik', headerName: 'NIK', width: 110 },
      {
        field: 'positionName',
        headerName: 'Position',
        flex: 1,
        minWidth: 140,
        valueGetter: ({ row }) => positionName(row.position, row.positionName)
      },
      {
        field: 'empCategory',
        headerName: 'Category',
        width: 120,
        valueGetter: ({ row }) => empCategoryLabel(row.empCategory, row.empCategoryName)
      },
      {
        field: 'branch',
        headerName: 'Branch',
        width: 100,
        valueGetter: ({ row }) => branchName(row.branch)
      },
      {
        field: 'department',
        headerName: 'Department',
        width: 120,
        valueGetter: ({ row }) => departmentName(row.department)
      },
      {
        field: 'isMechanic',
        headerName: 'Mechanic',
        width: 100,
        renderCell: params => (
          <CustomChip
            size='small'
            skin='light'
            color={params.row.isMechanic === 'Y' ? 'info' : 'secondary'}
            label={params.row.isMechanic === 'Y' ? 'Yes' : params.row.isMechanic === 'N' ? 'No' : '—'}
          />
        )
      },
      {
        field: 'recordStatus',
        headerName: 'Status',
        width: 120,
        renderCell: params => (
          <CustomChip
            size='small'
            skin='light'
            color={params.row.recordStatus === 'A' ? 'success' : 'warning'}
            label={
              params.row.recordStatus === 'A'
                ? 'Activated'
                : params.row.recordStatus === 'D' || params.row.recordStatus === 'I'
                  ? 'Deactivated'
                  : params.row.recordStatus || '—'
            }
          />
        )
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: params => {
          if (!canUpdate) return null
          const row = params.row

          const actions = [
            { key: 'edit', label: 'Edit', onClick: () => openEdit(row) },
            {
              key: row.recordStatus === 'A' ? 'cancel' : 'reopen',
              label: row.recordStatus === 'A' ? 'Deactivate' : 'Activate',
              onClick: () => setStatusTarget(row)
            }
          ]

          return <TableRowActions actions={actions} />
        }
      }
    ],
    [branchName, departmentName, positionName, empCategoryLabel, canUpdate]
  )

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>SAP Employees</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Filter then Search to load employees from SAP. Position comes from EmployeePosition; status A/D.
            </Typography>
          }
        />
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-end', mb: 4 }}>
              <CustomTextField
                label='Search name / NIK'
                value={qDraft}
                onChange={event => setQDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') handleSearch()
                }}
                sx={{ minWidth: 200 }}
              />
              <Box sx={{ minWidth: 160 }}>
                <SearchableSelect
                  label='Branch'
                  value={branchFilter}
                  onChange={event => setBranchFilter(event.target.value)}
                  options={[{ value: FILTER_ALL, label: 'All branches' }, ...branchOptions]}
                  disabled={metaLoading}
                />
              </Box>
              <Box sx={{ minWidth: 160 }}>
                <SearchableSelect
                  label='Department'
                  value={departmentFilter}
                  onChange={event => setDepartmentFilter(event.target.value)}
                  options={[{ value: FILTER_ALL, label: 'All departments' }, ...departmentOptions]}
                  disabled={metaLoading}
                />
              </Box>
              <Box sx={{ minWidth: 200 }}>
                <SearchableSelect
                  label='Position'
                  value={positionFilter}
                  onChange={event => setPositionFilter(event.target.value)}
                  options={[{ value: FILTER_ALL, label: 'All positions' }, ...positionOptions]}
                  disabled={metaLoading}
                />
              </Box>
              <Box sx={{ minWidth: 150 }}>
                <SearchableSelect
                  label='Category'
                  value={empCategoryFilter}
                  onChange={event => setEmpCategoryFilter(event.target.value)}
                  options={[{ value: FILTER_ALL, label: 'All categories' }, ...empCategoryOptions]}
                  disabled={metaLoading}
                />
              </Box>
              <Box sx={{ minWidth: 140 }}>
                <SearchableSelect
                  label='Status'
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value)}
                  options={[{ value: FILTER_ALL, label: 'All statuses' }, ...STATUS_OPTIONS]}
                />
              </Box>
              <Box sx={{ minWidth: 180 }}>
                <SearchableSelect
                  label='Mechanic'
                  value={mechanicFilter}
                  onChange={event => setMechanicFilter(event.target.value)}
                  options={[{ value: FILTER_ALL, label: 'All' }, ...MECHANIC_OPTIONS]}
                />
              </Box>
              <Button
                variant='contained'
                startIcon={<Icon icon='tabler:search' />}
                disabled={loading || metaLoading}
                onClick={handleSearch}
              >
                {loading ? 'Loading…' : 'Search'}
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant='outlined'
                color='secondary'
                startIcon={<Icon icon='tabler:download' />}
                disabled={exporting || !searched}
                onClick={handleExport}
              >
                {exporting ? 'Exporting…' : 'Export'}
              </Button>
              <Button
                variant='outlined'
                color='secondary'
                startIcon={<Icon icon='tabler:file-spreadsheet' />}
                onClick={handleTemplate}
              >
                Template
              </Button>
              {canImport ? (
                <>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    hidden
                    onChange={handleImport}
                  />
                  <Button
                    variant='outlined'
                    startIcon={<Icon icon='tabler:upload' />}
                    disabled={importing}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {importing ? 'Importing…' : 'Import'}
                  </Button>
                </>
              ) : null}
              {canCreate ? (
                <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={openCreate}>
                  Add employee
                </Button>
              ) : null}
            </Box>

            {!searched && !loading ? (
              <Typography sx={{ color: 'text.secondary', py: 6, textAlign: 'center' }}>
                No data yet — choose filters and click Search.
              </Typography>
            ) : (
              <DataGrid
                autoHeight
                rows={rows}
                columns={columns}
                getRowId={row => row.employeeId}
                loading={loading}
                disableRowSelectionOnClick
                hideFooterSelectedRowCount
                pageSizeOptions={[10, 25, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                sx={{ '& .MuiDataGrid-columnHeaders': { borderRadius: 0 } }}
              />
            )}
          </CardContent>
        </Card>
      </Grid>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth='sm'>
        <DialogTitle>{editing ? `Edit employee #${editing.employeeId}` : 'Add SAP employee'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 4 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={4}>
              <CustomTextField
                fullWidth
                required
                label='First name'
                value={form.firstName}
                onChange={event => setForm(prev => ({ ...prev, firstName: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <CustomTextField
                fullWidth
                label='Middle name'
                value={form.middleName}
                onChange={event => setForm(prev => ({ ...prev, middleName: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <CustomTextField
                fullWidth
                label='Last name'
                value={form.lastName}
                onChange={event => setForm(prev => ({ ...prev, lastName: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField
                fullWidth
                required
                label='NIK'
                helperText='Stored as U_MIS_NIK — used on service calls'
                value={form.nik}
                onChange={event => setForm(prev => ({ ...prev, nik: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField
                fullWidth
                label='Job title'
                value={form.jobTitle}
                onChange={event => setForm(prev => ({ ...prev, jobTitle: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Position'
                value={form.position}
                onChange={event => setForm(prev => ({ ...prev, position: event.target.value }))}
                options={[{ value: '', label: '— none —' }, ...positionOptions]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Employee category'
                value={form.empCategory}
                onChange={event => setForm(prev => ({ ...prev, empCategory: event.target.value }))}
                options={[{ value: '', label: '— none —' }, ...empCategoryOptions]}
                helperText='U_MIS_EmpCategory — Site (ST) / Head Office (HO)'
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Branch (project)'
                value={form.branch}
                onChange={event => setForm(prev => ({ ...prev, branch: event.target.value }))}
                options={[{ value: '', label: '— none —' }, ...branchOptions]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Department'
                value={form.department}
                onChange={event => setForm(prev => ({ ...prev, department: event.target.value }))}
                options={[{ value: '', label: '— none —' }, ...departmentOptions]}
                helperText='Plant for mechanics, Production for operators'
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Is mechanic'
                value={form.isMechanic}
                onChange={event => setForm(prev => ({ ...prev, isMechanic: event.target.value }))}
                options={MECHANIC_OPTIONS}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Status'
                value={form.recordStatus}
                onChange={event => setForm(prev => ({ ...prev, recordStatus: event.target.value }))}
                options={STATUS_OPTIONS}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 5, pb: 4 }}>
          <Button color='secondary' disabled={saving} onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant='contained'
            disabled={saving || !form.firstName.trim() || !form.nik.trim()}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save to SAP'}
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => !statusBusy && setStatusTarget(null)}
        onConfirm={handleStatusConfirm}
        loading={statusBusy}
        title={statusTarget?.recordStatus === 'A' ? 'Deactivate employee?' : 'Activate employee?'}
        message={
          statusTarget
            ? `${statusTarget.displayName} (NIK ${statusTarget.nik || '—'}) will be set to ${
                statusTarget.recordStatus === 'A' ? 'Deactivated (D)' : 'Activated (A)'
              } in SAP. This does not delete the employee.`
            : ''
        }
        confirmLabel={statusTarget?.recordStatus === 'A' ? 'Deactivate' : 'Activate'}
        confirmColor={statusTarget?.recordStatus === 'A' ? 'warning' : 'success'}
      />

      <Dialog open={Boolean(importResult)} onClose={() => setImportResult(null)} fullWidth maxWidth='sm'>
        <DialogTitle>Import result</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 4 }}>
          <Typography sx={{ mb: 2 }}>
            Created {importResult?.created ?? 0}, updated {importResult?.updated ?? 0}
            {(importResult?.errors?.length ?? 0) > 0 ? `, errors ${importResult.errors.length}` : ''}.
          </Typography>
          {(importResult?.errors?.length ?? 0) > 0 ? (
            <List dense sx={{ maxHeight: 280, overflow: 'auto', bgcolor: 'action.hover', borderRadius: 1 }}>
              {importResult.errors.slice(0, 50).map((error, index) => (
                <ListItem key={`${error.row}-${error.column}-${index}`} alignItems='flex-start'>
                  <ListItemText
                    primary={`Row ${error.row}${error.column ? ` · ${error.column}` : ''}`}
                    secondary={error.message}
                  />
                </ListItem>
              ))}
            </List>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 5, pb: 4 }}>
          <Button variant='contained' onClick={() => setImportResult(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default SapEmployeesPage
