/**
 * Ikon aksi baris tabel dengan tooltip — pola Vuexy (edit + delete, dll).
 */
import { useState } from 'react'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'

const EMPTY_ACTION_VALUE = ''

const ACTION_META = {
  menu: { icon: 'tabler:dots-vertical', color: 'text.secondary' },
  edit: { icon: 'tabler:edit', color: 'text.secondary' },
  delete: { icon: 'tabler:trash', color: 'error.main' },
  view: { icon: 'tabler:eye', color: 'text.secondary' },
  submit: { icon: 'tabler:send', color: 'primary.main' },
  'submit-ba': { icon: 'tabler:file-check', color: 'primary.main' },
  close: { icon: 'tabler:lock', color: 'warning.main' },
  reopen: { icon: 'tabler:lock-open', color: 'info.main' },
  convert: { icon: 'tabler:arrow-right', color: 'primary.main' },
  'create-forecast': { icon: 'tabler:calendar-plus', color: 'primary.main' },
  refresh: { icon: 'tabler:refresh', color: 'text.secondary' },
  upload: { icon: 'tabler:upload', color: 'text.secondary' },
  'view-report': { icon: 'tabler:file-text', color: 'text.secondary' },
  'delete-report': { icon: 'tabler:file-x', color: 'error.main' },
  approve: { icon: 'tabler:check', color: 'success.main' },
  reject: { icon: 'tabler:x', color: 'error.main' },
  review: { icon: 'tabler:clipboard-check', color: 'primary.main' },
  'edit-logistic': { icon: 'tabler:truck', color: 'info.main' },
  'submit-to-logistics': { icon: 'tabler:truck-delivery', color: 'primary.main' },
  'submit-to-requestor': { icon: 'tabler:user-check', color: 'primary.main' },
  'confirm-requestor': { icon: 'tabler:check', color: 'success.main' },
  'reject-requestor': { icon: 'tabler:x', color: 'error.main' },
  execution: { icon: 'tabler:file-description', color: 'primary.main' },
  cancel: { icon: 'tabler:ban', color: 'error.main' },
  'view-wo': { icon: 'tabler:tool', color: 'text.secondary' }
}

const getActionMeta = key => ACTION_META[key] ?? { icon: 'tabler:dots', color: 'text.secondary' }

const ActionMenuLabel = ({ actionKey, label }) => {
  const meta = getActionMeta(actionKey)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box component='span' sx={{ display: 'inline-flex', color: meta.color, lineHeight: 0 }}>
        <Icon icon={meta.icon} fontSize='1.125rem' />
      </Box>
      <span>{label}</span>
    </Box>
  )
}

/**
 * @param {{ actions: Array<{ key: string, label: string, onClick: () => void }> }} props
 */
export const TableRowActions = ({ actions = [], buttonSize = 'small' }) => {
  if (!actions.length) return null

  const iconButtonProps = buttonSize === 'medium' ? {} : { size: buttonSize }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      {actions.map(action => {
        const meta = getActionMeta(action.key)

        return (
          <Tooltip key={action.key} title={action.label}>
            <IconButton {...iconButtonProps} sx={{ color: meta.color }} onClick={action.onClick}>
              <Icon icon={meta.icon} />
            </IconButton>
          </Tooltip>
        )
      })}
    </Box>
  )
}

const DESTRUCTIVE_ACTION_KEYS = new Set(['delete', 'delete-report', 'reject', 'cancel'])

/**
 * Dropdown select untuk aksi baris — compact untuk DataGrid dengan banyak opsi.
 */
export const TableRowActionSelect = ({
  actions = [],
  label = 'Actions',
  size = 'small',
  minWidth = 148
}) => {
  const [value, setValue] = useState(EMPTY_ACTION_VALUE)

  if (!actions.length) return null

  const handleChange = event => {
    const selected = event.target.value
    if (!selected) return

    actions.find(action => action.key === selected)?.onClick?.()
    setValue(EMPTY_ACTION_VALUE)
  }

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', width: '100%' }}
      onClick={event => event.stopPropagation()}
    >
      <CustomTextField
        select
        size={size}
        value={value}
        onChange={handleChange}
        sx={{ minWidth, width: '100%' }}
        SelectProps={{
          displayEmpty: true,
          renderValue: selected => {
            if (!selected) {
              return <ActionMenuLabel actionKey='menu' label={label} />
            }

            const action = actions.find(item => item.key === selected)

            return action ? <ActionMenuLabel actionKey={action.key} label={action.label} /> : label
          }
        }}
      >
        <MenuItem disabled value={EMPTY_ACTION_VALUE}>
          <ActionMenuLabel actionKey='menu' label={label} />
        </MenuItem>
        {actions.map(action => (
          <MenuItem
            key={action.key}
            value={action.key}
            sx={DESTRUCTIVE_ACTION_KEYS.has(action.key) ? { color: 'error.main' } : undefined}
          >
            <ActionMenuLabel actionKey={action.key} label={action.label} />
          </MenuItem>
        ))}
      </CustomTextField>
    </Box>
  )
}

/**
 * Edit + Delete untuk halaman CRUD standar.
 */
export const TableCrudActions = ({ row, canEdit = true, onEdit, onDelete }) => {
  if (!canEdit) return null

  return (
    <TableRowActions
      actions={[
        { key: 'edit', label: 'Edit', onClick: () => onEdit(row) },
        { key: 'delete', label: 'Delete', onClick: () => onDelete(row) }
      ]}
    />
  )
}

export default TableRowActions
