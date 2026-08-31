/**
 * DataGrid column definitions for read-only report summary tables (wide layout).
 */
import Link from '@mui/material/Link'

import NextLink from 'next/link'

import CustomChip from 'src/@core/components/mui/chip'

import { formatPlanPeriodShort } from 'src/utils/ba-pcr-print'
import { formatDisplayDate } from 'src/utils/date-format'
import { formatCannibalPairField } from 'src/utils/cannibal-list-display'
import { getCurrentCannibalFlowStage } from 'src/utils/cannibal-approval-workflow'
import {
  LOGISTIC_STATEMENT_OPTIONS,
  logisticStatementFromFlags,
  PLANT_STATEMENT_OPTIONS,
  plantStatementFromFlags
} from 'src/utils/cannibal-form-lookups'

import { buildConditionGridColumns } from 'src/views/pcr/condition/conditionGridColumns'
import BaStatusChip from 'src/views/pcr/cannibal/BaStatusChip'
import LifePercentChip from 'src/views/pcr/forecasts/LifePercentChip'
import SosRatingChip from 'src/views/pcr/forecasts/SosRatingChip'

const formatDate = value => formatDisplayDate(value, '—')

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

const baPcrStatusColor = status => {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'error'
  if (status === 'IN_REVIEW' || status === 'SUBMITTED') return 'info'

  return 'warning'
}

/** Widen columns for report tables with horizontal scroll. */
function widenColumns(columns, minFloor = 120) {
  return columns.map(column => ({
    ...column,
    minWidth: Math.max(column.minWidth ?? 0, minFloor),
    flex: column.flex ?? 1
  }))
}

/** Fixed sticky widths — left offsets must match CSS in pcrReportStickySx. */
export const PCR_REPORT_STICKY_COLUMNS = [
  { field: 'modelName', width: 140, className: 'pcr-sticky-0' },
  { field: 'unitNo', width: 100, className: 'pcr-sticky-1' },
  { field: 'compDesc', width: 180, className: 'pcr-sticky-2' }
]

export const PCR_REPORT_MIN_WIDTH = 2520

