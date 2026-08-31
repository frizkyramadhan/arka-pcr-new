/**
 * Shared DataGrid columns for component condition tables.
 */
import CustomChip from 'src/@core/components/mui/chip'

import { formatDisplayDate } from 'src/utils/date-format'

import OverallConditionChip from 'src/views/pcr/condition/OverallConditionChip'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'

const formatDate = value => formatDisplayDate(value, '—')

function hasInspectionRating(row) {
  return [row.fcRating, row.mpsRating, row.viRating, row.ta2Rating, row.edRating].some(Boolean)
}

function getBasisLabel(row) {
  if (hasInspectionRating(row)) return 'Inspection'
  if (row.sosRating) return 'SOS'

  return '—'
}

export function buildConditionGridColumns({ includeUnit = false, compact = false } = {}) {
  const columns = []

  if (includeUnit) {
    columns.push({ flex: 0.1, minWidth: 90, field: 'unitNo', headerName: 'Unit' })
  }

  columns.push(
    {
      flex: compact ? 0.22 : 0.2,
      minWidth: 140,
      field: 'compDesc',
      headerName: 'Component',
      valueGetter: ({ row }) => row.commod?.comp?.compDesc ?? row.compDesc ?? '—'
    },
    {
      flex: 0.12,
      minWidth: 100,
      field: 'condition',
      headerName: 'Overall',
      renderCell: ({ row }) => <OverallConditionChip condition={row.condition} />
    },
    {
      flex: 0.1,
      minWidth: 88,
      field: 'basis',
      headerName: 'Basis',
      sortable: false,
      renderCell: ({ row }) => {
        const basis = getBasisLabel(row)
        if (basis === '—') return '—'

        return (
          <CustomChip
            rounded
            skin='light'
            size='small'
            label={basis}
            color={basis === 'Inspection' ? 'primary' : 'secondary'}
          />
        )
      }
    },
    {
      flex: 0.08,
      minWidth: 64,
      field: 'sosRating',
      headerName: 'SOS',
      renderCell: ({ row }) => <SosRatingChip rating={row.sosRating} />
    },
    {
      flex: 0.07,
      minWidth: 56,
      field: 'fcRating',
      headerName: 'FC',
      renderCell: ({ row }) => <SosRatingChip rating={row.fcRating} />
    },
    {
      flex: 0.07,
      minWidth: 56,
      field: 'mpsRating',
      headerName: 'MPS',
      renderCell: ({ row }) => <SosRatingChip rating={row.mpsRating} />
    }
  )

  if (!compact) {
    columns.push(
      {
        flex: 0.07,
        minWidth: 56,
        field: 'viRating',
        headerName: 'VI',
        renderCell: ({ row }) => <SosRatingChip rating={row.viRating} />
      },
      {
        flex: 0.07,
        minWidth: 56,
        field: 'ta2Rating',
        headerName: 'TA2',
        renderCell: ({ row }) => <SosRatingChip rating={row.ta2Rating} />
      },
      {
        flex: 0.07,
        minWidth: 56,
        field: 'edRating',
        headerName: 'ED',
        renderCell: ({ row }) => <SosRatingChip rating={row.edRating} />
      },
      {
        flex: 0.11,
        minWidth: 100,
        field: 'evaluatedAt',
        headerName: 'Evaluated',
        valueFormatter: ({ value }) => formatDate(value)
      }
    )
  }

  return columns
}

export { getBasisLabel, hasInspectionRating }
