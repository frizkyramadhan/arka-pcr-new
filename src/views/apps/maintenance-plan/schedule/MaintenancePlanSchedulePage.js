/**
 * Monthly maintenance schedule: project, year, month, program,
 * then check a date per active unit. One check is one plan date.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import toast from 'react-hot-toast'

import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'
import { useAuth } from 'src/hooks/useAuth'
import useProjects from 'src/hooks/useProjects'
import arkaApi from 'src/utils/arka-api'

const MONTHS = [
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

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Scheduled = primary, has actual = success, empty = paper. */

const cellKey = (fleetUnitId, iso) => `${fleetUnitId}|${iso}`

const daysInMonth = (year, month) => new Date(year, month, 0).getDate()

const isoFor = (year, month, day) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const headerLabel = (year, month, day) => {
  const dd = String(day).padStart(2, '0')
  const mon = MONTH_SHORT[month - 1]
  const yy = String(year).slice(-2)

  return `${dd}-${mon}-${yy}`
}

const MaintenancePlanSchedulePage = ({ mode = 'add' }) => {
  const router = useRouter()
  const { user } = useAuth()
  const { projects, loading: projectsLoading } = useProjects()
  const readOnly = mode === 'view'

  const [maintenanceTypes, setMaintenanceTypes] = useState([])
  const [projectId, setProjectId] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [maintenanceTypeId, setMaintenanceTypeId] = useState('')
  const [unitQuery, setUnitQuery] = useState('')

  const [units, setUnits] = useState([])
  const [selection, setSelection] = useState(() => new Set())
  const [locked, setLocked] = useState(() => new Set())
  const [generated, setGenerated] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [saving, setSaving] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    arkaApi.get('/maintenance-types').then(res => {
      setMaintenanceTypes(res.data?.allData || res.data?.maintenanceTypes || [])
    })
  }, [])

  useEffect(() => {
    if (!router.isReady || prefilled || mode === 'add') return
    const q = router.query
    if (q.projectId) setProjectId(String(q.projectId))
    if (q.year) setYear(String(q.year))
    if (q.month) setMonth(String(q.month))
    if (q.maintenanceTypeId) setMaintenanceTypeId(String(q.maintenanceTypeId))
    setPrefilled(true)
  }, [router.isReady, router.query, mode, prefilled])

  const yearNum = Number(year)
  const monthNum = Number(month)

  const dates = useMemo(() => {
    if (!Number.isInteger(yearNum) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) return []
    const count = daysInMonth(yearNum, monthNum)

    return Array.from({ length: count }, (_, index) => {
      const day = index + 1
      const date = new Date(yearNum, monthNum - 1, day)

      return {
        day,
        iso: isoFor(yearNum, monthNum, day),
        label: headerLabel(yearNum, monthNum, day),
        weekday: WEEKDAY[date.getDay()],
        weekend: date.getDay() === 0 || date.getDay() === 6
      }
    })
  }, [yearNum, monthNum])

  const criteriaReady = Boolean(projectId && maintenanceTypeId && dates.length)

  const loadGrid = useCallback(async () => {
    if (!criteriaReady) {
      toast.error('Select project, year, month, and maintenance type')
      
return
    }
    setLoadingGrid(true)
    try {
      const [unitRes, planRes] = await Promise.all([
        arkaApi.get('/fleet/units', { params: { projectCode: projectId, status: 'ACTIVE' } }),
        arkaApi.get('/maintenance-plans', {
          params: { projectId, year: yearNum, month: monthNum, maintenanceTypeId, details: '1' }
        })
      ])

      const rows = (unitRes.data?.data ?? [])
        .filter(unit => String(unit.unitstatus || unit.unitStatus || '').replace(/\s+/g, '').toUpperCase() === 'ACTIVE')
        .map(unit => ({
          fleetUnitId: Number(unit.id),
          unitNo: unit.unit_no || unit.code || String(unit.id)
        }))
        .filter(unit => Number.isInteger(unit.fleetUnitId))
        .sort((a, b) => a.unitNo.localeCompare(b.unitNo, undefined, { numeric: true }))
      const activeIds = new Set(rows.map(unit => unit.fleetUnitId))

      const nextSelected = new Set()
      const nextLocked = new Set()
      for (const plan of planRes.data?.maintenancePlans || []) {
        for (const detail of plan.details || []) {
          if (!activeIds.has(Number(detail.fleetUnitId)) || !detail.planDate) continue
          const key = cellKey(detail.fleetUnitId, detail.planDate)
          nextSelected.add(key)
          if (detail.hasActual) nextLocked.add(key)
        }
      }
      setUnits(rows)
      setSelection(nextSelected)
      setLocked(nextLocked)
      setGenerated(true)
      setUnitQuery('')
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to load units')
    } finally {
      setLoadingGrid(false)
    }
  }, [criteriaReady, projectId, yearNum, monthNum, maintenanceTypeId])

  useEffect(() => {
    if (mode === 'add' || !prefilled || !criteriaReady || generated) return
    loadGrid()
  }, [mode, prefilled, criteriaReady, generated, loadGrid])

  const visibleUnits = useMemo(() => {
    const query = unitQuery.trim().toLowerCase()
    if (!query) return units

    return units.filter(unit => unit.unitNo.toLowerCase().includes(query))
  }, [units, unitQuery])

  const selectedCount = selection.size

  const toggleCell = (fleetUnitId, iso) => {
    if (readOnly) return
    const key = cellKey(fleetUnitId, iso)
    if (locked.has(key)) {
      toast.error('This date already has an actual')
      
return
    }
    setSelection(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)

      return next
    })
  }

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('You must be logged in')
      
