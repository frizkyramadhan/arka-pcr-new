/**
 * Overall condition chip — NORMAL / ATTENTION / CRITICAL (legacy-aligned).
 */
import CustomChip from 'src/@core/components/mui/chip'

const CONDITION_COLORS = {
  CRITICAL: 'error',
  ATTENTION: 'warning',
  NORMAL: 'success',
  // Backward compat for rows not yet recomputed
  MONITOR: 'warning',
  GOOD: 'success'
}

const CONDITION_LABELS = {
  CRITICAL: 'Critical',
  ATTENTION: 'Attention',
  NORMAL: 'Normal',
  MONITOR: 'Attention',
  GOOD: 'Normal'
}

const OverallConditionChip = ({ condition, size = 'small' }) => {
  if (!condition) {
    return <CustomChip rounded skin='light' size={size} label='—' color='secondary' />
  }

  const normalized = String(condition).trim().toUpperCase()
  const label = CONDITION_LABELS[normalized] ?? normalized
  const color = CONDITION_COLORS[normalized] ?? 'secondary'

  return <CustomChip rounded skin='light' size={size} label={label} color={color} />
}

export default OverallConditionChip
