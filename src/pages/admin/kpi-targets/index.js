/**
 * KPI Targets (System menu) — target value and green/yellow/red rule per KPI, per site and program.
 * Site '*' = all projects, Program '*' = all maintenance types. Most specific scope wins on the dashboard;
 * a newer effective date replaces the older one for the same scope.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import PageHeader from 'src/@core/components/page-header'
import { TableCrudActions } from 'src/@core/components/table-row-actions'
import useCan from 'src/hooks/useCan'
import useProjects from 'src/hooks/useProjects'
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'
import { formatDisplayDate } from 'src/utils/date-format'

const ALL_SCOPE = '*'

const DIRECTION_OPTIONS = [
  { value: 'HIGHER', label: 'Higher is better' },
  { value: 'LOWER', label: 'Lower is better' },
  { value: 'COUNT_ZERO', label: 'Count, zero is best' }
]

const EMPTY_FORM = {
  kpiCode: '',
  projectId: ALL_SCOPE,
  maintenanceTypeId: ALL_SCOPE,
  targetValue: '',
  direction: 'HIGHER',
  yellowMargin: '0',
  effectiveFrom: ''
}

const formatNumber = value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })

/** One-line description of when the card turns green / yellow / red. */
const colourRule = ({ direction, targetValue, yellowMargin, unit }) => {
  const suffix = unit === '%' ? '%' : ''
  const value = number => `${formatNumber(number)}${suffix}`
  if (direction === 'HIGHER') {
    return `Green ≥ ${value(targetValue)}, yellow ≥ ${value(targetValue - yellowMargin)}, otherwise red`
  }
  if (direction === 'LOWER') {
    return `Green ≤ ${value(targetValue)}, yellow ≤ ${value(targetValue + yellowMargin)}, otherwise red`
  }

  if (!yellowMargin) return `Green at ${formatNumber(targetValue)}, red above`

  return `Green at ${formatNumber(targetValue)}, yellow up to ${formatNumber(targetValue + yellowMargin)}, red above`
}

