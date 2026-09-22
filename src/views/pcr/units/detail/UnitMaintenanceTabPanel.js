/**
 * Unit detail tab — Maintenance plans (by project) + actuals for selected plan.
 * Layout mirrors arka-fms unit view (plans filter year/month; click plan → actuals).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'

import useCan from 'src/hooks/useCan'
import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate } from 'src/utils/date-format'

import AddMaintenanceActualDialog from 'src/views/apps/maintenance-actual/AddMaintenanceActualDialog'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const UnitMaintenanceTabPanel = ({ fleetId, unit, isActive }) => {
  const { can } = useCan()
  const canCreateActual = can('maintenance-actual.create')
  const now = useMemo(() => new Date(), [])

  const yearOptions = useMemo(() => {
    const y = now.getFullYear()

    return [y - 2, y - 1, y, y + 1, y + 2]
  }, [now])

  const [planYear, setPlanYear] = useState(now.getFullYear())
  const [planMonth, setPlanMonth] = useState(now.getMonth() + 1)
  const [projectPlans, setProjectPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [unitActuals, setUnitActuals] = useState([])
  const [actualsLoading, setActualsLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const [error, setError] = useState(null)
  const [addOpen, setAddOpen] = useState(false)

  const projectFilter =
    unit?.project_code?.trim?.() ||
    unit?.projectCode?.trim?.() ||
    unit?.projectName?.trim?.() ||
    unit?.projectId?.trim?.() ||
    ''

  const projectLabel = unit?.project_code || unit?.projectCode || unit?.projectName || projectFilter || '—'

  const loadActuals = useCallback(async () => {
    if (!fleetId) return
    setActualsLoading(true)
    setError(null)
    try {
      const res = await arkaApi.get('/maintenance-actuals', {
        params: { fleetUnitId: String(fleetId) }
      })
      const list = res.data?.maintenanceActuals ?? res.data?.data ?? res.data?.allData ?? []
      setUnitActuals(Array.isArray(list) ? list : [])
    } catch (e) {
      setUnitActuals([])
      setError(e?.userMessage || e?.message || 'Failed to load maintenance actuals')
    } finally {
      setActualsLoading(false)
    }
  }, [fleetId])

  useEffect(() => {
    if (!isActive || !fleetId) return
    let cancelled = false

    const run = async () => {
      await loadActuals()
      if (cancelled) return
    }
    run()

    return () => {
      cancelled = true
    }
  }, [isActive, fleetId, loadActuals])

  useEffect(() => {
    if (!isActive) return
    if (!projectFilter) {
      setProjectPlans([])
      setSelectedPlanId(null)

      return
    }

    let cancelled = false

    const loadPlans = async () => {
      setPlansLoading(true)
      setSelectedPlanId(null)
      try {
        const res = await arkaApi.get('/maintenance-plans', {
          params: { projectId: projectFilter, year: planYear, month: planMonth }
        })
        if (cancelled) return
        const list = res.data?.maintenancePlans ?? res.data?.allData ?? []
        setProjectPlans(Array.isArray(list) ? list : [])
      } catch {
        if (!cancelled) setProjectPlans([])
      } finally {
        if (!cancelled) setPlansLoading(false)
      }
    }

    loadPlans()

    return () => {
      cancelled = true
    }
  }, [isActive, projectFilter, planYear, planMonth])

  const actualsForSelectedPlan = useMemo(() => {
    if (!selectedPlanId) return []

    return unitActuals.filter(
      a => a.maintenancePlanId === selectedPlanId || a.planId === selectedPlanId
    )
  }, [unitActuals, selectedPlanId])

  const selectedPlan = useMemo(
    () => projectPlans.find(p => p.id === selectedPlanId),
    [projectPlans, selectedPlanId]
  )

  const planColumns = useMemo(
    () => [
      { flex: 1, minWidth: 140, field: 'maintenanceTypeName', headerName: 'Type' },
      { flex: 0.6, minWidth: 70, field: 'year', headerName: 'Year' },
      {
        flex: 0.6,
        minWidth: 80,
        field: 'month',
        headerName: 'Month',
        renderCell: ({ row }) => MONTH_NAMES[(row.month || 1) - 1] || row.month
      },
      { flex: 0.6, minWidth: 90, field: 'sumPlan', headerName: 'Sum Plan' }
    ],
    []
  )

  const actualColumns = useMemo(
    () => [
      {
        flex: 1,
        minWidth: 120,
        field: 'maintenanceTypeName',
        headerName: 'Type',
        valueGetter: ({ row }) => row.maintenanceTypeName || row.planTypeName || '—'
      },
      {
        flex: 1,
        minWidth: 110,
        field: 'maintenanceDate',
        headerName: 'Date',
        valueFormatter: ({ value }) => formatDisplayDate(value, '—')
      },
      {
        flex: 0.6,
        minWidth: 70,
        field: 'maintenanceTime',
        headerName: 'Time',
        valueFormatter: ({ value }) => value || '—'
      },
      { flex: 0.8, minWidth: 90, field: 'hourMeter', headerName: 'Hour meter' },
      {
        flex: 0.5,
        minWidth: 80,
        sortable: false,
        field: 'actions',
        headerName: '',
        renderCell: ({ row }) => (
          <Tooltip title='View detail'>
            <IconButton
              component={Link}
              href={`/maintenance-actuals/view/${row.id}`}
              size='small'
              sx={{ color: 'text.secondary' }}
            >
              <Icon icon='tabler:eye' />
            </IconButton>
          </Tooltip>
        )
      }
    ],
    []
  )

  if (!isActive) return null

  if (error && !plansLoading && !actualsLoading && unitActuals.length === 0 && projectPlans.length === 0) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color='error'>{error}</Typography>
      </Box>
    )
  }

  const hasProject = Boolean(projectFilter)

  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Card>
        <CardHeader
          title='Maintenance Plans (by project)'
          titleTypographyProps={{ variant: 'h6' }}
          subheader={
            hasProject
              ? `Project: ${projectLabel}. Klik baris untuk lihat actual.`
              : 'Unit ini belum punya project.'
          }
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {canCreateActual ? (
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => setAddOpen(true)}
                >
                  Add Actual
                </Button>
              ) : null}
              <Icon icon='tabler:calendar-event' fontSize={20} style={{ opacity: 0.7 }} />
            </Box>
          }
        />
        <Divider sx={{ m: 0 }} />
        <CardContent>
          {!hasProject ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color='text.secondary'>
                Unit tidak punya project. Tidak ada plan untuk ditampilkan.
              </Typography>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                <CustomTextField
                  select
                  label='Tahun'
                  value={planYear}
                  onChange={e => setPlanYear(Number(e.target.value))}
                  sx={{ minWidth: 100 }}
                >
                  {yearOptions.map(y => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </CustomTextField>
                <CustomTextField
                  select
                  label='Bulan'
                  value={planMonth}
                  onChange={e => setPlanMonth(Number(e.target.value))}
                  sx={{ minWidth: 120 }}
                >
                  {MONTH_NAMES.map((name, i) => (
                    <MenuItem key={name} value={i + 1}>
                      {name}
                    </MenuItem>
                  ))}
                </CustomTextField>
              </Box>
              {plansLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : projectPlans.length > 0 ? (
                <DataGrid
                  autoHeight
                  rowHeight={48}
                  rows={projectPlans}
                  columns={planColumns}
                  getRowId={row => row.id}
                  pageSizeOptions={[5, 10, 25]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                  onRowClick={({ row }) => setSelectedPlanId(prev => (prev === row.id ? null : row.id))}
                  sx={{
                    border: 0,
                    cursor: 'pointer',
                    '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
                    '& .MuiDataGrid-row.Mui-selected': { bgcolor: 'primary.light' },
                    '& .MuiDataGrid-columnHeaders': { minHeight: 44 },
                    '& .MuiDataGrid-cell': { borderBottom: 1, borderColor: 'divider' }
                  }}
                  getRowClassName={params => (params.id === selectedPlanId ? 'Mui-selected' : '')}
                />
              ) : (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Icon icon='tabler:calendar-off' fontSize={48} style={{ opacity: 0.4 }} />
                  <Typography color='text.secondary' sx={{ mt: 2 }}>
                    Tidak ada plan untuk project ini di periode yang dipilih.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title='Maintenance Actuals'
          titleTypographyProps={{ variant: 'h6' }}
          subheader={
            selectedPlanId
              ? selectedPlan
                ? `${selectedPlan.maintenanceTypeName || 'Plan'} — ${MONTH_NAMES[(selectedPlan.month || 1) - 1]} ${selectedPlan.year}. Klik plan di atas untuk ganti.`
                : `${actualsForSelectedPlan.length} record(s)`
              : 'Klik satu baris plan di atas untuk menampilkan record actual.'
          }
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {canCreateActual && selectedPlanId ? (
                <Button
                  variant='tonal'
                  size='small'
                  startIcon={<Icon icon='tabler:plus' />}
                  onClick={() => setAddOpen(true)}
                >
                  Add for plan
                </Button>
              ) : null}
              <Icon icon='tabler:tool' fontSize={20} style={{ opacity: 0.7 }} />
            </Box>
          }
        />
        <Divider sx={{ m: 0 }} />
        <CardContent>
          {actualsLoading && selectedPlanId ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : !selectedPlanId ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Icon icon='tabler:click' fontSize={48} style={{ opacity: 0.4 }} />
              <Typography color='text.secondary' sx={{ mt: 2 }}>
                Pilih satu plan di tabel atas untuk melihat maintenance actual.
              </Typography>
            </Box>
          ) : actualsForSelectedPlan.length > 0 ? (
            <DataGrid
              autoHeight
              rowHeight={48}
              rows={actualsForSelectedPlan}
              columns={actualColumns}
              getRowId={row => row.id}
              disableRowSelectionOnClick
              pageSizeOptions={[5, 10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
              sx={{
                border: 0,
                '& .MuiDataGrid-columnHeaders': { minHeight: 44 },
                '& .MuiDataGrid-cell': { borderBottom: 1, borderColor: 'divider' }
              }}
            />
          ) : (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Icon icon='tabler:tool' fontSize={48} style={{ opacity: 0.4 }} />
              <Typography color='text.secondary' sx={{ mt: 2 }}>
                Belum ada record maintenance actual untuk plan ini (unit ini).
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <AddMaintenanceActualDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        fleetUnitId={fleetId}
        unit={unit}
        presetPlanId={selectedPlanId}
        presetYear={selectedPlan?.year ?? planYear}
        presetMonth={selectedPlan?.month ?? planMonth}
        onSaved={loadActuals}
      />
    </Box>
  )
}

export default UnitMaintenanceTabPanel
