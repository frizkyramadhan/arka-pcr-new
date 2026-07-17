/**

 * Checkbox permission dikelompokkan per tier bisnis (system, operations, approval, …).

 */

import Box from '@mui/material/Box'

import Checkbox from '@mui/material/Checkbox'

import Divider from '@mui/material/Divider'

import FormControlLabel from '@mui/material/FormControlLabel'

import FormGroup from '@mui/material/FormGroup'

import Typography from '@mui/material/Typography'



const TIER_ORDER = [

  'system',

  'operations',

  'master',

  'approval_forecast',

  'approval_cannibal',

  'reports'

]



const TIER_LABELS = {

  system: 'System & Administration',

  operations: 'Operations',

  master: 'Master Data',

  approval_forecast: 'Forecast BA PCR Approval',

  approval_cannibal: 'Cannibal BA Approval',

  reports: 'Reports & Exports',

  other: 'Other'

}



function tierForPermission(permission) {

  const code = permission?.code ?? ''

  if (code.startsWith('forecasts.approve.')) return 'approval_forecast'

  if (code.startsWith('cannibals.approve.')) return 'approval_cannibal'

  if (code.startsWith('exports.') || code === 'reports.access') return 'reports'

  if (

    code.startsWith('components.') ||

    code.startsWith('model-components.') ||

    code.startsWith('hour-meters.')

  ) {

    return 'master'

  }

  if (

    code.startsWith('users.') ||

    code.startsWith('roles.') ||

    code.startsWith('permissions.') ||

    code.startsWith('units.') ||

    code.startsWith('system.')

  ) {

    return 'system'

  }



  return 'operations'

}



function groupPermissionsByTier(permissions) {

  const groups = new Map()



  for (const permission of permissions ?? []) {

    if (!permission?.code) continue



    const tier = tierForPermission(permission)

    const dotIndex = permission.code.indexOf('.')

    const actionLabel = dotIndex > 0 ? permission.code.slice(dotIndex + 1) : permission.code



    if (!groups.has(tier)) groups.set(tier, [])



    groups.get(tier).push({

      ...permission,

      actionLabel

    })

  }



  return TIER_ORDER.filter(tier => groups.has(tier)).map(tier => ({

    tier,

    label: TIER_LABELS[tier] ?? tier,

    permissions: groups.get(tier).sort((a, b) => (a?.code ?? '').localeCompare(b?.code ?? ''))

  }))

}



const PermissionCheckboxGroups = ({ permissions, selectedIds, onChange }) => {

  const groups = groupPermissionsByTier(permissions)

  const selectedSet = new Set(selectedIds ?? [])



  const toggleOne = (idPermission, checked) => {

    const next = new Set(selectedSet)

    if (checked) next.add(idPermission)

    else next.delete(idPermission)

    onChange(Array.from(next))

  }



  const toggleTier = (tierPermissions, checked) => {

    const next = new Set(selectedSet)

    for (const item of tierPermissions) {

      if (checked) next.add(item.idPermission)

      else next.delete(item.idPermission)

    }

    onChange(Array.from(next))

  }



  const isTierAllChecked = tierPermissions =>

    tierPermissions.length > 0 && tierPermissions.every(item => selectedSet.has(item.idPermission))



  const isTierIndeterminate = tierPermissions => {

    const checkedCount = tierPermissions.filter(item => selectedSet.has(item.idPermission)).length



    return checkedCount > 0 && checkedCount < tierPermissions.length

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

        <Box key={group.tier}>

          {index > 0 ? <Divider sx={{ mb: 3 }} /> : null}

          <FormControlLabel

            label={

              <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>

                {group.label}

              </Typography>

            }

            control={

              <Checkbox

                checked={isTierAllChecked(group.permissions)}

                indeterminate={isTierIndeterminate(group.permissions)}

                onChange={e => toggleTier(group.permissions, e.target.checked)}

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