export function buildPcrReportColumns() {
  const [modelSticky, unitSticky, compSticky] = PCR_REPORT_STICKY_COLUMNS

  return [
    {
      field: 'modelName',
      headerName: 'Model Unit',
      width: modelSticky.width,
      sortable: true,
      headerClassName: modelSticky.className,
      cellClassName: modelSticky.className,
      valueGetter: ({ row }) => row.unit?.modelName ?? '—',
      valueFormatter: ({ value }) => value || '—'
    },
    {
      field: 'unitNo',
      headerName: 'No Unit',
      width: unitSticky.width,
      sortable: true,
      headerClassName: unitSticky.className,
      cellClassName: unitSticky.className
    },
    {
      field: 'compDesc',
      headerName: 'Component',
      width: compSticky.width,
      sortable: true,
      headerClassName: compSticky.className,
      cellClassName: compSticky.className,
      valueGetter: compDescGetter,
      renderCell: ({ row }) => {
        const label = compDescGetter({ row })
        const { fleetUnitId, idMod } = row
        if (!fleetUnitId || !idMod) return label

        return (
          <Link
            component={NextLink}
            href={`/units/${fleetUnitId}/replacements/${idMod}`}
            underline='hover'
            sx={{
              fontWeight: 600,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block'
            }}
          >
            {label}
          </Link>
        )
      }
    },
    {
      minWidth: 120,
      flex: 1,
      field: 'hmRep',
      headerName: 'HM Component',
      valueFormatter: ({ value }) => formatHm(value)
    },
    {
      minWidth: 120,
      flex: 0.95,
      field: 'repDate',
      headerName: 'Rep Date',
      valueFormatter: ({ value }) => formatDate(value)
    },
    {
      minWidth: 120,
      flex: 0.95,
      field: 'woDate',
      headerName: 'WO Date',
      valueFormatter: ({ value }) => formatDate(value)
    },
    {
      minWidth: 140,
      flex: 1.1,
      field: 'lifePercent',
      headerName: 'Life Time Component',
      renderCell: ({ row }) => (
        <LifePercentChip value={row.woStatus === 'CLOSE' ? row.lifePercent : row.liveMetrics?.lifePercent} />
      )
    },
    { minWidth: 100, flex: 0.75, field: 'projectCode', headerName: 'Project' },
    {
      minWidth: 180,
      flex: 1.3,
      field: 'noBaPcr',
      headerName: 'BA PCR',
      valueGetter: ({ row }) => row.linkedForecast?.noBaPcr ?? null,
      renderCell: ({ row }) => {
        const noBaPcr = row.linkedForecast?.noBaPcr
        const idForecast = row.linkedForecast?.idForecast
        if (!noBaPcr && !idForecast) return '—'
        if (!idForecast) return noBaPcr || '—'

        return (
          <Link
            component={NextLink}
            href={`/forecasts/${idForecast}`}
            underline='hover'
            sx={{
              fontWeight: 600,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block'
            }}
          >
            {noBaPcr || `Forecast #${idForecast}`}
          </Link>
        )
      }
    },
    {
      minWidth: 130,
      flex: 1,
      field: 'baPcrStatus',
      headerName: 'Status BA PCR',
      valueGetter: ({ row }) => row.linkedForecast?.baPcrStatus ?? null,
      renderCell: ({ row }) => {
        const baPcrStatus = row.linkedForecast?.baPcrStatus
        if (!baPcrStatus) return '—'

        return (
          <CustomChip rounded skin='light' size='small' label={baPcrStatus} color={baPcrStatusColor(baPcrStatus)} />
        )
      }
    },
    {
      minWidth: 130,
      flex: 1,
      field: 'woNo',
      headerName: 'WO',
      valueGetter: ({ row }) => row.woNo ?? row.idRep,
      renderCell: ({ row }) => {
        const woNo = row.woNo ?? row.idRep
        const { fleetUnitId, idMod } = row
        if (!fleetUnitId || !idMod) return String(woNo)

        return (
          <Link
            component={NextLink}
            href={`/units/${fleetUnitId}/replacements/${idMod}`}
            underline='hover'
            sx={{
              fontWeight: 600,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block'
            }}
          >
            {woNo}
          </Link>
        )
      }
    },
    {
      minWidth: 120,
      flex: 0.95,
      field: 'woStatus',
      headerName: 'STATUS WO',
      renderCell: ({ row }) => (
        <CustomChip
          rounded
          skin='light'
          size='small'
          label={row.woStatus}
          color={row.woStatus === 'OPEN' ? 'warning' : 'success'}
        />
      )
    },
    { minWidth: 120, flex: 0.95, field: 'mrNo', headerName: 'MR No', valueFormatter: ({ value }) => value || '—' },
    { minWidth: 120, flex: 0.95, field: 'prNo', headerName: 'PR No', valueFormatter: ({ value }) => value || '—' },
    { minWidth: 120, flex: 0.95, field: 'poNo', headerName: 'PO No', valueFormatter: ({ value }) => value || '—' },
    {
      minWidth: 160,
      flex: 1.3,
      field: 'remarks',
      headerName: 'REMARK',
      valueFormatter: ({ value }) => value || '—'
    },
    {
      minWidth: 140,
      flex: 1.1,
      field: 'returnOldcoreDate',
      headerName: 'RETURN OLD COMP',
      valueFormatter: ({ value }) => formatDate(value)
    },
    {
      minWidth: 180,
      flex: 1.4,
      field: 'spbBaReturnOldcore',
      headerName: 'SPB/BA RETURN OLD COMP',
      valueFormatter: ({ value }) => value || '—'
    }
  ]
}

