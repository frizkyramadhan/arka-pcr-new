/**
 * PCR Actual tab — satu baris per component (replacement terakhir) + view history.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/router'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'

import arkaApi from 'src/utils/arka-api'

import useUnitTabSearch from 'src/hooks/useUnitTabSearch'

import LifePercentChip from 'src/views/pcr/forecasts/LifePercentChip'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'
import OverallConditionChip from 'src/views/pcr/condition/OverallConditionChip'
import ReplacementForecastLink from 'src/views/pcr/replacements/ReplacementForecastLink'
import UnitTabPanelShell from 'src/views/pcr/units/detail/UnitTabPanelShell'

const formatPolicy = value => {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)

  return Number.isFinite(num) ? num.toLocaleString('id-ID') : '—'
}

const formatCurrency = value => {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num)
}

const UnitActualTabPanel = ({ fleetId, isActive }) => {
  const router = useRouter()
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
    if (!fleetId || !isActive) return

    setLoading(true)
    setDataReady(false)

    try {
      const params = {
        fleetUnitId: fleetId,
        latestPerComponent: '1',
        page: paginationModel.page,
        pageSize: paginationModel.pageSize
      }
      if (search) params.search = search

      const { data } = await arkaApi.get('/replacements', { params })

      setRows(Array.isArray(data?.rows) ? data.rows : [])
      setRowCount(data?.total ?? 0)
      setDataReady(true)
    } catch {
      setRows([])
      setRowCount(0)
      setDataReady(true)
      toast.error('Failed to load PCR actual data')
    } finally {
      setLoading(false)
    }
  }, [fleetId, isActive, paginationModel.page, paginationModel.pageSize, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleViewHistory = row => {
    router.push(`/units/${fleetId}/replacements/${row.idMod}`)
  }

  const columns = useMemo(
    () => [
      {
        flex: 0.22,
        minWidth: 140,
        field: 'compDesc',
        headerName: 'Component'
      },
      {
        flex: 0.12,
        minWidth: 90,
        field: 'compType',
        headerName: 'Type',
        valueFormatter: ({ value }) => value || '—'
      },
      {
        flex: 0.1,
        minWidth: 80,
        field: 'policy',
        headerName: 'Policy',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: ({ value }) => formatPolicy(value)
      },
      {
        flex: 0.14,
        minWidth: 110,
        field: 'price',
        headerName: 'Price',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: ({ value }) => formatCurrency(value)
      },
      {
        flex: 0.12,
        minWidth: 90,
        field: 'lifePercent',
        headerName: 'Life %',
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            {row.lifePercent != null ? (
              <LifePercentChip value={row.lifePercent} />
            ) : (
              <Typography variant='body2'>—</Typography>
            )}
          </Box>
        )
      },
      {
        flex: 0.1,
        minWidth: 88,
        field: 'sosRating',
        headerName: 'SOS Rating',
        renderCell: ({ row }) => <SosRatingChip rating={row.sosRating} />
      },
      {
        flex: 0.11,
        minWidth: 96,
        field: 'ratingCbm',
        headerName: 'CBM Rating',
        renderCell: ({ row }) => <OverallConditionChip condition={row.ratingCbm} />
      },
      {
        flex: 0.16,
        minWidth: 160,
        sortable: false,
        field: 'linkedForecast',
        headerName: 'PCR Forecast',
        renderCell: ({ row }) => <ReplacementForecastLink linkedForecast={row.linkedForecast} />
      },
      {
        flex: 0.07,
        minWidth: 52,
        field: 'forecastQuarter',
        headerName: 'Qtr',
        align: 'center',
        headerAlign: 'center',
        valueFormatter: ({ value }) => value || '—'
      },
      {
        flex: 0.12,
        minWidth: 100,
        sortable: false,
        field: 'actions',
        headerName: 'Actions',
        renderCell: ({ row }) => (
          <Tooltip title='View replacement history'>
            <IconButton onClick={() => handleViewHistory(row)}>
              <Icon icon='tabler:eye' />
            </IconButton>
          </Tooltip>
        )
      }
    ],
    [fleetId, router]
  )

  if (!isActive) return null

  return (
    <UnitTabPanelShell
      gridKey='actual'
      title='PCR Actual'
      subtitle='Latest replacement per component — new work orders start from PCR Forecast'
      fullPageHref={`/units/${fleetId}/replacements`}
      fullPageLabel='Manage all replacements'
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      onExport={async () => {
        const response = await fetch(`/api/exports/replacements/${fleetId}/`)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `actual-${fleetId}.xlsx`
        link.click()
        window.URL.revokeObjectURL(url)
      }}
      rows={dataReady ? rows : []}
      columns={columns}
      loading={loading || !dataReady}
      rowCount={rowCount}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      getRowId={row => row.idMod}
      emptyMessage='No components configured for this unit model.'
    />
  )
}

export default UnitActualTabPanel
