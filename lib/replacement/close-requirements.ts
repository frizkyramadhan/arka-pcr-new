/**
 * Close WO requirements — normal: MR/PR/PO + oldcore bukti + status/prediction;
 * warranty: installation report only (MAJOR).
 */
export const OLDCORE_STATUSES = ['FIRST_LIFE_80', 'SECOND_LIFE_60', 'THIRD_LIFE_40'] as const

export const PREDICTION_OLDCORES = ['FULL_CORE', 'PARTIAL_CORE', 'BER'] as const

export type OldcoreStatus = (typeof OLDCORE_STATUSES)[number]

export type PredictionOldcore = (typeof PREDICTION_OLDCORES)[number]

export const OLDCORE_STATUS_LABELS: Record<OldcoreStatus, string> = {
  FIRST_LIFE_80: 'First Life 80%',
  SECOND_LIFE_60: 'Second Life 60%',
  THIRD_LIFE_40: 'Third Life 40%'
}

export const PREDICTION_OLDCORE_LABELS: Record<PredictionOldcore, string> = {
  FULL_CORE: 'Full Core',
  PARTIAL_CORE: 'Partial Core',
  BER: 'BER'
}

export const OLDCORE_STATUS_OPTIONS = OLDCORE_STATUSES.map(value => ({
  value,
  label: OLDCORE_STATUS_LABELS[value]
}))

export const PREDICTION_OLDCORE_OPTIONS = PREDICTION_OLDCORES.map(value => ({
  value,
  label: PREDICTION_OLDCORE_LABELS[value]
}))

export type ReplacementCloseRequirements = {
  isWarranty: boolean
  hasLinkedForecast: boolean
  isMajorComponent: boolean
  requiresProcurement: boolean
  requiresInstallationReport: boolean
  requiresOldcoreClass: boolean
}

export function resolveReplacementCloseRequirements(
  isWarranty: boolean,
  hasLinkedForecast: boolean,
  isMajorComponent: boolean
): ReplacementCloseRequirements {
  if (!hasLinkedForecast) {
    return {
      isWarranty: false,
      hasLinkedForecast: false,
      isMajorComponent,
      requiresProcurement: true,
      requiresInstallationReport: isMajorComponent,
      requiresOldcoreClass: true
    }
  }

  return {
    isWarranty,
    hasLinkedForecast: true,
    isMajorComponent,
    requiresProcurement: !isWarranty,
    requiresInstallationReport: isMajorComponent,
    requiresOldcoreClass: !isWarranty
  }
}

export const NORMAL_PROCUREMENT_FIELD_LABELS = [
  'MR No',
  'PR No',
  'PO No',
  'Return Oldcore Date',
  'SPB/BA Return Oldcore'
] as const

export function listMissingProcurementFields(input: {
  mrNo?: string | null
  prNo?: string | null
  poNo?: string | null
  returnOldcoreDate?: Date | string | null
  spbBaReturnOldcore?: string | null
}): string[] {
  const missing: string[] = []
  if (!input.mrNo?.trim()) missing.push('MR No')
  if (!input.prNo?.trim()) missing.push('PR No')
  if (!input.poNo?.trim()) missing.push('PO No')
  if (!input.returnOldcoreDate) missing.push('Return Oldcore Date')
  if (!input.spbBaReturnOldcore?.trim()) missing.push('SPB/BA Return Oldcore')

  return missing
}

export function listMissingOldcoreClassFields(input: {
  oldcoreStatus?: string | null
  predictionOldcore?: string | null
}): string[] {
  const missing: string[] = []
  if (!input.oldcoreStatus) missing.push('Oldcore Status')
  if (!input.predictionOldcore) missing.push('Prediction Oldcore')

  return missing
}
