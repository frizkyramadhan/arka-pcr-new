/**
 * Close WO requirements — normal forecast: MR/PR/PO + oldcore + installation report (MAJOR only);
 * warranty forecast: installation report only (MAJOR only).
 */
export type ReplacementCloseRequirements = {
  isWarranty: boolean
  hasLinkedForecast: boolean
  isMajorComponent: boolean
  requiresProcurement: boolean
  requiresInstallationReport: boolean
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
      requiresInstallationReport: isMajorComponent
    }
  }

  return {
    isWarranty,
    hasLinkedForecast: true,
    isMajorComponent,
    requiresProcurement: !isWarranty,
    requiresInstallationReport: isMajorComponent
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
