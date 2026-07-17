/**
 * Summary Cannibal BA report — list with project/status/posting month filters.
 * Route: /reports/cannibals
 */
import { useCallback, useMemo, useState } from 'react'

import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import CustomTextField from 'src/@core/components/mui/text-field'
import PageHeader from 'src/@core/components/page-header'

import useReportPage from 'src/hooks/useReportPage'

import { downloadExport } from 'src/utils/export-download'
import { planPeriodFromMonthInput } from 'src/utils/forecast-plan-period'

import ReportDataGrid from 'src/views/pcr/reports/ReportDataGrid'
import ReportTableHeader from 'src/views/pcr/reports/ReportTableHeader'
import { buildCannibalReportColumns, CANNIBAL_REPORT_MIN_WIDTH } from 'src/views/pcr/reports/reportGridColumns'

const STATUS_OPTIONS = [
  '',
  'DRAFT',
  'PENDING_LOGISTICS',
  'SUBMITTED',
  'OPEN',
  'APPROVED',
  'REJECTED',
  'CLOSED',
  'CANCELLED'
]

const CannibalReportPage = () => {
  const [postingMonth, setPostingMonth] = useState('')
  const [status, setStatus] = useState('')

  const domainFilterParams = useMemo(() => {
    const params = {}
    if (status) params.status = status
    if (postingMonth) {
      const postingDate = planPeriodFromMonthInput(postingMonth)
      if (postingDate) params.postingDate = postingDate
    }

    return params
  }, [postingMonth, status])

  const {
    projects,
    equipments,
    componentOptions,
    search,
    setSearch,
    projectCode,
    setProjectCode,
    fleetUnitId,
    setFleetUnitId,
    idMod,
    setIdMod,
    showProjectFilter,
    serverGridProps,
    exportParams
  } = useReportPage({
    apiPath: '/cannibals',
    filterParams: domainFilterParams,
    defaultSortField: 'postingDate',
    defaultSortOrder: 'desc'
  })

  const handleExport = useCallback(async () => {
    try {
      await downloadExport('cannibals', exportParams, 'cannibal-summary.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }, [exportParams])

  const columns = useMemo(() => buildCannibalReportColumns(), [])

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>Summary Cannibal</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Filter by project, unit, posting period, and BA status
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <ReportTableHeader
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder='Search BA no, unit, component, PN, model…'
            showProjectFilter={showProjectFilter}
            projects={projects}
            projectCode={projectCode}
            onProjectChange={setProjectCode}
            equipments={equipments}
            fleetUnitId={fleetUnitId}
            onUnitChange={setFleetUnitId}
            componentOptions={componentOptions}
            idMod={idMod}
            onComponentChange={setIdMod}
            onExport={handleExport}
          >
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                type='month'
                fullWidth
                size='small'
                label='Posting Period'
                value={postingMonth}
                onChange={e => setPostingMonth(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <CustomTextField
                select
                fullWidth
                size='small'
                label='Status'
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map(s => (
                  <MenuItem key={s || 'all'} value={s}>
                    {s || 'All'}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
          </ReportTableHeader>
          <ReportDataGrid
            columns={columns}
            getRowId={row => row.idBa}
            minWidth={CANNIBAL_REPORT_MIN_WIDTH}
            {...serverGridProps}
          />
        </Card>
      </Grid>
    </Grid>
  )
}

CannibalReportPage.authGuard = true

export default CannibalReportPage