/** Sticky left columns for Summary PCR (Model / Unit / Component). */
export const pcrReportStickySx = {
  '& .pcr-sticky-0, & .pcr-sticky-1, & .pcr-sticky-2': {
    position: 'sticky !important',
    backgroundColor: theme => `${theme.palette.background.paper} !important`,
    backgroundImage: 'none !important'
  },
  '& .MuiDataGrid-columnHeader.pcr-sticky-0, & .MuiDataGrid-columnHeader.pcr-sticky-1, & .MuiDataGrid-columnHeader.pcr-sticky-2':
    {
      zIndex: 6,
      backgroundColor: 'background.paper'
    },
  '& .MuiDataGrid-cell.pcr-sticky-0, & .MuiDataGrid-cell.pcr-sticky-1, & .MuiDataGrid-cell.pcr-sticky-2': {
    zIndex: 3
  },
  '& .pcr-sticky-0': {
    left: '0px !important'
  },
  '& .pcr-sticky-1': {
    left: `${PCR_REPORT_STICKY_COLUMNS[0].width}px !important`
  },
  '& .pcr-sticky-2': {
    left: `${PCR_REPORT_STICKY_COLUMNS[0].width + PCR_REPORT_STICKY_COLUMNS[1].width}px !important`,
    borderRight: theme => `1px solid ${theme.palette.divider}`,
    boxShadow: theme => `4px 0 8px -4px ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.55)'}`
  },
  '& .MuiDataGrid-row:hover .MuiDataGrid-cell.pcr-sticky-0, & .MuiDataGrid-row:hover .MuiDataGrid-cell.pcr-sticky-1, & .MuiDataGrid-row:hover .MuiDataGrid-cell.pcr-sticky-2':
    {
      zIndex: 4,
      backgroundColor: theme =>
        `${theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800]} !important`,
      backgroundImage: 'none !important'
    },
  '& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell.pcr-sticky-0, & .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell.pcr-sticky-1, & .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell.pcr-sticky-2':
    {
      zIndex: 4,
      backgroundColor: theme =>
        `${theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800]} !important`,
      backgroundImage: 'none !important'
    },
  '& .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell.pcr-sticky-0, & .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell.pcr-sticky-1, & .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell.pcr-sticky-2':
    {
      backgroundColor: theme =>
        `${theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[700]} !important`,
      backgroundImage: 'none !important'
    }
}

/** Fixed sticky widths — left offsets must match CSS in forecastReportStickySx. */
export const FORECAST_REPORT_STICKY_COLUMNS = [
  { field: 'modelName', width: 140, className: 'forecast-sticky-0' },
  { field: 'unitNo', width: 100, className: 'forecast-sticky-1' },
  { field: 'compDesc', width: 180, className: 'forecast-sticky-2' }
]

