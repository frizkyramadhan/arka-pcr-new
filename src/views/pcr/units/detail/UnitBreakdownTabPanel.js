/**
 * Unit detail — tab BD History: daftar episode breakdown untuk unit ini.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import CustomChip from 'src/@core/components/mui/chip'
import Icon from 'src/@core/components/icon'

import useCan from 'src/hooks/useCan'
import useUnitTabSearch from 'src/hooks/useUnitTabSearch'

import arkaApi from 'src/utils/arka-api'
import { formatDisplayDateTime } from 'src/utils/date-format'

import UnitTabPanelShell from 'src/views/pcr/units/detail/UnitTabPanelShell'

const POSITION_COLOR = {
  BD: 'error',
  OP: 'warning',
  SB: 'info',
  AJ: 'secondary',
  RFU: 'success',
  CANCEL: 'secondary'
}

const formatHours = value =>
  value == null ? '—' : Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 })

const textCell = value => (
  <Typography noWrap title={value || ''}>
    {value || '—'}
  </Typography>
)

const UnitBreakdownTabPanel = ({ fleetId, unit, isActive }) => {
  const { can } = useCan()
  const canRead = can('breakdown.read') || can('reports.access')
  const canCreate = can('breakdown.create')
  const { searchInput, setSearchInput, search } = useUnitTabSearch()

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const [rows, setRows] = useState([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dataReady, setDataReady] = useState(false)

  useEffect(() => {
    setPaginationModel(prev => ({ ...prev, page: 0 }))
  }, [search])

  const fetchData = useCallback(async () => {
    if (!fleetId || !isActive || !canRead) return

    setLoading(true)
    setDataReady(false)

    try {
      const params = {
        fleetUnitId: fleetId,
        page: paginationModel.page,
        pageSize: paginationModel.pageSize,
        sortField: 'startedAt',
        sortOrder: 'desc'
      }
      if (search) params.search = search

      const { data } = await arkaApi.get('/breakdowns', { params })
      setRows(Array.isArray(data?.rows) ? data.rows : Array.isArray(data?.data) ? data.data : [])
      setRowCount(data?.total ?? 0)
      setDataReady(true)
    } catch {
      setRows([])
      setRowCount(0)
      setDataReady(true)
      toast.error('Failed to load breakdown history')
    } finally {
      setLoading(false)
    }
  }, [canRead, fleetId, isActive, paginationModel.page, paginationModel.pageSize, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const columns = useMemo(
    () => [
      {
        flex: 0.16,
        minWidth: 160,
        field: 'registerNo',
        headerName: 'Register No',
        renderCell: ({ row }) => (
          <Typography noWrap sx={{ fontWeight: 600 }} title={row.registerNo || ''}>
            {row.registerNo || '—'}
          </Typography>
        )
      },
      {
        flex: 0.1,
        minWidth: 100,
        field: 'workOrder',
        headerName: 'WO',
        renderCell: ({ row }) => textCell(row.workOrder)
      },
      {
        flex: 0.1,
        minWidth: 100,
        field: 'statusUnit',
        headerName: 'Status unit',
        renderCell: ({ row }) => (
          <CustomChip
            size='small'
            skin='light'
            color={POSITION_COLOR[row.statusUnit] || 'secondary'}
            label={row.statusUnit || '—'}
          />
        )
      },
      {
        flex: 0.09,
        minWidth: 88,
        field: 'workOrderStatus',
        headerName: 'Status WO',
        renderCell: ({ row }) => (
          <CustomChip
            size='small'
            skin='light'
            color={row.workOrderStatus === 'CLOSE' ? 'success' : row.workOrderStatus === 'CANCEL' ? 'secondary' : 'warning'}
            label={row.workOrderStatus || '—'}
          />
        )
      },
      {
        flex: 0.1,
        minWidth: 90,
        field: 'latestCode',
        headerName: 'BD code',
        valueFormatter: ({ value }) => value || '—'
      },
      {
        flex: 0.2,
        minWidth: 160,
        field: 'problem',
        headerName: 'Description',
        renderCell: ({ row }) => textCell(row.problem)
      },
      {
        flex: 0.14,
        minWidth: 140,
        field: 'startedAt',
        headerName: 'BD date',
        valueFormatter: ({ value }) => formatDisplayDateTime(value)
      },
      {
        flex: 0.14,
        minWidth: 140,
        field: 'finishedAt',
        headerName: 'Finish',
        valueFormatter: ({ value }) => formatDisplayDateTime(value)
      },
      {
        flex: 0.1,
        minWidth: 90,
        field: 'downtimeHours',
        headerName: 'Down (Hrs)',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: ({ value }) => formatHours(value)
      },
      {
        flex: 0.08,
        minWidth: 72,
        sortable: false,
        field: 'actions',
        headerName: 'Action',
        align: 'center',
        headerAlign: 'center',
        renderCell: ({ row }) => (
          <Button
            size='small'
            variant='text'
            component={Link}
            href={`/breakdowns/view/${row.id}`}
            startIcon={<Icon icon='tabler:eye' fontSize='1.125rem' />}
          >
            View
          </Button>
        )
      }
    ],
    []
  )

  if (!isActive) return null

  if (!canRead) {
    return (
      <Box sx={{ px: { xs: 4, sm: 5 }, py: 6 }}>
        <Typography variant='body2' sx={{ color: 'text.secondary', textAlign: 'center' }}>
          You do not have permission to view breakdown history.
        </Typography>
      </Box>
    )
  }

  const unitLabel = unit?.unit_no || unit?.unitNo || fleetId

  return (
    <UnitTabPanelShell
      gridKey='breakdown-history'
      title='BD History'
      subtitle={`Breakdown episodes for unit ${unitLabel}`}
      fullPageHref='/breakdowns'
      fullPageLabel='Open breakdown list'
      toolbarExtra={
        canCreate ? (
          <Button
            variant='contained'
            component={Link}
            href='/breakdowns/add'
            startIcon={<Icon icon='tabler:plus' />}
          >
            Add breakdown
          </Button>
        ) : null
      }
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      searchPlaceholder='Search register, WO, problem…'
      rows={dataReady ? rows : []}
      columns={columns}
      loading={loading || !dataReady}
      rowCount={rowCount}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      getRowId={row => row.id}
      emptyMessage='No breakdown history for this unit.'
    />
  )
}

export default UnitBreakdownTabPanel