const KpiTargetsPage = () => {
  const { can } = useCan()
  const { projects } = useProjects()

  const canCreate = can('kpi-target.create')
  const canEdit = can('kpi-target.update') || can('kpi-target.delete')

  const [rows, setRows] = useState([])
  const [kpis, setKpis] = useState([])
  const [maintenanceTypes, setMaintenanceTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [kpiFilter, setKpiFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    arkaApi
      .get('/kpi-targets', { params: { kpiCode: kpiFilter || undefined, projectId: projectFilter || undefined } })
      .then(res => {
        setRows(res.data?.rows || [])
        setKpis(res.data?.kpis || [])
        setMaintenanceTypes(res.data?.maintenanceTypes || [])
      })
      .catch(error => {
        setRows([])
        notifyApiError(error, 'Failed to load KPI targets', toast.error)
      })
      .finally(() => setLoading(false))
  }, [kpiFilter, projectFilter])

  useEffect(() => {
    load()
  }, [load])

  const kpiOptions = useMemo(() => kpis.map(kpi => ({ value: kpi.code, label: kpi.label })), [kpis])

  const siteOptions = useMemo(
    () => [
      { value: ALL_SCOPE, label: 'All sites' },
      ...(projects || []).map(project => ({ value: project.value, label: project.value }))
    ],
    [projects]
  )

  const programOptions = useMemo(
    () => [{ value: ALL_SCOPE, label: 'All programs' }, ...maintenanceTypes.map(type => ({ value: type.id, label: type.name }))],
    [maintenanceTypes]
  )

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, effectiveFrom: new Date().toISOString().slice(0, 10) })
    setDialogOpen(true)
  }

  const openEdit = useCallback(row => {
    setEditing(row)
    setForm({
      kpiCode: row.kpiCode,
      projectId: row.projectId,
      maintenanceTypeId: row.maintenanceTypeId,
      targetValue: String(row.targetValue),
      direction: row.direction,
      yellowMargin: String(row.yellowMargin),
      effectiveFrom: row.effectiveFrom
    })
    setDialogOpen(true)
  }, [])

  /** Picking a KPI preselects its usual direction (still editable). */
  const handleKpiChange = code => {
    const kpi = kpis.find(item => item.code === code)
    setForm(prev => ({ ...prev, kpiCode: code, direction: kpi?.direction ?? prev.direction }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        await arkaApi.put(`/kpi-targets/${editing.id}`, form)
      } else {
        await arkaApi.post('/kpi-targets', form)
      }
      toast.success('KPI target saved')
      setDialogOpen(false)
      load()
    } catch (error) {
      await notifyApiError(error, 'Failed to save KPI target', toast.error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await arkaApi.delete(`/kpi-targets/${deleteTarget.id}`)
      toast.success('KPI target deleted')
      setDeleteTarget(null)
      load()
    } catch (error) {
      await notifyApiError(error, 'Delete failed', toast.error)
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(
    () => [
      { field: 'kpiLabel', headerName: 'KPI', width: 200 },
      {
        field: 'projectId',
        headerName: 'Site',
        width: 110,
        valueFormatter: ({ value }) => (value === ALL_SCOPE ? 'All' : value)
      },
      {
        field: 'maintenanceTypeName',
        headerName: 'Program',
        width: 170,
        valueGetter: ({ row }) => (row.maintenanceTypeId === ALL_SCOPE ? 'All' : row.maintenanceTypeName || row.maintenanceTypeId)
      },
      {
        field: 'targetValue',
        headerName: 'Target',
        type: 'number',
        width: 110,
        valueGetter: ({ row }) => row.targetValue,
        renderCell: ({ row }) => `${formatNumber(row.targetValue)}${row.unit === '%' ? '%' : ` ${row.unit}`}`
      },
      {
        field: 'direction',
        headerName: 'Direction',
        width: 170,
        renderCell: ({ row }) => (
          <CustomChip
            size='small'
            skin='light'
            color={row.direction === 'HIGHER' ? 'success' : row.direction === 'LOWER' ? 'info' : 'warning'}
            label={DIRECTION_OPTIONS.find(option => option.value === row.direction)?.label ?? row.direction}
          />
        )
      },
      {
        field: 'rule',
        headerName: 'Colour rule',
        flex: 1,
        minWidth: 320,
        sortable: false,
        valueGetter: ({ row }) => colourRule(row)
      },
      {
        field: 'effectiveFrom',
        headerName: 'Effective from',
        width: 140,
        valueFormatter: ({ value }) => formatDisplayDate(value, '—')
      },
      {
        field: 'actions',
        headerName: 'Action',
        width: 90,
        sortable: false,
        renderCell: ({ row }) => (
          <TableCrudActions row={row} canEdit={canEdit} onEdit={openEdit} onDelete={setDeleteTarget} />
        )
      }
    ],
    [canEdit, openEdit]
  )

  const formValid = form.kpiCode && String(form.targetValue).trim() !== '' && form.effectiveFrom
  const formUnit = kpis.find(kpi => kpi.code === form.kpiCode)?.unit

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>KPI Targets</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Targets that colour the maintenance dashboard cards. The most specific site and program wins.
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          {/* Filters: KPI, site */}
          <CardContent>
            <Grid container spacing={4} alignItems='flex-end'>
              <Grid item xs={12} sm={6} md={3}>
                <SearchableSelect
                  label='KPI'
                  value={kpiFilter}
                  onChange={event => setKpiFilter(event.target.value)}
                  placeholder='Search KPI…'
                  options={[{ value: '', label: 'All KPIs' }, ...kpiOptions]}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <SearchableSelect
                  label='Site'
                  value={projectFilter}
                  onChange={event => setProjectFilter(event.target.value)}
                  placeholder='Search site…'
                  options={[{ value: '', label: 'Any site' }, ...siteOptions]}
                />
              </Grid>
              <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                {canCreate && (
                  <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={openAdd}>
                    Add target
                  </Button>
                )}
              </Grid>
            </Grid>
          </CardContent>
          <Divider sx={{ m: '0 !important' }} />
          <DataGrid
            autoHeight
            loading={loading}
            rows={rows}
            columns={columns}
            disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
          />
        </Card>
      </Grid>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>{editing ? 'Edit KPI target' : 'Add KPI target'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={4} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <SearchableSelect
                label='KPI'
                value={form.kpiCode}
                onChange={event => handleKpiChange(event.target.value)}
                placeholder='Search KPI…'
                options={kpiOptions}
                disableClearable
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Site'
                value={form.projectId}
                onChange={event => setForm(prev => ({ ...prev, projectId: event.target.value || ALL_SCOPE }))}
                placeholder='Search site…'
                options={siteOptions}
                disableClearable
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Program'
                value={form.maintenanceTypeId}
                onChange={event => setForm(prev => ({ ...prev, maintenanceTypeId: event.target.value || ALL_SCOPE }))}
                placeholder='Search program…'
                options={programOptions}
                disableClearable
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <SearchableSelect
                label='Direction'
                value={form.direction}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    direction: event.target.value,

                    // Spec section 11: a count KPI turns yellow at one item over target unless the admin says otherwise.
                    yellowMargin:
                      event.target.value === 'COUNT_ZERO' && Number(prev.yellowMargin) === 0 ? '1' : prev.yellowMargin
                  }))
                }
                options={DIRECTION_OPTIONS}
                disableClearable
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField
                fullWidth
                type='date'
                label='Effective from'
                value={form.effectiveFrom}
                onChange={event => setForm(prev => ({ ...prev, effectiveFrom: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField
                fullWidth
                type='number'
                label={formUnit ? `Target (${formUnit})` : 'Target'}
                value={form.targetValue}
                inputProps={{ min: 0, step: 0.1 }}
                onChange={event => setForm(prev => ({ ...prev, targetValue: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CustomTextField
                fullWidth
                type='number'
                label='Yellow margin'
                value={form.yellowMargin}
                inputProps={{ min: 0, step: form.direction === 'COUNT_ZERO' ? 1 : 0.1 }}
                onChange={event => setForm(prev => ({ ...prev, yellowMargin: event.target.value }))}
                helperText={
                  form.direction === 'COUNT_ZERO'
                    ? 'Items over target that are still yellow (0 = red at once)'
                    : 'Same unit as the target'
                }
              />
            </Grid>
          </Grid>
          {formValid && (
            <Typography variant='body2' sx={{ mt: 4, color: 'text.secondary' }}>
              {colourRule({
                direction: form.direction,
                targetValue: Number(form.targetValue),
                yellowMargin: Number(form.yellowMargin) || 0,
                unit: formUnit
              })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' disabled={saving} onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant='contained' disabled={saving || !formValid} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title='Delete KPI target?'
        message={
          deleteTarget
            ? `Delete the ${deleteTarget.kpiLabel} target for ${deleteTarget.projectId === ALL_SCOPE ? 'all sites' : deleteTarget.projectId}? Cards fall back to the next matching target.`
            : ''
        }
        loading={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </Grid>
  )
}

KpiTargetsPage.acl = {
  subject: 'kpi-target',
  action: 'read'
}

export default KpiTargetsPage