export function buildForecastReportColumns() {
  const [modelSticky, unitSticky, compSticky] = FORECAST_REPORT_STICKY_COLUMNS

  return [
    {
      field: 'modelName',
      headerName: 'Model Unit',
      width: modelSticky.width,
      sortable: true,
      headerClassName: modelSticky.className,
      cellClassName: modelSticky.className,
      valueFormatter: ({ value }) => value || '—'
    },
    {
      field: 'unitNo',
      headerName: 'No Unit',
      width: unitSticky.width,
      sortable: true,
      headerClassName: unitSticky.className,
      cellClassName: unitSticky.className
    },
    {
      field: 'compDesc',
      headerName: 'Component',
      width: compSticky.width,
      sortable: true,
      headerClassName: compSticky.className,
      cellClassName: compSticky.className,
      valueGetter: compDescGetter,
      renderCell: ({ row }) => {
        const label = compDescGetter({ row })
        if (!row.idForecast) return label

        return (
          <Link
            component={NextLink}
            href={`/forecasts/${row.idForecast}`}
            underline='hover'
            sx={{
              fontWeight: 600,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block'
            }}
          >
            {label}
          </Link>
        )
      }
    },
    {
      minWidth: 120,
      flex: 1,
      field: 'hmComponent',
      headerName: 'HM Component',
      valueFormatter: ({ value }) => formatHm(value)
    },
    {
      minWidth: 90,
      flex: 0.7,
      field: 'policy',
      headerName: 'Policy',
      valueFormatter: ({ value }) => formatPolicy(value)
    },
    {
      minWidth: 140,
      flex: 1.1,
      field: 'lifePercent',
      headerName: 'Life Time Component',
      renderCell: ({ row }) => <LifePercentChip value={row.lifePercent} />
    },
    {
      minWidth: 110,
      flex: 0.85,
      field: 'ratingSos',
      headerName: 'Rating S.O.S',
      renderCell: ({ row }) => <SosRatingChip rating={row.ratingSos} />
    },
    {
      minWidth: 130,
      flex: 1,
      field: 'priceComponent',
      headerName: 'Price Component',
      valueFormatter: ({ value }) => (value != null && value !== '' ? Number(value).toLocaleString('id-ID') : '—')
    },
    {
      minWidth: 120,
      flex: 0.95,
      field: 'planPeriod',
      headerName: 'Plan Periode',
      headerClassName: 'forecast-report-header-plan',
      valueFormatter: ({ value }) => formatPlanPeriodShort(value)
    },
    { minWidth: 100, flex: 0.75, field: 'projectCode', headerName: 'Project' },
    { minWidth: 90, flex: 0.65, field: 'quarter', headerName: 'Quarter' },
    {
      minWidth: 180,
      flex: 1.3,
      field: 'noBaPcr',
      headerName: 'BA PCR',
      valueFormatter: ({ value }) => value || '—'
    },
    {
      minWidth: 130,
      flex: 1,
      field: 'baPcrStatus',
      headerName: 'Status BA PCR',
      renderCell: ({ row }) =>
        row.baPcrStatus ? (
          <CustomChip
            rounded
            skin='light'
            size='small'
            label={row.baPcrStatus}
            color={baPcrStatusColor(row.baPcrStatus)}
          />
        ) : (
          '—'
        )
    },
    {
      minWidth: 160,
      flex: 1.2,
      field: 'baSubmittedAt',
      headerName: 'Tanggal Pengajuan BA PCR',
      valueFormatter: ({ value }) => formatDate(value)
    },
    {
      minWidth: 130,
      flex: 1,
      field: 'woNo',
      headerName: 'WO',
      headerClassName: 'forecast-report-header-wo',
      valueGetter: ({ row }) => row.replacement?.woNo ?? row.woNo ?? '—',
      renderCell: ({ row }) => {
        const woNo = row.replacement?.woNo ?? row.woNo
        if (!woNo) return '—'

        const fleetUnitId = row.fleetUnitId
        const idMod = row.idMod
        if (!fleetUnitId || !idMod) return String(woNo)

        return (
          <Link
            component={NextLink}
            href={`/units/${fleetUnitId}/replacements/${idMod}`}
            underline='hover'
            sx={{
              fontWeight: 600,
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block'
            }}
          >
            {woNo}
          </Link>
        )
      }
    },
    {
      minWidth: 120,
      flex: 0.95,
      field: 'woStatus',
      headerName: 'STATUS WO',
      valueGetter: ({ row }) => row.replacement?.woStatus ?? row.woStatus ?? null,
      renderCell: ({ row }) => {
        const woStatus = row.replacement?.woStatus ?? row.woStatus
        if (!woStatus) return '—'

        return (
          <CustomChip
            rounded
            skin='light'
            size='small'
            label={woStatus}
            color={woStatus === 'OPEN' ? 'warning' : 'success'}
          />
        )
      }
    },
    {
      minWidth: 140,
      flex: 1.1,
      field: 'convertedAt',
      headerName: 'ACTION DATE PCR',
      valueFormatter: ({ value }) => formatDate(value)
    },
    {
      minWidth: 120,
      flex: 0.95,
      field: 'poNo',
      headerName: 'PO',
      valueGetter: ({ row }) => row.replacement?.poNo ?? row.poNo ?? '—'
    },
    {
      minWidth: 160,
      flex: 1.3,
      field: 'remark',
      headerName: 'REMARK',
      valueFormatter: ({ value }) => value || '—'
    },
    {
      minWidth: 140,
      flex: 1.1,
      field: 'returnOldcoreDate',
      headerName: 'RETURN OLD COMP',
      headerClassName: 'forecast-report-header-return',
      valueGetter: ({ row }) => formatDate(row.replacement?.returnOldcoreDate ?? row.returnOldcoreDate)
    },
    {
      minWidth: 180,
      flex: 1.4,
      field: 'spbBaReturnOldcore',
      headerName: 'SPB/BA RETURN OLD COMP',
      valueGetter: ({ row }) => row.replacement?.spbBaReturnOldcore ?? row.spbBaReturnOldcore ?? '—'
    }
  ]
}

