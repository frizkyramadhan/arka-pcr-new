export type SosRating = 'A' | 'B' | 'C' | 'X'

export const SOS_EVAL_OPTIONS = ['A', 'B', 'C', 'D', 'X', 'Normal', 'Attention', 'Urgent'] as const

export type SosEvalCode = (typeof SOS_EVAL_OPTIONS)[number]

export const RATING_EXCEL_COLOR: Record<SosRating, string> = {
  A: 'FF28C76F',
  B: 'FFFF9F43',
  C: 'FFEA5455',
  X: 'FF7367F0'
}

const EVAL_STORAGE_ALIASES: Record<string, SosEvalCode> = {
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  x: 'X',
  normal: 'Normal',
  attention: 'Attention',
  urgent: 'Urgent'
}

const EVAL_TO_SEVERITY_RATING: Record<SosEvalCode, SosRating> = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'C',
  X: 'X',
  Normal: 'A',
  Attention: 'B',
  Urgent: 'C'
}

/** Canonical eval code for DB storage (varchar 25). */
export function normalizeEvalCodeForStorage(value: string | null | undefined): SosEvalCode | null {
  if (!value) return null

  const trimmed = value.trim()
  const alias = EVAL_STORAGE_ALIASES[trimmed.toLowerCase()]
  if (alias) return alias

  const first = trimmed.toUpperCase().charAt(0)
  if (first === 'A' || first === 'B' || first === 'C' || first === 'D' || first === 'X') {
    return first as SosEvalCode
  }

  return null
}

/** Map stored eval to A/B/C/X for condition severity & inspection-style chips. */
export function normalizeEvalCode(value: string | null | undefined): SosRating | null {
  const stored = normalizeEvalCodeForStorage(value)
  if (!stored) return null

  return EVAL_TO_SEVERITY_RATING[stored]
}

export function isValidEvalCode(value: string | null | undefined): boolean {
  return normalizeEvalCodeForStorage(value) !== null
}
