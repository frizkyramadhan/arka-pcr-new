/**
 * Component Condition aggregation — legacy rules (Section 6.2 UPGRADE_PLAN).
 * Inspection ratings override SOS; overall is NORMAL | ATTENTION | CRITICAL.
 */
import type { InspectionTypeCode } from '@/lib/inspection/types'
import { normalizeEvalCode, normalizeEvalCodeForStorage, type SosEvalCode, type SosRating } from '@/lib/ratings'

export type OverallCondition = 'NORMAL' | 'ATTENTION' | 'CRITICAL'

export type InspectionRating = 'A' | 'B' | 'C' | 'X'

export type SourceRatings = {

  /** Worst/latest SOS eval for display (single column). */
  sosRating: string | null

  /** All latest SOS eval codes per type — used for SOS-only aggregation. */
  sosCodes: string[]
  fcRating: InspectionRating | null
  mpsRating: InspectionRating | null
  viRating: InspectionRating | null
  ta2Rating: InspectionRating | null
  edRating: InspectionRating | null
}

export interface ConditionInput {
  inspections: InspectionRating[]
  sosCodes: string[]
}

const SOS_SEVERITY: Record<string, number> = {
  A: 1,
  B: 2,
  Normal: 2,
  C: 3,
  Attention: 3,
  D: 4,
  Urgent: 4,
  X: 5
}

export function normalizeInspectionRating(value: string | null | undefined): InspectionRating | null {
  const normalized = normalizeEvalCode(value)
  if (!normalized) return null

  return normalized
}

/** Legacy SOS path — optimistic first-match on joined eval codes. */
export function evaluateSosCondition(sosCodes: string[]): OverallCondition | null {
  if (sosCodes.length === 0) return null

  const str = sosCodes.join('')

  if (/[AB]|Normal/i.test(str)) return 'NORMAL'
  if (/C|Attention/i.test(str)) return 'ATTENTION'
  if (/[DX]|Urgent/i.test(str)) return 'CRITICAL'

  return null
}

/** Legacy inspection path — pattern on joined A/B/C/X ratings. */
export function evaluateInspectionCondition(inspections: InspectionRating[]): OverallCondition | null {
  if (inspections.length === 0) return null

  const str = inspections.join('')

  if (/[AB]/.test(str) && !str.includes('C') && !str.includes('X')) return 'NORMAL'
  if ((str.match(/C/g)?.length ?? 0) === 1 && !str.includes('X')) return 'ATTENTION'
  if ((str.match(/C/g)?.length ?? 0) > 1 || str.includes('X')) return 'CRITICAL'

  return null
}

/** Overall condition — inspection always wins when any inspection rating exists. */
export function evaluateOverallCondition(input: ConditionInput): OverallCondition | null {
  if (input.inspections.length > 0) {
    return evaluateInspectionCondition(input.inspections)
  }

  if (input.sosCodes.length > 0) {
    return evaluateSosCondition(input.sosCodes)
  }

  return null
}

export function computeOverallCondition(ratings: SourceRatings): OverallCondition | null {
  const inspections = [ratings.fcRating, ratings.mpsRating, ratings.viRating, ratings.ta2Rating, ratings.edRating].filter(
    (value): value is InspectionRating => value !== null
  )

  const sosCodes = ratings.sosCodes.length > 0 ? ratings.sosCodes : ratings.sosRating ? [ratings.sosRating] : []

  return evaluateOverallCondition({ inspections, sosCodes })
}

/** Pick worst SOS eval code for display in sos_rating column. */
export function pickDisplaySosRating(codes: Array<string | null | undefined>): string | null {
  let worst: SosEvalCode | null = null
  let worstScore = 0

  for (const code of codes) {
    const stored = normalizeEvalCodeForStorage(code)
    if (!stored) continue

    const score = SOS_SEVERITY[stored] ?? 0
    if (score > worstScore) {
      worstScore = score
      worst = stored
    }
  }

  return worst
}

export function getConditionBasis(ratings: Pick<SourceRatings, 'fcRating' | 'mpsRating' | 'viRating' | 'ta2Rating' | 'edRating'>): 'INSPECTION' | 'SOS' | null {
  const hasInspection = [ratings.fcRating, ratings.mpsRating, ratings.viRating, ratings.ta2Rating, ratings.edRating].some(
    value => value !== null
  )

  if (hasInspection) return 'INSPECTION'

  return null
}

export function inspectionTypeToRatingField(
  type: InspectionTypeCode
): 'fcRating' | 'mpsRating' | 'viRating' | 'ta2Rating' | 'edRating' {
  const map: Record<InspectionTypeCode, 'fcRating' | 'mpsRating' | 'viRating' | 'ta2Rating' | 'edRating'> = {
    FC: 'fcRating',
    MPS: 'mpsRating',
    VI: 'viRating',
    TA2: 'ta2Rating',
    ED: 'edRating'
  }

  return map[type]
}

/** Map legacy GOOD/MONITOR labels to current standard (for display of old rows). */
export function normalizeOverallConditionLabel(value: string | null | undefined): OverallCondition | string | null {
  if (!value) return null

  const upper = String(value).trim().toUpperCase()
  if (upper === 'GOOD') return 'NORMAL'
  if (upper === 'MONITOR') return 'ATTENTION'

  return upper
}
