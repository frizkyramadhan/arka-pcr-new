/**
 * Replacement row actions — build action list + grid wrapper (BA approval gate).
 */
import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import TableRowActions from 'src/@core/components/table-row-actions'

import { canExecuteReplacementRow, getReplacementActionBlockReason } from 'src/utils/replacement-row-auth'

export const buildReplacementActions = (row, canEdit, onAction, options = {}) => {
  const {
    canDelete = false,
    canManageClosed = false,
    canEditClosed = false,
    isMajor = false,
    canCreateForecast = false
  } = options
  const canExecute = canExecuteReplacementRow(row)
  const isOpenWithoutForecast = row.woStatus === 'OPEN' && !row.linkedForecast

  const actions = []

  if (isOpenWithoutForecast && canCreateForecast) {
    actions.push({
      key: 'create-forecast',
      label: 'Create Forecast',
      onClick: () => onAction('create-forecast', row)
    })

    return actions
  }

  if (row.woStatus === 'OPEN' && canEdit && canExecute) {
    actions.push(
      { key: 'edit', label: 'Edit', onClick: () => onAction('edit', row) },
      { key: 'close', label: 'Close WO', onClick: () => onAction('close', row) }
    )
    if (isMajor) {
      actions.push({ key: 'upload', label: 'Upload Report PDF', onClick: () => onAction('upload', row) })
    }
  }

  if (row.woStatus === 'OPEN' && canDelete && canExecute) {
    actions.push({ key: 'delete', label: 'Delete', onClick: () => onAction('delete', row) })
  }

  if (row.woStatus === 'CLOSE' && canEditClosed) {
    actions.push({ key: 'edit', label: 'Edit Closed WO', onClick: () => onAction('edit', row) })
  }

  if (row.woStatus === 'CLOSE' && canManageClosed) {
    actions.push({ key: 'reopen', label: 'Reopen WO', onClick: () => onAction('reopen', row) })
  }

  if (row.woStatus === 'CLOSE' && canDelete) {
    actions.push({ key: 'delete', label: 'Delete', onClick: () => onAction('delete', row) })
  }

  const canShowReportActions = isMajor && row.report && (row.woStatus !== 'OPEN' || canExecute)

  if (canShowReportActions) {
    const canManageReport = canEdit || (row.woStatus === 'CLOSE' && canEditClosed)

    if (canManageReport) {
      actions.push(
        { key: 'view-report', label: 'View Report', onClick: () => onAction('view-report', row) },
        { key: 'delete-report', label: 'Remove Report', onClick: () => onAction('delete-report', row) }
      )
    } else {
      actions.push({ key: 'view-report', label: 'View Report', onClick: () => onAction('view-report', row) })
    }
  }

  return actions
}

const ReplacementRowActions = ({ row, canEdit, onAction, options = {}, buttonSize = 'medium' }) => {
  const actions = buildReplacementActions(row, canEdit, onAction, options)
  const blockReason = getReplacementActionBlockReason(row)

  if (!actions.length && blockReason) {
    const hintLabel = row?.linkedForecast ? 'Awaiting BA approval' : 'Create forecast first'

    return (
      <Tooltip title={blockReason}>
        <Box sx={{ maxWidth: '100%' }}>
          <Typography variant='caption' sx={{ color: 'warning.main', fontWeight: 600, display: 'block' }}>
            {hintLabel}
          </Typography>
        </Box>
      </Tooltip>
    )
  }

  return <TableRowActions buttonSize={buttonSize} actions={actions} />
}

export default ReplacementRowActions