return
    }
    setSaving(true)
    try {
      const cells = []
      selection.forEach(key => {
        const splitAt = key.indexOf('|')
        cells.push({
          fleetUnitId: Number(key.slice(0, splitAt)),
          planDate: key.slice(splitAt + 1)
        })
      })

      const { data } = await arkaApi.post('/maintenance-plans/schedule', {
        projectId,
        year: yearNum,
        month: monthNum,
        maintenanceTypeId,
        cells,
        unitIds: units.map(unit => unit.fleetUnitId),
        createdById: user.id
      })
      toast.success(`${data.created || 0} added, ${data.deleted || 0} removed, ${data.kept || 0} unchanged`)
      router.push('/maintenance-plans')
    } catch (err) {
      const lockedCells = err?.response?.data?.locked
      if (Array.isArray(lockedCells) && lockedCells.length) {
        const nextLocked = new Set(locked)
        setSelection(prev => {
          const next = new Set(prev)
          lockedCells.forEach(cell => {
            const key = cellKey(cell.fleetUnitId, cell.planDate)
            next.add(key)
            nextLocked.add(key)
          })

          return next
        })
        setLocked(nextLocked)
      }
      toast.error(err?.response?.data?.error || err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const title = mode === 'view' ? 'Detail Maintenance Plan' : mode === 'edit' ? 'Edit Maintenance Plan' : 'Add Maintenance Plan'
  const programName = maintenanceTypes.find(type => type.id === maintenanceTypeId)?.name

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2 }}>
          <Box sx={{ minWidth: 0, '& > .MuiGrid-item': { width: 'auto', maxWidth: '100%', flexBasis: 'auto' } }}>
          <PageHeader
            title={<Typography variant='h4'>{title}</Typography>}
            subtitle={
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                Check a date to schedule this program for an active unit in the selected month.
              </Typography>
            }
          />
          </Box>
          <Button component={Link} href='/maintenance-plans' variant='tonal' color='secondary' startIcon={<Icon icon='tabler:arrow-left' />} sx={{ flexShrink: 0 }}>
            Back
          </Button>
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader title='Period' />
          <CardContent>
            <Grid container spacing={4} alignItems='flex-end'>
              <Grid item xs={12} sm={6} md={3}>
                <SearchableSelect
                  label='Project'
                  value={projectId}
                  disabled={projectsLoading || readOnly}
                  disableClearable
                  onChange={e => {
                    setProjectId(e.target.value)
                    setGenerated(false)
                  }}
                  placeholder='Search project…'
                  options={(projects || []).map(project => ({ value: project.value, label: project.value }))}
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <CustomTextField
                  fullWidth
                  type='number'
                  label='Year'
                  value={year}
                  disabled={readOnly}
                  onChange={e => {
                    setYear(e.target.value)
                    setGenerated(false)
                  }}
                  inputProps={{ min: 2000, max: 2100 }}
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <SearchableSelect
                  label='Month'
                  value={month}
                  disabled={readOnly}
                  disableClearable
                  onChange={e => {
                    setMonth(e.target.value)
                    setGenerated(false)
                  }}
                  placeholder='Search month…'
                  options={MONTHS.map(item => ({ value: String(item.value), label: item.label }))}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <SearchableSelect
                  label='Maintenance Type'
                  value={maintenanceTypeId}
                  disabled={readOnly}
                  disableClearable
                  onChange={e => {
                    setMaintenanceTypeId(e.target.value)
                    setGenerated(false)
                  }}
                  placeholder='Search program…'
                  options={maintenanceTypes.map(type => ({ value: type.id, label: type.name }))}
                />
              </Grid>
              {!readOnly && (
                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    fullWidth
                    variant='contained'
                    disabled={!criteriaReady || loadingGrid}
                    startIcon={loadingGrid ? <CircularProgress size={16} color='inherit' /> : <Icon icon='tabler:layout-grid' />}
                    onClick={loadGrid}
                  >
                    Generate
                  </Button>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {generated && (
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title={programName || 'Schedule'}
              subheader={`${units.length} active units · ${selectedCount} dates selected`}
              action={
                <CustomTextField
                  size='small'
                  placeholder='Search unit'
                  value={unitQuery}
                  onChange={e => setUnitQuery(e.target.value)}
                  sx={{ minWidth: 180 }}
                />
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {loadingGrid ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress />
                </Box>
              ) : (
              <>
              <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                <Legend swatch='primary.main' label='Scheduled' />
                <Legend swatch='success.main' label='Has actual' />
                <Legend swatch='background.paper' label='Empty' bordered />
              </Box>
              {units.length === 0 ? (
                <Alert severity='info'>No active units in this project.</Alert>
              ) : (
                <Box sx={{ overflow: 'auto', maxHeight: '70vh', border: theme => `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                  <Box component='table' sx={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: '100%' }}>
                    <Box component='thead'>
                      <Box component='tr'>
                        <Box
                          component='th'
                          sx={{
                            position: 'sticky',
                            left: 0,
                            top: 0,
                            zIndex: 4,
                            minWidth: 120,
                            px: 3,
                            py: 2,
                            textAlign: 'left',
                            bgcolor: 'background.paper',
                            borderBottom: theme => `1px solid ${theme.palette.divider}`,
                            borderRight: theme => `1px solid ${theme.palette.divider}`
                          }}
                        >
                          <Typography variant='caption' sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
                            UNIT NO
                          </Typography>
                        </Box>
                        {dates.map(date => (
                          <Box
                            component='th'
                            key={date.iso}
                            sx={{
                              position: 'sticky',
                              top: 0,
                              zIndex: 3,
                              minWidth: 78,
                              px: 1,
                              py: 1.5,
                              textAlign: 'center',
                              bgcolor: date.weekend ? 'action.hover' : 'background.paper',
                              borderBottom: theme => `1px solid ${theme.palette.divider}`,
                              borderRight: theme => `1px solid ${theme.palette.divider}`
                            }}
                          >
                            <Typography variant='caption' sx={{ fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
                              {date.label}
                            </Typography>
                            <Typography variant='caption' color='text.secondary' sx={{ fontSize: '0.65rem' }}>
                              {date.weekday}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Box component='tbody'>
                      {visibleUnits.map(unit => (
                        <Box component='tr' key={unit.fleetUnitId}>
                          <Box
                            component='td'
                            sx={{
                              position: 'sticky',
                              left: 0,
                              zIndex: 2,
                              px: 3,
                              py: 1.5,
                              bgcolor: 'background.paper',
                              borderBottom: theme => `1px solid ${theme.palette.divider}`,
                              borderRight: theme => `1px solid ${theme.palette.divider}`
                            }}
                          >
                            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                              {unit.unitNo}
                            </Typography>
                          </Box>
                          {dates.map(date => {
                            const key = cellKey(unit.fleetUnitId, date.iso)
                            const checked = selection.has(key)
                            const isLocked = locked.has(key)

                            return (
                              <Box
                                component='td'
                                key={date.iso}
                                sx={{
                                  px: 1,
                                  py: 1,
                                  textAlign: 'center',
                                  bgcolor: date.weekend && !checked ? 'action.hover' : 'transparent',
                                  borderBottom: theme => `1px solid ${theme.palette.divider}`,
                                  borderRight: theme => `1px solid ${theme.palette.divider}`
                                }}
                              >
                                <DateCheck
                                  checked={checked}
                                  locked={isLocked}
                                  readOnly={readOnly}
                                  label={`${unit.unitNo} ${date.label}`}
                                  onToggle={() => toggleCell(unit.fleetUnitId, date.iso)}
                                />
                              </Box>
                            )
                          })}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}

              {!readOnly && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 3, mt: 4 }}>
                  <Button component={Link} href='/maintenance-plans' variant='tonal' color='secondary'>
                    Cancel
                  </Button>
                  <Button variant='contained' disabled={saving || units.length === 0} onClick={handleSave}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </Box>
              )}
              {readOnly && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                  <Button
                    component={Link}
                    href={`/maintenance-plans/edit?projectId=${encodeURIComponent(projectId)}&year=${yearNum}&month=${monthNum}&maintenanceTypeId=${encodeURIComponent(maintenanceTypeId)}`}
                    variant='contained'
                    startIcon={<Icon icon='tabler:edit' />}
                  >
                    Edit
                  </Button>
                </Box>
              )}
              </>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

const Legend = ({ swatch, label, bordered = false }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <Box
      sx={{
        width: 28,
        height: 16,
        borderRadius: 0.75,
        bgcolor: swatch,
        border: '1px solid',
        borderColor: bordered ? 'divider' : swatch
      }}
    />
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
  </Box>
)

const DateCheck = ({ checked, locked, readOnly, label, onToggle }) => {
  const bg = locked ? 'success.main' : checked ? 'primary.main' : 'background.paper'
  const edge = locked ? 'success.dark' : checked ? 'primary.dark' : 'divider'
  const iconColor = checked || locked ? 'common.white' : 'transparent'

  return (
    <Tooltip title={locked ? 'Has actual' : checked ? 'Scheduled' : 'Empty'}>
      <span>
      <Box
        component='button'
        type='button'
        role='checkbox'
        aria-checked={checked}
        aria-label={label}
        disabled={readOnly}
        onClick={onToggle}
        sx={{
          width: 46,
          height: 28,
          p: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          border: '1px solid',
          borderColor: edge,
          bgcolor: bg,
          color: iconColor,
          cursor: readOnly ? 'default' : 'pointer',
          transition: 'background-color 0.15s ease, transform 0.15s ease',
          '&:hover': readOnly
            ? {}
            : {
                bgcolor: checked || locked ? bg : 'action.selected',
                transform: 'translateY(-1px)'
              },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: 2
          },
          '&:disabled': { opacity: 1 }
        }}
      >
        {checked ? <Icon icon={locked ? 'tabler:lock' : 'tabler:check'} fontSize='1rem' /> : null}
      </Box>
      </span>
    </Tooltip>
  )
}

export default MaintenancePlanSchedulePage
