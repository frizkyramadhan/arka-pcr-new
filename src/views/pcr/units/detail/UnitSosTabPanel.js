/**
 * SOS tab — satu baris per component dengan eval rating & tanggal sample terakhir.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Button from '@mui/material/Button'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'

import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate } from 'src/utils/date-format'

import useCan from 'src/hooks/useCan'

import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'
import SosDialog from 'src/views/pcr/sos/SosDialog'
import UnitTabPanelShell from 'src/views/pcr/units/detail/UnitTabPanelShell'

const UnitSosTabPanel = ({ fleetId, unit, isActive }) => {
  const { can } = useCan()
  const canCreateSos = can('sos.create')

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 })
  const [allRows, setAllRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [dataReady, setDataReady] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const fleetModelId = unit?.model_id

  const fetchData = useCallback(async () => {
    if (!fleetId || !isActive) return

    setLoading(true)
    setDataReady(false)

    try {
      const { data } = await arkaApi.get(`/fleet/units/${fleetId}/summary`)
      const components = Array.isArray(data?.components) ? data.components : []

      const withSos = components.filter(item => (item.sosCount ?? 0) > 0)

      const sorted = [...withSos].sort((a, b) =>
        (a.compDesc ?? '').localeCompare(b.compDesc ?? '', 'id')
      )

      setAllRows(sorted)
      setDataReady(true)
    } catch {
      setAllRows([])
      setDataReady(true)
      toast.error('Failed to load SOS summary')
    } finally {
      setLoading(false)
    }
  }, [fleetId, isActive])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const columns = useMemo(
    () => [
      {
        flex: 0.24,
        minWidth: 150,
        field: 'compDesc',
        headerName: 'Component',
        valueFormatter: ({ value }) => value || '—'
      },
      {
        flex: 0.14,
        minWidth: 110,
        field: 'compType',
        headerName: 'Component Type',
        valueFormatter: ({ value }) => value || '—'
      },
      {
        flex: 0.14,
        minWidth: 130,
        field: 'lastSosDate',
        headerName: 'Last Sample',
        valueFormatter: ({ value }) => formatDisplayDate(value)
      },
      {
        flex: 0.1,
        minWidth: 80,
        field: 'sosRating',
        headerName: 'Eval',
        align: 'center',
        headerAlign: 'center',
        renderCell: ({ row }) => <SosRatingChip rating={row.sosRating} />
      }
    ],
    []
  )

  if (!isActive) return null

  return (
    <>
      <UnitTabPanelShell
        gridKey='sos'
        title='SOS'
        subtitle='Latest oil analysis per component'
        fullPageHref={`/units/${fleetId}/sos`}
        fullPageLabel='Manage SOS records'
        paginationMode='client'
        toolbarExtra={
          canCreateSos && fleetModelId ? (
            <Button
              variant='contained'
              startIcon={<Icon icon='tabler:plus' />}
              onClick={() => setDrawerOpen(true)}
            >
              Add SOS
            </Button>
          ) : null
        }
        rows={dataReady ? allRows : []}
        columns={columns}
        loading={loading || !dataReady}
        rowCount={allRows.length}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        getRowId={row => String(row.idMod)}
        emptyMessage='No SOS records for this unit yet.'
      />

      <SosDialog
        open={drawerOpen}
        toggle={() => setDrawerOpen(prev => !prev)}
        fleetUnitId={Number(fleetId)}
        fleetModelId={fleetModelId}
        latestHmUnit={unit?.latest_hm_unit ?? null}
        onSaved={fetchData}
      />
    </>
  )
}

export default UnitSosTabPanel
