/**
 * Condition tab — aggregated component condition per unit with legend and source ratings.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'

import arkaApi from 'src/utils/arka-api'
import { apiPath } from 'src/utils/base-path'

import useCan from 'src/hooks/useCan'
import useUnitTabSearch from 'src/hooks/useUnitTabSearch'

import ConditionLegend from 'src/views/pcr/condition/ConditionLegend'
import OverallConditionChip from 'src/views/pcr/condition/OverallConditionChip'
import { buildConditionGridColumns } from 'src/views/pcr/condition/conditionGridColumns'
import UnitTabPanelShell from 'src/views/pcr/units/detail/UnitTabPanelShell'

function resolveRowId(row) {
  const id = row.idCondition ?? row.id_condition
  if (id != null) return String(id)

  return `${row.fleetUnitId ?? ''}-${row.idMod ?? ''}`
}

const UnitConditionTabPanel = ({ fleetId, isActive }) => {
  const { can } = useCan()
  const canRecompute = can('conditions.create')

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const [rows, setRows] = useState([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [recomputing, setRecomputing] = useState(false)
  const { searchInput, setSearchInput, search } = useUnitTabSearch()

  useEffect(() => {
    setPaginationModel(prev => ({ ...prev, page: 0 }))
  }, [search])

  const fetchData = useCallback(async () => {
    if (!fleetId || !isActive) return

    setLoading(true)
    setDataReady(false)

    try {
      const { page, pageSize } = paginationModel

      const params = {
        fleetUnitId: fleetId,
        page,
        pageSize,
        sortField: 'compDesc',
        sortOrder: 'asc'
      }
      if (search) params.search = search

      const { data } = await arkaApi.get('/conditions', { params })

      const payload = data?.rows ? data : { rows: Array.isArray(data) ? data : [], total: 0 }
      setRows(payload.rows)
      setRowCount(payload.total ?? payload.rows.length)
      setDataReady(true)
    } catch {
      setRows([])
      setRowCount(0)
      setDataReady(true)
      toast.error('Failed to load condition data')
    } finally {
      setLoading(false)
    }
  }, [fleetId, isActive, paginationModel, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRecompute = async () => {
    setRecomputing(true)
    try {
      const { data } = await arkaApi.post('/conditions', { fleetUnitId: Number(fleetId) })
      toast.success(`Recomputed ${data.recomputed ?? 0} component(s)`)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Recompute failed')
    } finally {
      setRecomputing(false)
    }
  }

  const summary = useMemo(() => {
    const counts = { NORMAL: 0, ATTENTION: 0, CRITICAL: 0 }

    for (const row of rows) {
      const key = String(row.condition ?? '').toUpperCase()
      if (key === 'GOOD') counts.NORMAL += 1
      else if (key === 'MONITOR') counts.ATTENTION += 1
      else if (key in counts) counts[key] += 1
    }

    return counts
  }, [rows])

  const columns = useMemo(() => buildConditionGridColumns({ compact: false }), [])

  const toolbarExtra = canRecompute ? (
    <Button
      variant='contained'
      startIcon={<Icon icon='tabler:refresh' />}
      onClick={handleRecompute}
      disabled={recomputing}
    >
      Recompute
    </Button>
  ) : null

  return (
    <Box>
      <Box sx={{ px: { xs: 4, sm: 5 }, pt: 4, pb: 2 }}>
        <ConditionLegend compact />
        {dataReady && rows.length > 0 ? (
          <Stack direction='row' spacing={2} sx={{ mt: 2, flexWrap: 'wrap' }} alignItems='center'>
            <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Halaman ini:
            </Typography>
            <OverallConditionChip condition='NORMAL' size='small' />
            <Typography variant='caption'>{summary.NORMAL}</Typography>
            <OverallConditionChip condition='ATTENTION' size='small' />
            <Typography variant='caption'>{summary.ATTENTION}</Typography>
            <OverallConditionChip condition='CRITICAL' size='small' />
            <Typography variant='caption'>{summary.CRITICAL}</Typography>
          </Stack>
        ) : null}
      </Box>

      <UnitTabPanelShell
        gridKey='condition'
        title='Component Condition'
        subtitle='Overall per komponen dari SOS + inspeksi (FC, MPS, VI, TA2, ED)'
        onExport={async () => {
          const response = await fetch(apiPath(`/exports/conditions/${fleetId}/`))
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `condition-${fleetId}.xlsx`
          link.click()
          window.URL.revokeObjectURL(url)
        }}
        toolbarExtra={toolbarExtra}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        rows={dataReady ? rows : []}
        columns={columns}
        loading={loading || !dataReady}
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={resolveRowId}
        emptyMessage='Belum ada condition untuk unit ini. Input SOS atau inspeksi, lalu recompute jika perlu.'
      />
    </Box>
  )
}

export default UnitConditionTabPanel
