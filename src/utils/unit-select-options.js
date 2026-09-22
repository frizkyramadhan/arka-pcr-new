/**
 * Unit status badge colors + SearchableSelect option builders (FMS / fleet pickers).
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import CustomChip from 'src/@core/components/mui/chip'

export const UNIT_STATUS_COLOR = {
  ACTIVE: 'success',
  'IN-ACTIVE': 'secondary',
  INACTIVE: 'secondary',
  SOLD: 'info',
  SCRAP: 'error'
}

export function unitStatusChipColor(status) {
  if (!status) return 'secondary'
  const key = String(status).trim().toUpperCase()

  return UNIT_STATUS_COLOR[key] || UNIT_STATUS_COLOR[status] || 'secondary'
}

/** Rich option content with status badge (SearchableSelect `content`). */
export function buildUnitOptionContent(unit) {
  const code = unit.code || unit.unit_no || unit.id

  const desc = [unit.model, unit.description, unit.projectName || unit.project_code || unit.projectCode]
    .filter(Boolean)
    .join(' · ')

  const status = unit.unitStatus || unit.unitstatus || null

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2, py: 0.25 }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant='body2' sx={{ fontWeight: 500, lineHeight: 1.3 }}>
          {code}
        </Typography>
        {desc ? (
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', lineHeight: 1.3 }}>
            {desc}
          </Typography>
        ) : null}
      </Box>
      {status ? (
        <CustomChip
          size='small'
          label={status}
          color={unitStatusChipColor(status)}
          skin='light'
          rounded
          sx={{ flexShrink: 0 }}
        />
      ) : null}
    </Box>
  )
}

/** Map fleet/FMS unit row → SearchableSelect option (searchable label + badge content). */
export function toUnitSearchOption(unit) {
  const code = unit.code || unit.unit_no || String(unit.id)

  const desc = [unit.model, unit.description, unit.projectName || unit.project_code || unit.projectCode]
    .filter(Boolean)
    .join(' · ')

  const status = unit.unitStatus || unit.unitstatus || ''
  const label = [code, desc, status].filter(Boolean).join(' · ')

  return {
    value: String(unit.id),
    label,
    status: status || null,
    statusColor: unitStatusChipColor(status),
    content: buildUnitOptionContent(unit)
  }
}