/** Header highlight classes for Forecast report DataGrid. */
export const forecastReportHeaderSx = {
  '& .forecast-report-header-plan': {
    backgroundColor: 'warning.main',
    color: 'common.white',
    fontWeight: 700
  },
  '& .forecast-report-header-wo': {
    backgroundColor: 'success.main',
    color: 'common.white',
    fontWeight: 700
  },
  '& .forecast-report-header-return': {
    backgroundColor: 'info.main',
    color: 'common.white',
    fontWeight: 700
  }
}

/** Sticky left columns for Summary Forecast (Model / Unit / Component). */
export const forecastReportStickySx = {
  ...forecastReportHeaderSx,
  '& .forecast-sticky-0, & .forecast-sticky-1, & .forecast-sticky-2': {
    position: 'sticky !important',
    backgroundColor: theme => `${theme.palette.background.paper} !important`,
    backgroundImage: 'none !important'
  },
  '& .MuiDataGrid-columnHeader.forecast-sticky-0, & .MuiDataGrid-columnHeader.forecast-sticky-1, & .MuiDataGrid-columnHeader.forecast-sticky-2':
    {
      zIndex: 6,
      backgroundColor: 'background.paper'
    },
  '& .MuiDataGrid-cell.forecast-sticky-0, & .MuiDataGrid-cell.forecast-sticky-1, & .MuiDataGrid-cell.forecast-sticky-2':
    {
      zIndex: 3
    },
  '& .forecast-sticky-0': {
    left: '0px !important'
  },
  '& .forecast-sticky-1': {
    left: `${FORECAST_REPORT_STICKY_COLUMNS[0].width}px !important`
  },
  '& .forecast-sticky-2': {
    left: `${FORECAST_REPORT_STICKY_COLUMNS[0].width + FORECAST_REPORT_STICKY_COLUMNS[1].width}px !important`,
    borderRight: theme => `1px solid ${theme.palette.divider}`,
    boxShadow: theme => `4px 0 8px -4px ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.55)'}`
  },

  // action.hover is translucent — use opaque grey so scrolled cells cannot bleed through.
  '& .MuiDataGrid-row:hover .MuiDataGrid-cell.forecast-sticky-0, & .MuiDataGrid-row:hover .MuiDataGrid-cell.forecast-sticky-1, & .MuiDataGrid-row:hover .MuiDataGrid-cell.forecast-sticky-2':
    {
      zIndex: 4,
      backgroundColor: theme =>
        `${theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800]} !important`,
      backgroundImage: 'none !important'
    },
  '& .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell.forecast-sticky-0, & .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell.forecast-sticky-1, & .MuiDataGrid-row.Mui-selected .MuiDataGrid-cell.forecast-sticky-2':
    {
      zIndex: 4,
      backgroundColor: theme =>
        `${theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800]} !important`,
      backgroundImage: 'none !important'
    },
  '& .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell.forecast-sticky-0, & .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell.forecast-sticky-1, & .MuiDataGrid-row.Mui-selected:hover .MuiDataGrid-cell.forecast-sticky-2':
    {
      backgroundColor: theme =>
        `${theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[700]} !important`,
      backgroundImage: 'none !important'
    }
}

export function buildInspectionReportColumns() {
  return widenColumns(
    [
      { minWidth: 110, field: 'projectCode', headerName: 'Project' },
      {
        minWidth: 140,
        field: 'insDate',
        headerName: 'Inspection Date',
        valueFormatter: ({ value }) => formatDate(value)
      },
      { minWidth: 120, field: 'unitNo', headerName: 'Unit No' },
      {
        minWidth: 200,
        field: 'compDesc',
        headerName: 'Component',
        valueGetter: compDescGetter
      },
      {
        minWidth: 120,
        field: 'insHm',
        headerName: 'Hour Meter',
        valueFormatter: ({ value }) => formatHm(value)
      },
      { minWidth: 140, field: 'type', headerName: 'Inspection Type' },
      {
        minWidth: 110,
        field: 'rating',
        headerName: 'Rating',
        renderCell: ({ row }) => <SosRatingChip rating={row.rating} />
      }
    ],
    110
  )
}

