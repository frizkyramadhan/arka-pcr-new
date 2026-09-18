/**
 * Replacement Actual — global WO list; view opens unit replacement detail.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/router'

import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

import PageHeader from 'src/@core/components/page-header'

import arkaApi from 'src/utils/arka-api'
import { planPeriodFromMonthInput } from 'src/utils/forecast-plan-period'

import useServerDataGrid from 'src/hooks/useServerDataGrid'

import ReplacementActualTableHeader from 'src/views/pcr/replacements/ReplacementActualTableHeader'
import { buildReplacementActualGridColumns } from 'src/views/pcr/replacements/replacementActualGridColumns'

const ReplacementsActualPage = () => {
  const router = useRouter()
  const [projects, setProjects] = useState([])

  const [filters, setFilters] = useState({
    modelName: '',
    unitNo: '',
    compDesc: '',
    repMonth: '',
    projectCode: '',
    status: 'OPEN'
  })

  const filterParams = useMemo(() => {
    const params = {}
    if (filters.modelName) params.modelName = filters.modelName
    if (filters.unitNo) params.unitNo = filters.unitNo
    if (filters.compDesc) params.compDesc = filters.compDesc
    if (filters.projectCode) params.projectCode = filters.projectCode
    if (filters.status) params.status = filters.status
    if (filters.repMonth) {
      const repDate = planPeriodFromMonthInput(filters.repMonth)
      if (repDate) params.repDate = repDate
    }

    return params
  }, [filters])

  const { serverGridProps } = useServerDataGrid({
    apiPath: '/replacements',
    filterParams,
    defaultSortField: 'repDate',
    defaultSortOrder: 'desc'
  })

  useEffect(() => {
    arkaApi
      .get('/fleet/projects')
      .then(res => setProjects(Array.isArray(res.data) ? res.data : []))
      .catch(() => setProjects([]))
  }, [])

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleView = useCallback(
    row => {
      const fleetUnitId = row.fleetUnitId ?? row.unit?.fleetUnitId
      if (!fleetUnitId || !row.idMod) return

      router.push(`/units/${fleetUnitId}/replacements/${row.idMod}`)
    },
    [router]
  )

  const columns = useMemo(() => buildReplacementActualGridColumns({ onView: handleView }), [handleView])

  const showProjectFilter = projects.length > 1

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>PCR Actual</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Work order replacements across units — view opens the same detail as Units → Replacements
            </Typography>
          }
        />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <ReplacementActualTableHeader
            filters={filters}
            onFilterChange={handleFilterChange}
            projects={projects}
            showProjectFilter={showProjectFilter}
          />
          <DataGrid
            autoHeight
            columns={columns}
            getRowId={row => row.idRep}
            disableRowSelectionOnClick
            sx={{ '& .MuiDataGrid-columnHeaders': { borderRadius: 0 } }}
            {...serverGridProps}
          />
        </Card>
      </Grid>
    </Grid>
  )
}

ReplacementsActualPage.authGuard = true

export default ReplacementsActualPage
