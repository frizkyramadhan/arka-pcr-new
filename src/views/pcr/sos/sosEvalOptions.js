/**
 * Opsi eval SOS — dipakai filter, form, dan chip.
 */
export const SOS_EVAL_OPTIONS = ['A', 'B', 'C', 'D', 'X', 'Normal', 'Attention', 'Urgent']

export const SOS_EVAL_CHIP_COLORS = {
  A: 'success',
  B: 'info',
  C: 'warning',
  D: 'warning',
  X: 'error',
  Normal: 'success',
  Attention: 'info',
  Urgent: 'warning'
}

/** Normalisasi label tampilan dari nilai DB (case-insensitive). */
export function formatEvalCodeLabel(value) {
  if (!value) return null

  const trimmed = String(value).trim()
  const match = SOS_EVAL_OPTIONS.find(option => option.toLowerCase() === trimmed.toLowerCase())

  return match ?? trimmed
}