export function buildSosReportColumns() {
  return widenColumns(
    [
      { minWidth: 110, field: 'projectCode', headerName: 'Project' },
      {
        minWidth: 140,
        field: 'sampleDate',
        headerName: 'Sample Date',
        valueFormatter: ({ value }) => formatDate(value)
      },
      { minWidth: 120, field: 'unitNo', headerName: 'Unit No' },
      {
        minWidth: 200,
        field: 'compDesc',
        headerName: 'Component',
        valueGetter: compDescGetter
      },
      {
        minWidth: 140,
        field: 'labNo',
        headerName: 'Lab No',
        valueFormatter: ({ value }) => value || '—'
      },
      {
        minWidth: 140,
        field: 'evalCode',
        headerName: 'Evaluation Code',
        renderCell: ({ row }) => <SosRatingChip rating={row.evalCode} />
      }
    ],
    110
  )
}

/** Report-specific widths — keep rating chips compact, give text columns more room. */
const CONDITION_REPORT_WIDTHS = {
  projectCode: { minWidth: 100, flex: 0.7 },
  unitNo: { minWidth: 110, flex: 0.8 },
  compDesc: { minWidth: 180, flex: 1.6 },
  condition: { minWidth: 120, flex: 1 },
  basis: { minWidth: 110, flex: 0.85 },
  sosRating: { minWidth: 72, flex: 0.55 },
  fcRating: { minWidth: 64, flex: 0.45 },
  mpsRating: { minWidth: 64, flex: 0.45 },
  viRating: { minWidth: 64, flex: 0.45 },
  ta2Rating: { minWidth: 64, flex: 0.45 },
  edRating: { minWidth: 64, flex: 0.45 },
  evaluatedAt: { minWidth: 120, flex: 0.9 }
}

export function buildConditionReportColumns() {
  const base = buildConditionGridColumns({ includeUnit: true, compact: false })

  return [
    {
      field: 'projectCode',
      headerName: 'Project',
      ...CONDITION_REPORT_WIDTHS.projectCode
    },
    ...base.map(column => {
      const width = CONDITION_REPORT_WIDTHS[column.field] ?? { minWidth: column.minWidth, flex: column.flex }

      return {
        ...column,
        ...width,
        ...(column.field === 'unitNo' ? { headerName: 'Unit No' } : {})
      }
    })
  ]
}

export const CANNIBAL_REPORT_MIN_WIDTH = 2680

const plantStatementLabel = row => {
  const value = plantStatementFromFlags(row)
  if (!value) return '—'
  if (value === 'other' && row.plantOtherText) return `Other — ${row.plantOtherText}`

  return PLANT_STATEMENT_OPTIONS.find(option => option.value === value)?.label ?? value
}

const logisticStatementLabel = row => {
  const value = logisticStatementFromFlags(row)
  if (!value) return '—'
  if (value === 'lead_time' && row.logisticLeadTimeDays) {
    return `Lead Time Part (Est ${row.logisticLeadTimeDays} days)`
  }
  if (value === 'other' && row.logisticOtherText) return `Other — ${row.logisticOtherText}`

  return LOGISTIC_STATEMENT_OPTIONS.find(option => option.value === value)?.label ?? value
}

