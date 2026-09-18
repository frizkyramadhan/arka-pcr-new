/**
 * DataGrid columns for Replacement Actual list — view-only actions.
 */
import CustomChip from 'src/@core/components/mui/chip'
import { TableRowActionSelect } from 'src/@core/components/table-row-actions'

import { formatDisplayDate } from 'src/utils/date-format'

import LifePercentChip from 'src/views/pcr/forecasts/LifePercentChip'
import ReplacementForecastLink from 'src/views/pcr/replacements/ReplacementForecastLink'
import { SapDocumentBadge } from 'src/views/pcr/sap'

const formatHm = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return num.toLocaleString('id-ID')
}

const compDescGetter = ({ row }) => row.commod?.comp?.compDesc ?? row.compDesc ?? '—'

/**
 * @param {{ onView: (row: object) => void }} options
 */
export function buildReplacementActualGridColumns({ onView } = {}) {
  return [
    {
      flex: 1.1,
      minWidth: 140,
      field: 'modelName',
      headerName: 'Model Unit',
      valueGetter: ({ row }) => row.unit?.modelName ?? '—',
      valueFormatter: ({ value }) => value || '—'
    },
    { flex: 0.85, minWidth: 120, field: 'unitNo', headerName: 'Unit No' },
    {
      flex: 1.5,
      minWidth: 180,
      field: 'compDesc',
      headerName: 'Component',
      valueGetter: compDescGetter
    },
    {
      flex: 1,
      minWidth: 130,
      field: 'hmRep',
      headerName: 'HM Unit',
      valueFormatter: ({ value }) => formatHm(value)
    },
    {
      flex: 0.9,
      minWidth: 120,
      field: 'compHour',
      headerName: 'Comp Hour',
      valueFormatter: ({ value }) => formatHm(value)
    },
    {
      flex: 1,
      minWidth: 120,
      field: 'lifePercent',
      headerName: 'Life %',
      renderCell: ({ row }) => (
        <LifePercentChip value={row.woStatus === 'CLOSE' ? row.lifePercent : row.liveMetrics?.lifePercent} />
      )
    },
    {
      flex: 1,
      minWidth: 130,
      field: 'repDate',
      headerName: 'Rep Date',
      valueFormatter: ({ value }) => formatDisplayDate(value) || '—'
    },
    {
      flex: 0.85,
      minWidth: 110,
      field: 'projectCode',
      headerName: 'Project'
    },
    {
      flex: 1,
      minWidth: 140,
      field: 'woNo',
      headerName: 'WO No',
      renderCell: ({ row }) => <SapDocumentBadge type='wo' docNum={row.woNo} />
    },
    {
      flex: 0.9,
      minWidth: 110,
      field: 'woStatus',
      headerName: 'Status',
      renderCell: ({ row }) => (
        <CustomChip
          rounded
          skin='light'
          size='small'
          color={row.woStatus === 'CLOSE' ? 'success' : 'warning'}
          label={row.woStatus || '—'}
        />
      )
    },
    {
      flex: 1.2,
      minWidth: 150,
      field: 'linkedForecast',
      headerName: 'PCR Forecast',
      sortable: false,
      renderCell: ({ row }) => <ReplacementForecastLink linkedForecast={row.linkedForecast} />
    },
    {
      flex: 0.9,
      minWidth: 140,
      sortable: false,
      field: 'actions',
      headerName: 'Action',
      renderCell: ({ row }) => (
        <TableRowActionSelect
          size='small'
          minWidth={140}
          actions={[
            {
              key: 'view',
              label: 'View detail',
              onClick: () => onView?.(row)
            }
          ]}
        />
      )
    }
  ]
}
