/**
 * Cannibal list — grid column definitions.
 */
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'

import Icon from 'src/@core/components/icon'
import { TableRowActionSelect } from 'src/@core/components/table-row-actions'

import { getCurrentCannibalFlowStage } from 'src/utils/cannibal-approval-workflow'
import { formatCannibalPairField, getLogisticStatementState } from 'src/utils/cannibal-list-display'

import BaStatusChip from 'src/views/pcr/cannibal/BaStatusChip'
import { buildCannibalActions } from 'src/views/pcr/cannibal/cannibalRowActions'

const formatDate = value => (value ? String(value).slice(0, 10) : '—')

const LOGISTIC_ICON = {
  confirmed: {
    icon: 'tabler:circle-check-filled',
    color: 'success.main',
    title: 'Logistic statement confirmed'
  },
  pending: {
    icon: 'tabler:clock',
    color: 'warning.main',
    title: 'Menunggu logistic statement'
  },
  not_started: {
    icon: 'tabler:circle-x',
    color: 'text.disabled',
    title: 'Belum logistic statement'
  }
}

const LogisticStatementIcon = ({ row }) => {
  const state = getLogisticStatementState(row)
  const meta = LOGISTIC_ICON[state]

  return (
    <Tooltip title={meta.title} arrow>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', color: meta.color }}>
        <Icon icon={meta.icon} fontSize='1.25rem' />
      </Box>
    </Tooltip>
  )
}

export const buildCannibalDataColumns = () => [
  { flex: 1.1, minWidth: 150, field: 'noBa', headerName: 'BA No.' },
  { flex: 0.75, minWidth: 110, field: 'projectCode', headerName: 'Project' },
  {
    flex: 1,
    minWidth: 150,
    field: 'postingDate',
    headerName: 'Posting Date',
    valueFormatter: ({ value }) => formatDate(value)
  },
  {
    flex: 1.1,
    minWidth: 160,
    field: 'removedUnitNo',
    headerName: 'Removed Unit',
    sortable: false,
    valueGetter: ({ row }) => formatCannibalPairField(row.pairs, 'remove', 'unitNo')
  },
  {
    flex: 1.1,
    minWidth: 160,
    field: 'installedUnitNo',
    headerName: 'Installed Unit',
    sortable: false,
    valueGetter: ({ row }) => formatCannibalPairField(row.pairs, 'install', 'unitNo')
  },
  {
    flex: 0.9,
    minWidth: 120,
    field: 'pn',
    headerName: 'PN',
    sortable: false,
    valueGetter: ({ row }) => {
      const fromRemove = formatCannibalPairField(row.pairs, 'remove', 'pn')
      const fromInstall = formatCannibalPairField(row.pairs, 'install', 'pn')
      if (fromRemove !== '—') return fromRemove
      if (fromInstall !== '—') return fromInstall

      return '—'
    }
  },
  {
    flex: 1.5,
    minWidth: 180,
    field: 'component',
    headerName: 'Component',
    sortable: false,
    valueGetter: ({ row }) => {
      const fromRemove = formatCannibalPairField(row.pairs, 'remove', 'compDesc')
      const fromInstall = formatCannibalPairField(row.pairs, 'install', 'compDesc')
      if (fromRemove !== '—') return fromRemove
      if (fromInstall !== '—') return fromInstall

      return '—'
    }
  },
  {
    flex: 0.85,
    minWidth: 130,
    field: 'logisticStatement',
    headerName: 'Logistic',
    sortable: false,
    align: 'center',
    headerAlign: 'center',
    renderCell: ({ row }) => <LogisticStatementIcon row={row} />
  },
  {
    flex: 1.3,
    minWidth: 180,
    field: 'approval',
    headerName: 'Approval',
    sortable: false,
    valueGetter: ({ row }) => getCurrentCannibalFlowStage(row)
  },
  {
    flex: 0.9,
    minWidth: 130,
    field: 'statusBa',
    headerName: 'Status',
    renderCell: ({ row }) => <BaStatusChip status={row.statusBa} />
  }
]

export const buildCannibalGridColumns = ({
  canEdit,
  canSubmitPlant,
  canSubmitApproval,
  canClose,
  canEditExecution,
  canEditLogistic,
  handleRowAction
}) => [
  ...buildCannibalDataColumns(),
  {
    flex: 0.9,
    minWidth: 160,
    sortable: false,
    field: 'actions',
    headerName: 'Action',
    renderCell: ({ row }) => (
      <TableRowActionSelect
        size='small'
        minWidth={160}
        actions={buildCannibalActions(
          row,
          { canEdit, canSubmitPlant, canSubmitApproval, canClose, canEditExecution, canEditLogistic },
          handleRowAction
        )}
      />
    )
  }
]
