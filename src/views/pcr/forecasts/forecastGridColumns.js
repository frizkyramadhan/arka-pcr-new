/**
 * Shared DataGrid columns for PCR Forecast tables — spreadsheet column layout.
 */
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'

import CustomChip from 'src/@core/components/mui/chip'
import { TableRowActionSelect } from 'src/@core/components/table-row-actions'

import { formatDisplayDate } from 'src/utils/date-format'
import { formatPlanPeriodMonthYear } from 'src/utils/forecast-plan-period'
import {
  getForecastListStatusChipColor,
  getForecastListStatusLabel,
  getForecastListStatusTooltip
} from 'src/utils/forecast-approval-workflow'

import { buildForecastActions } from 'src/views/pcr/forecasts/forecastRowActions'
import LifePercentChip from 'src/views/pcr/forecasts/LifePercentChip'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'
import OverallConditionChip from 'src/views/pcr/condition/OverallConditionChip'

const formatHm = value => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'

  return num.toLocaleString('id-ID')
}

const formatPolicy = value => {
  if (value === null || value === undefined || value === '') return '—'

  return Number(value).toLocaleString('id-ID')
}

const compDescGetter = ({ row }) => row.compDesc ?? row.commod?.comp?.compDesc ?? '—'

/**
 * @param {'list' | 'unit'} scope — `unit` omits model, unit no, and site (single-unit views).
 */
export function buildForecastGridColumns({
  scope = 'list',
  canEdit,
  canDelete,
  canSubmit,
  userId,
  can,
  handleRowAction,
  actionButtonSize = 'medium'
} = {}) {
  const columns = []

  if (scope === 'list') {
    columns.push(
      {
        flex: 1,
        minWidth: 100,
        field: 'modelName',
        headerName: 'Model Unit',
        valueFormatter: ({ value }) => value || '—'
      },
      { flex: 0.85, minWidth: 88, field: 'unitNo', headerName: 'Unit No' }
    )
  }

  columns.push(
    {
      flex: scope === 'list' ? 1.35 : 1.5,
      minWidth: 120,
      field: 'compDesc',
      headerName: 'Component',
      valueGetter: compDescGetter
    },
    {
      flex: 1,
      minWidth: 100,
      field: 'hmComponent',
      headerName: 'HM Component',
      valueFormatter: ({ value }) => formatHm(value)
    },
    {
      flex: 0.75,
      minWidth: 72,
      field: 'policy',
      headerName: 'Policy',
      valueFormatter: ({ value }) => formatPolicy(value)
    },
    {
      flex: 1.1,
      minWidth: 110,
      field: 'lifePercent',
      headerName: 'Life %',
      renderCell: ({ row }) => <LifePercentChip value={row.lifePercent} />
    },
    {
      flex: 1,
      minWidth: 108,
      field: 'rulEstimatedDate',
      headerName: 'RUL Estimate (AI)',
      renderCell: ({ row }) => {
        if (!row.rulEstimatedDate) return '—'

        return (
          <Tooltip title='Estimasi berbasis tren regresi HM — referensi tambahan, bukan pengganti Life %.' arrow>
            <span>{formatDisplayDate(row.rulEstimatedDate)}</span>
          </Tooltip>
        )
      }
    },
    {
      flex: 0.85,
      minWidth: 88,
      field: 'ratingSos',
      headerName: 'SOS Rating',
      renderCell: ({ row }) => <SosRatingChip rating={row.ratingSos} />
    },
    {
      flex: 0.9,
      minWidth: 96,
      field: 'ratingCbm',
      headerName: 'CBM Rating',
      renderCell: ({ row }) => <OverallConditionChip condition={row.ratingCbm} />
    },
    {
      flex: 1,
      minWidth: 100,
      field: 'planPeriod',
      headerName: 'Plan Periode',
      valueFormatter: ({ value }) => formatPlanPeriodMonthYear(value)
    }
  )

  if (scope === 'list') {
    columns.push({
      flex: 0.75,
      minWidth: 72,
      field: 'projectCode',
      headerName: 'Site'
    })
  }

  columns.push(
    {
      flex: 0.65,
      minWidth: 64,
      field: 'quarter',
      headerName: 'Quarter'
    },
    {
      flex: 1,
      minWidth: 108,
      field: 'status',
      headerName: 'Status',
      renderCell: ({ row }) => {
        const tooltip = getForecastListStatusTooltip(row)
        const chip = (
          <CustomChip
            rounded
            skin='light'
            size='small'
            label={getForecastListStatusLabel(row)}
            color={getForecastListStatusChipColor(row)}
          />
        )

        if (!tooltip) return chip

        return (
          <Tooltip title={tooltip} arrow>
            <Box component='span' sx={{ display: 'inline-flex' }}>
              {chip}
            </Box>
          </Tooltip>
        )
      }
    },
    {
      flex: scope === 'list' ? 0.95 : 1.1,
      minWidth: scope === 'list' ? 148 : 136,
      sortable: false,
      field: 'actions',
      headerName: 'Action',
      renderCell: ({ row }) => (
        <TableRowActionSelect
          size='small'
          minWidth={scope === 'list' ? 148 : 136}
          actions={buildForecastActions(row, { canEdit, canDelete, canSubmit, userId, can }, handleRowAction)}
        />
      )
    }
  )

  return columns
}
