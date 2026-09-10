/**
 * Shared row actions for forecast DataGrids (refresh, submit BA, convert, close, delete, view WO).
 */
import { canConvertForecastRow, canDeleteForecastRow } from 'src/utils/forecast-row-auth'
import {
  canEditOpenForecast,
  canUpdateSubmittedPcrType,
  missingPcrSupplySubmitMessage
} from '@/lib/forecasts/pcr-supply'

export const buildForecastActions = (row, { canEdit, canDelete, canSubmit, userId, can }, onAction) => {
  const actions = []
  const canConvert = canConvertForecastRow(row, userId, can)
  const missingType = Boolean(missingPcrSupplySubmitMessage(row))

  actions.push({
    key: 'view',
    label: 'View Detail',
    onClick: () => onAction('view', row)
  })

  if (canEdit && canEditOpenForecast(row)) {
    actions.push({
      key: 'edit',
      label: 'Edit',
      onClick: () => onAction('edit', row)
    })
    actions.push({
      key: 'refresh',
      label: 'Refresh Metrics',
      onClick: () => onAction('refresh', row)
    })
  }

  if (canEdit && canUpdateSubmittedPcrType(row)) {
    actions.push({
      key: 'update-pcr-type',
      label: 'Update PCR Type',
      onClick: () => onAction('update-pcr-type', row)
    })
  }

  if (canSubmit && row.status === 'OPEN' && ['PENDING', 'REJECTED'].includes(row.baPcrStatus) && !missingType) {
    actions.push({
      key: 'submit-ba',
      label: 'Submit BA PCR',
      onClick: () => onAction('submit-ba', row)
    })
  }

  if (canConvert) {
    actions.push({
      key: 'convert',
      label: 'Proceed to Replacement',
      onClick: () => onAction('convert', row)
    })
  } else if (row.idRep) {
    actions.push({
      key: 'view-wo',
      label: 'View Replacement',
      onClick: () => onAction('view-wo', row)
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
