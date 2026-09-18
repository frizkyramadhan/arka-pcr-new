/**
 * Checkbox permission dikelompokkan per modul (prefix kode permission).
 */
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Typography from '@mui/material/Typography'

import { groupPermissionsByModule } from 'src/utils/permission-groups'

const PermissionCheckboxGroups = ({ permissions, selectedIds, onChange }) => {
  const groups = groupPermissionsByModule(permissions)
  const selectedSet = new Set(selectedIds ?? [])

  const toggleOne = (idPermission, checked) => {
    const next = new Set(selectedSet)
    if (checked) next.add(idPermission)
    else next.delete(idPermission)
    onChange(Array.from(next))
  }

  const toggleModule = (modulePermissions, checked) => {
    const next = new Set(selectedSet)
    for (const item of modulePermissions) {
      if (checked) next.add(item.idPermission)
      else next.delete(item.idPermission)
    }
    onChange(Array.from(next))
  }

  const isModuleAllChecked = modulePermissions =>
    modulePermissions.length > 0 && modulePermissions.every(item => selectedSet.has(item.idPermission))

  const isModuleIndeterminate = modulePermissions => {
    const checkedCount = modulePermissions.filter(item => selectedSet.has(item.idPermission)).length

    return checkedCount > 0 && checkedCount < modulePermissions.length
  }

  if (groups.length === 0) {
    return (
      <Typography variant='body2' color='text.secondary'>
        No permissions available
      </Typography>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {groups.map((group, index) => (
        <Box key={group.module}>
          {index > 0 ? <Divider sx={{ mb: 3 }} /> : null}
          <FormControlLabel
            label={
              <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                {group.label}
              </Typography>
            }
            control={
              <Checkbox
                checked={isModuleAllChecked(group.permissions)}
                indeterminate={isModuleIndeterminate(group.permissions)}
                onChange={e => toggleModule(group.permissions, e.target.checked)}
              />
            }
            sx={{ ml: 0, mb: 1 }}
          />
          <FormGroup sx={{ pl: 4 }}>
            {group.permissions.map(item => (
              <FormControlLabel
                key={item.idPermission}
                label={
                  <Box>
                    <Typography variant='body2'>{item.description ?? item.actionLabel}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {item.code}
                    </Typography>
                  </Box>
                }
                control={
                  <Checkbox
                    checked={selectedSet.has(item.idPermission)}
                    onChange={e => toggleOne(item.idPermission, e.target.checked)}
                  />
                }
              />
            ))}
          </FormGroup>
        </Box>
      ))}
    </Box>
  )
}

export default PermissionCheckboxGroups
