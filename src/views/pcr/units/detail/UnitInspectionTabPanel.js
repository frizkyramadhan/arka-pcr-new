/**
 * Inspection tab — satu baris per component dengan rating terakhir tiap tipe (FC, MPS, VI, TA2, ED).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

import Button from '@mui/material/Button'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'

import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate } from 'src/utils/date-format'

import useCan from 'src/hooks/useCan'

import InspectionDrawer from 'src/views/pcr/inspections/InspectionDrawer'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'
import UnitTabPanelShell from 'src/views/pcr/units/detail/UnitTabPanelShell'

const ratingColumn = (field, headerName) => ({
  flex: 0.08,
  minWidth: 64,
  field,
  headerName,
  align: 'center',
  headerAlign: 'center',
  sortable: false,
  renderCell: ({ row }) => <SosRatingChip rating={row[field]} />
})

const UnitInspectionTabPanel = ({ fleetId, unit, isActive }) => {
  const { can } = useCan()
  const canCreateInspection = can('inspections.create')

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

      const withInspection = components.filter(item => (item.inspectionCount ?? 0) > 0)

      const sorted = [...withInspection].sort((a, b) =>
        (a.compDesc ?? '').localeCompare(b.compDesc ?? '', 'id')
      )

      setAllRows(sorted)
      setDataReady(true)
    } catch {
      setAllRows([])
      setDataReady(true)
      toast.error('Failed to load inspection summary')
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
        field: 'lastInspectionDate',
        headerName: 'Last Inspection',
        valueFormatter: ({ value }) => formatDisplayDate(value)
      },
      ratingColumn('fcRating', 'FC'),
      ratingColumn('mpsRating', 'MPS'),
      ratingColumn('viRating', 'VI'),
      ratingColumn('ta2Rating', 'TA2'),
      ratingColumn('edRating', 'ED')
    ],
    []
  )

  if (!isActive) return null

  return (
    <>
      <UnitTabPanelShell
        gridKey='inspection'
        title='Inspection'
        subtitle='Latest rating per inspection type'
        fullPageHref={`/units/${fleetId}/inspections/all`}
        fullPageLabel='Manage inspections'
        paginationMode='client'
        toolbarExtra={
          canCreateInspection && fleetModelId ? (
            <Button
              variant='contained'
              startIcon={<Icon icon='tabler:plus' />}
              onClick={() => setDrawerOpen(true)}
            >
              Add Inspection
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
        emptyMessage='No inspection records for this unit yet.'
      />

      <InspectionDrawer
        open={drawerOpen}
        toggle={() => setDrawerOpen(prev => !prev)}
        fleetUnitId={Number(fleetId)}
        fleetModelId={fleetModelId}
        inspectionType={null}
        latestHmUnit={unit?.latest_hm_unit ?? null}
        onSaved={fetchData}
      />
    </>
  )
}

export default UnitInspectionTabPanel
