/**
 * Shared row actions for inspection DataGrids (edit, delete).
 */

export const buildInspectionActions = (row, canEdit, canDelete, onAction) => {
  const actions = []

  if (canEdit) {
    actions.push({ key: 'edit', label: 'Edit', onClick: () => onAction('edit', row) })
  }

  if (canDelete) {
    actions.push({ key: 'delete', label: 'Delete', onClick: () => onAction('delete', row) })
  }

  return actions
}
