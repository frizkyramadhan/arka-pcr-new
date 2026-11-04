/**
 * Summary Breakdown — every ACTIVE unit in the chosen site (project).
 * Filters aligned with DMBD: Site, Plant (type), Plant group, Status (RFU/BD).
 * ETA RFU (date) and ETA RFU IF PART SUPPLIED (days) are edited on open BD rows.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import PageHeader from 'src/@core/components/page-header'

import useReportPage from 'src/hooks/useReportPage'
import { downloadExport } from 'src/utils/export-download'

import BreakdownReportBoard from 'src/views/pcr/reports/BreakdownReportBoard'

/** DMBD-style labeled filter field. */
const Field = ({ label, children, sx }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 160, flex: '1 1 160px', ...sx }}>
    <Typography
      variant='caption'
      sx={{ mb: 1, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}
    >
      {label}
    </Typography>
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>{children}</Box>
  </Box>
)

const uniqueSorted = values =>
  [...new Set(values.map(item => String(item || '').trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  )

const BreakdownReportPage = () => {
  const router = useRouter()
  const [status, setStatus] = useState('')
  const [plantType, setPlantType] = useState('')
  const [plantGroup, setPlantGroup] = useState('')

  const domainFilterParams = useMemo(() => {
    const params = {}
    if (status) params.status = status
    if (plantType) params.plantType = plantType
    if (plantGroup) params.plantGroup = plantGroup

    return params
  }, [plantGroup, plantType, status])

  const {
    projects,
    equipments,
    search,
    setSearch,
    projectCode,
    setProjectCode,
    fleetUnitId,
    setFleetUnitId,
    showProjectFilter,
    serverGridProps,
    exportParams,
    reload
  } = useReportPage({
    apiPath: '/reports/breakdown-board',
    filterParams: domainFilterParams,
    defaultSortField: null
  })

  const plantTypeOptions = useMemo(
    () => uniqueSorted((equipments || []).map(unit => unit.plant_type || unit.plantType)),
    [equipments]
  )

  const plantGroupOptions = useMemo(() => {
    const scoped = (equipments || []).filter(unit => {
      if (!plantType) return true
      const type = String(unit.plant_type || unit.plantType || '').trim()

      return type === plantType
    })

    return uniqueSorted(scoped.map(unit => unit.plant_group || unit.plantGroup))
  }, [equipments, plantType])

  const handleSiteChange = useCallback(
    value => {
      setProjectCode(value)
      setPlantType('')
      setPlantGroup('')
      setFleetUnitId('')
    },
    [setFleetUnitId, setProjectCode]
  )

  const handlePlantChange = useCallback(value => {
    setPlantType(value)
    setPlantGroup('')
  }, [])

  useEffect(() => {
    if (!router.isReady || projectCode) return
    const fromQuery = typeof router.query.projectCode === 'string' ? router.query.projectCode.trim() : ''
    if (fromQuery) {
      setProjectCode(fromQuery)

      return
    }
    if (projects.length !== 1) return
    const only = projects[0]?.project_code
    if (only) setProjectCode(String(only))
  }, [projectCode, projects, router.isReady, router.query.projectCode, setProjectCode])

  useEffect(() => {
    if (!plantType) return
    if (!plantTypeOptions.includes(plantType)) setPlantType('')
  }, [plantType, plantTypeOptions])

  useEffect(() => {
    if (!plantGroup) return
    if (!plantGroupOptions.includes(plantGroup)) setPlantGroup('')
  }, [plantGroup, plantGroupOptions])

  const handleExport = useCallback(async () => {
    if (!projectCode) {
      toast.error('Choose a site')

      return
    }
    try {
      await downloadExport('breakdowns', exportParams, 'breakdown-summary.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }, [exportParams, projectCode])

  const handleRefresh = useCallback(() => {
    if (!projectCode) {
      toast.error('Choose a site')

      return
    }
    reload()
  }, [projectCode, reload])

  const handleReset = useCallback(() => {
    setSearch('')
    setPlantType('')
    setPlantGroup('')
    setStatus('')
    setFleetUnitId('')
    if (projects.length !== 1) setProjectCode('')
  }, [projects.length, setFleetUnitId, setProjectCode, setSearch])

  const boardRows = projectCode ? serverGridProps.rows || [] : []

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Summary Breakdown</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Populasi unit ACTIVE per site. Filter sama seperti DMBD (Site, Plant, Plant group, Status). ETA RFU
              (tanggal) dan ETA RFU IF PART SUPPLIED (estimasi hari) bisa diedit pada baris BD; Edit BD membuka form di
              modal.
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-end' }}>
              <Field label='Search' sx={{ flex: '1 1 220px', minWidth: 200 }}>
                <CustomTextField
                  fullWidth
                  size='small'
                  placeholder='Unit, model, problem, WO…'
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1.5, display: 'flex', color: 'text.secondary' }}>
                        <Icon fontSize='1.125rem' icon='tabler:search' />
                      </Box>
                    )
                  }}
                />
              </Field>
              {showProjectFilter ? (
                <Field label='Site'>
                  <SearchableSelect
                    size='small'
                    value={projectCode}
                    onChange={event => handleSiteChange(event.target.value)}
                    placeholder='Search site…'
                    options={[
                      { value: '', label: 'All Site' },
                      ...projects.map(project => ({
                        value: project.project_code,
                        label: `${project.project_code}${project.bowheer ? ` — ${project.bowheer}` : ''}`
                      }))
                    ]}
                  />
                </Field>
              ) : null}
              <Field label='Plant'>
                <SearchableSelect
                  size='small'
                  value={plantType}
                  onChange={event => handlePlantChange(event.target.value || '')}
                  options={[
                    { value: '', label: 'All Plant' },
                    ...plantTypeOptions.map(item => ({ value: item, label: item }))
                  ]}
                />
              </Field>
              <Field label='Plant group'>
                <SearchableSelect
                  size='small'
                  value={plantGroup}
                  onChange={event => setPlantGroup(event.target.value || '')}
                  options={[
                    { value: '', label: 'All Plant group' },
                    ...plantGroupOptions.map(item => ({ value: item, label: item }))
                  ]}
                />
              </Field>
              <Field label='Status'>
                <SearchableSelect
                  size='small'
                  value={status}
                  onChange={event => setStatus(event.target.value || '')}
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'bd', label: 'BD' },
                    { value: 'rfu', label: 'RFU' }
                  ]}
                />
              </Field>
              <Field label='Unit'>
                <SearchableSelect
                  size='small'
                  value={fleetUnitId}
                  onChange={event => setFleetUnitId(event.target.value)}
                  placeholder='Search unit…'
                  options={[
                    { value: '', label: 'All units' },
                    ...equipments.map(unit => ({
                      value: String(unit.id),
                      label: `${unit.unit_no}${unit.description ? ` — ${unit.description}` : ''}`
                    }))
                  ]}
                />
              </Field>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end', pb: 0.25 }}>
                <Button
                  variant='tonal'
                  color='secondary'
                  startIcon={<Icon icon='tabler:refresh' />}
                  onClick={handleRefresh}
                  disabled={serverGridProps.loading}
                >
                  Refresh
                </Button>
                <Button variant='tonal' color='secondary' startIcon={<Icon icon='tabler:rotate' />} onClick={handleReset}>
                  Reset
                </Button>
                <Button variant='contained' startIcon={<Icon icon='tabler:download' />} onClick={handleExport}>
                  Export
                </Button>
              </Box>
            </Box>
          </CardContent>
          {!projectCode ? (
            <Alert severity='info' sx={{ mx: 5, mb: 5 }}>
              Pilih site untuk menampilkan seluruh populasi unit.
            </Alert>
          ) : null}
          {projectCode && !serverGridProps.loading && boardRows.length === 0 ? (
            <Alert severity='warning' sx={{ mx: 5, mb: 5 }}>
              Tidak ada unit ACTIVE untuk filter ini.
            </Alert>
          ) : null}
          {projectCode ? (
            <BreakdownReportBoard rows={boardRows} loading={serverGridProps.loading} onReload={reload} />
          ) : null}
        </Card>
      </Grid>
    </Grid>
  )
}

BreakdownReportPage.authGuard = true

export default BreakdownReportPage
