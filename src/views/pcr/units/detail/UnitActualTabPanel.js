/**
 * PCR Actual tab — satu baris per component (replacement terakhir) + view history.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/router'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'

import arkaApi from 'src/utils/arka-api'

import useCan from 'src/hooks/useCan'

import LifePercentChip from 'src/views/pcr/forecasts/LifePercentChip'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'
import OverallConditionChip from 'src/views/pcr/condition/OverallConditionChip'
import ReplacementDialog from 'src/views/pcr/replacements/ReplacementDialog'
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

const UnitActualTabPanel = ({ fleetId, unit, isActive }) => {
  const router = useRouter()
  const { can } = useCan()
  const canCreate = can('replacements.create')

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const [rows, setRows] = useState([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dataReady, setDataReady] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [presetIdMod, setPresetIdMod] = useState(null)
  const fleetModelId = unit?.model_id

  const fetchData = useCallback(async () => {
    if (!fleetId || !isActive) return

    setLoading(true)
    setDataReady(false)

    try {
      const { data } = await arkaApi.get('/replacements', {
        params: {
          fleetUnitId: fleetId,
          latestPerComponent: '1',
          page: paginationModel.page,
          pageSize: paginationModel.pageSize
        }
      })

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
  }, [fleetId, isActive, paginationModel.page, paginationModel.pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenAdd = (idMod = null) => {
    setPresetIdMod(idMod)
    setDialogOpen(true)
  }

  const handleSave = async formData => {
    try {
      await arkaApi.post('/replacements', formData)
      toast.success('Work order created')
      setDialogOpen(false)
      setPresetIdMod(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Save failed')
    }
  }

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

  const eligibleIdMods = useMemo(
    () => rows.filter(row => row.canAddReplacement).map(row => row.idMod),
    [rows]
  )
  const showAddButton = canCreate && eligibleIdMods.length > 0

  if (!isActive) return null

  return (
    <>
      <UnitTabPanelShell
        gridKey='actual'
        title='PCR Actual'
        subtitle='Latest replacement per component'
        fullPageHref={`/units/${fleetId}/replacements`}
        fullPageLabel='Manage all replacements'
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
        toolbarExtra={
          showAddButton ? (
            <Button
              variant='contained'
              startIcon={<Icon icon='tabler:plus' />}
              onClick={() => handleOpenAdd()}
              disabled={!fleetModelId}
            >
              Add Replacement
            </Button>
          ) : null
        }
        rows={dataReady ? rows : []}
        columns={columns}
        loading={loading || !dataReady}
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={row => row.idMod}
        emptyMessage='No components configured for this unit model.'
      />

      <ReplacementDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setPresetIdMod(null)
        }}
        fleetUnitId={Number(fleetId)}
        fleetModelId={fleetModelId}
        presetIdMod={presetIdMod}
        eligibleIdMods={eligibleIdMods}
        latestHmUnit={unit?.latest_hm_unit ?? null}
        onRefresh={fetchData}
        onSubmit={handleSave}
      />
    </>
  )
}

export default UnitActualTabPanel
