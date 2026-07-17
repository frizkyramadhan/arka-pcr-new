/**
 * Shared row actions for forecast DataGrids (refresh, submit BA, convert, close, delete, view WO).
 */
import { canConvertForecastRow, canDeleteForecastRow } from 'src/utils/forecast-row-auth'

export const buildForecastActions = (row, { canEdit, canDelete, canSubmit, userId, can }, onAction) => {
  const actions = []
  const canConvert = canConvertForecastRow(row, userId, can)

  actions.push({
    key: 'view',
    label: 'View Detail',
    onClick: () => onAction('view', row)
  })

  if (canEdit && row.status === 'OPEN' && ['PENDING', 'REJECTED'].includes(row.baPcrStatus)) {
    actions.push({
      key: 'refresh',
      label: 'Refresh Metrics',
      onClick: () => onAction('refresh', row)
    })
  }

  if (canSubmit && row.status === 'OPEN' && ['PENDING', 'REJECTED'].includes(row.baPcrStatus)) {
    actions.push({
      key: 'submit-ba',
      label: 'Submit BA PCR',
      onClick: () => onAction('submit-ba', row)
    })
  }

  if (canConvert) {
    actions.push({
      key: 'convert',
      label: 'Convert to WO',
      onClick: () => onAction('convert', row)
    })
  }

  if (row.idRep) {
    actions.push({
      key: 'view-wo',
      label: 'View Replacement',
      onClick: () => onAction('view-wo', row)
    })
  }

  if (canEdit && row.status === 'OPEN') {
    actions.push({
      key: 'close',
      label: 'Close Forecast',
      onClick: () => onAction('close', row)
    })
  }

  if (canDelete && canDeleteForecastRow(row)) {
    actions.push({
      key: 'delete',
      label: 'Delete',
      onClick: () => onAction('delete', row)
    })
  }

  return actions
}
