/**
 * DataGrid columns for PCR forecast approval queue.
 */
import Box from '@mui/material/Box'

import TableRowActions from 'src/@core/components/table-row-actions'

import { formatPlanPeriodMonthYear } from 'src/utils/forecast-plan-period'
import { getForecastFlowStageLabel } from 'src/utils/forecast-approval-workflow'

import LifePercentChip from 'src/views/pcr/forecasts/LifePercentChip'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'

const formatHm = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return num.toLocaleString('id-ID')
}

const compDescGetter = ({ row }) => row.compDesc ?? row.commod?.comp?.compDesc ?? '—'

export function buildForecastApprovalGridColumns({ onReview }) {
  return [
    { flex: 0.9, minWidth: 96, field: 'modelName', headerName: 'Model Unit', valueFormatter: ({ value }) => value || '—' },
    { flex: 0.8, minWidth: 84, field: 'unitNo', headerName: 'No Unit' },
    {
      flex: 1.2,
      minWidth: 120,
      field: 'compDesc',
      headerName: 'Component',
      valueGetter: compDescGetter
    },
    {
      flex: 0.9,
      minWidth: 96,
      field: 'hmComponent',
      headerName: 'HM Component',
      valueFormatter: ({ value }) => formatHm(value)
    },
    {
      flex: 0.7,
      minWidth: 72,
      field: 'policy',
      headerName: 'Policy',
      valueFormatter: ({ value }) => (value != null ? formatHm(value) : '—')
    },
    {
      flex: 0.9,
      minWidth: 100,
      field: 'lifePercent',
      headerName: 'Life %',
      renderCell: ({ row }) => <LifePercentChip value={row.lifePercent} />
    },
    {
      flex: 0.75,
      minWidth: 80,
      field: 'ratingSos',
      headerName: 'S.O.S',
      renderCell: ({ row }) => <SosRatingChip rating={row.ratingSos} />
    },
    {
      flex: 0.9,
      minWidth: 100,
      field: 'planPeriod',
      headerName: 'Plan Periode',
      valueFormatter: ({ value }) => formatPlanPeriodMonthYear(value)
    },
    { flex: 0.65, minWidth: 64, field: 'projectCode', headerName: 'Site' },
    { flex: 0.55, minWidth: 56, field: 'quarter', headerName: 'Qtr' },
    {
      flex: 1,
      minWidth: 120,
      field: 'statusBaPcr',
      headerName: 'Tahap Saat Ini',
      valueGetter: ({ row }) => getForecastFlowStageLabel(row)
    },
    {
      flex: 0.75,
      minWidth: 72,
      sortable: false,
      field: 'actions',
      headerName: 'Action',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TableRowActions
            buttonSize='medium'
            actions={[
              {
                key: 'review',
                label: 'Review Approval',
                onClick: () => onReview(row)
              }
            ]}
          />
        </Box>
      )
    }
  ]
}