/** Read-only cannibal BA summary columns for /reports/cannibals. */
export function buildCannibalReportColumns() {
  return widenColumns(
    [
      {
        minWidth: 150,
        field: 'noBa',
        headerName: 'BA No',
        renderCell: ({ row }) => {
          if (!row.idBa) return row.noBa || '—'

          return (
            <Link
              component={NextLink}
              href={`/cannibals/${row.idBa}`}
              underline='hover'
              sx={{
                fontWeight: 600,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block'
              }}
            >
              {row.noBa}
            </Link>
          )
        }
      },
      { minWidth: 90, field: 'projectCode', headerName: 'Project' },
      {
        minWidth: 120,
        field: 'postingDate',
        headerName: 'Posting Date',
        valueFormatter: ({ value }) => formatDate(value)
      },
      {
        minWidth: 130,
        field: 'removedModel',
        headerName: 'Model (Remove)',
        sortable: false,
        valueGetter: ({ row }) => {
          const pairs = row.pairs
          if (!pairs?.length) return '—'
          const models = pairs.map(p => p?.remove?.unit?.modelName).filter(Boolean)
          const unique = [...new Set(models)]

          return unique.length ? unique.join(', ') : '—'
        }
      },
      {
        minWidth: 120,
        field: 'removedUnitNo',
        headerName: 'Removed Unit',
        sortable: false,
        valueGetter: ({ row }) => formatCannibalPairField(row.pairs, 'remove', 'unitNo')
      },
      {
        minWidth: 120,
        field: 'installedUnitNo',
        headerName: 'Installed Unit',
        sortable: false,
        valueGetter: ({ row }) => formatCannibalPairField(row.pairs, 'install', 'unitNo')
      },
      {
        minWidth: 120,
        field: 'pn',
        headerName: 'Part Number',
        sortable: false,
        valueGetter: ({ row }) => {
          const fromRemove = formatCannibalPairField(row.pairs, 'remove', 'pn')
          if (fromRemove !== '—') return fromRemove

          return formatCannibalPairField(row.pairs, 'install', 'pn')
        }
      },
      {
        minWidth: 160,
        field: 'compDesc',
        headerName: 'Component',
        sortable: false,
        valueGetter: ({ row }) => {
          const fromRemove = formatCannibalPairField(row.pairs, 'remove', 'compDesc')
          if (fromRemove !== '—') return fromRemove

          return formatCannibalPairField(row.pairs, 'install', 'compDesc')
        }
      },
      {
        minWidth: 160,
        field: 'plantStatement',
        headerName: 'Plant Statement',
        sortable: false,
        valueGetter: ({ row }) => plantStatementLabel(row)
      },
      {
        minWidth: 160,
        field: 'logisticStatement',
        headerName: 'Logistic Statement',
        sortable: false,
        valueGetter: ({ row }) => logisticStatementLabel(row)
      },
      {
        minWidth: 140,
        field: 'approval',
        headerName: 'Approval',
        sortable: false,
        valueGetter: ({ row }) => getCurrentCannibalFlowStage(row)
      },
      {
        minWidth: 130,
        field: 'statusBa',
        headerName: 'Status',
        renderCell: ({ row }) => <BaStatusChip status={row.statusBa} />
      },
      {
        minWidth: 170,
        field: 'planningAction',
        headerName: 'Planning Action',
        sortable: false,
        valueGetter: ({ row }) => row.baAction?.action || '—'
      },
      {
        minWidth: 130,
        field: 'woNo',
        headerName: 'WO No',
        sortable: false,
        valueGetter: ({ row }) => {
          const removeWo = formatCannibalPairField(row.pairs, 'remove', 'woNoKanibal')
          const installWo = formatCannibalPairField(row.pairs, 'install', 'woNoKanibal')
          if (removeWo === '—' && installWo === '—') return '—'
          if (removeWo !== '—' && installWo !== '—' && removeWo !== installWo) {
            return `${removeWo} / ${installWo}`
          }

          return removeWo !== '—' ? removeWo : installWo
        }
      },
      {
        minWidth: 110,
        field: 'mrNo',
        headerName: 'MR No',
        valueFormatter: ({ value }) => value || '—'
      },
      {
        minWidth: 110,
        field: 'prNo',
        headerName: 'PR No',
        valueFormatter: ({ value }) => value || '—'
      },
      {
        minWidth: 110,
        field: 'poNo',
        headerName: 'PO No',
        valueFormatter: ({ value }) => value || '—'
      }
    ],
    100
  )
}
