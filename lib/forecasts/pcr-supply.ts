/**
 * PCR supply fields for non-warranty forecasts (type, location, lifetime, return-to).
 * Warranty keeps these null.
 */
import { z } from 'zod'

export const PCR_SUPPLY_CATEGORIES = ['PTA_REMAN', 'NEW_COMPONENT', 'REPAIR'] as const

export const REPAIR_SITES = ['ON_SITE', 'OUT_SITE'] as const

export const REPAIR_VENDOR_KINDS = ['APS', 'DEALER', 'VENDOR_OEM'] as const

/** Stored + legacy. UI no longer offers RETURN. */
export const REPAIR_LIFE_MODES = ['RETURN', 'CONTINUE_LIFE', 'BACK_TO_ZERO'] as const

export const LIFETIME_MODES = ['CONTINUE_LIFE', 'BACK_TO_ZERO'] as const

export const PCR_COMPONENT_GRADES = ['EX_REPAIR', 'USED'] as const

export const PCR_RETURN_TO = ['ORIGINAL_UNIT', 'OTHER_UNIT'] as const

export type PcrSupplyCategory = (typeof PCR_SUPPLY_CATEGORIES)[number]

export type RepairSite = (typeof REPAIR_SITES)[number]

export type RepairVendorKind = (typeof REPAIR_VENDOR_KINDS)[number]

export type RepairLifeMode = (typeof REPAIR_LIFE_MODES)[number]

export type LifetimeMode = (typeof LIFETIME_MODES)[number]

export type PcrComponentGrade = (typeof PCR_COMPONENT_GRADES)[number]

export type PcrReturnTo = (typeof PCR_RETURN_TO)[number]

export const PCR_SUPPLY_CATEGORY_LABELS: Record<PcrSupplyCategory, string> = {
  PTA_REMAN: 'PTA Reman',
  NEW_COMPONENT: 'New Component',
  REPAIR: 'Repair'
}

export const REPAIR_SITE_LABELS: Record<RepairSite, string> = {
  ON_SITE: 'On Site',
  OUT_SITE: 'Out Site'
}

export const REPAIR_VENDOR_KIND_LABELS: Record<RepairVendorKind, string> = {
  APS: 'APS',
  DEALER: 'Dealer',
  VENDOR_OEM: 'Vendor OEM'
}

export const REPAIR_LIFE_MODE_LABELS: Record<RepairLifeMode, string> = {
  RETURN: 'Continue Life',
  CONTINUE_LIFE: 'Continue Life',
  BACK_TO_ZERO: 'Back to Zero'
}

export const PCR_COMPONENT_GRADE_LABELS: Record<PcrComponentGrade, string> = {
  EX_REPAIR: 'Component Ex Repair',
  USED: 'Component Used'
}

export const PCR_RETURN_TO_LABELS: Record<PcrReturnTo, string> = {
  ORIGINAL_UNIT: 'Original Unit',
  OTHER_UNIT: 'Other Unit'
}

export const PCR_SUPPLY_CATEGORY_OPTIONS = PCR_SUPPLY_CATEGORIES.map(value => ({
  value,
  label: PCR_SUPPLY_CATEGORY_LABELS[value]
}))

export const REPAIR_SITE_OPTIONS = REPAIR_SITES.map(value => ({
  value,
  label: REPAIR_SITE_LABELS[value]
}))

export const REPAIR_VENDOR_KIND_OPTIONS = REPAIR_VENDOR_KINDS.map(value => ({
  value,
  label: value === 'APS' ? 'APS (Kariangau workshop)' : REPAIR_VENDOR_KIND_LABELS[value]
}))

export const LIFETIME_MODE_OPTIONS = LIFETIME_MODES.map(value => ({
  value,
  label: REPAIR_LIFE_MODE_LABELS[value]
}))

/** @deprecated Use LIFETIME_MODE_OPTIONS — RETURN removed from UI. */
export const REPAIR_LIFE_MODE_OPTIONS = LIFETIME_MODE_OPTIONS

export const PCR_COMPONENT_GRADE_OPTIONS = PCR_COMPONENT_GRADES.map(value => ({
  value,
  label: PCR_COMPONENT_GRADE_LABELS[value]
}))

export const PCR_RETURN_TO_OPTIONS = PCR_RETURN_TO.map(value => ({
  value,
  label: PCR_RETURN_TO_LABELS[value]
}))

export const MISSING_PCR_TYPE_MESSAGE =
  'Complete the PCR type (PTA Reman, New Component, or Repair) before submitting BA PCR'

export const MISSING_CANNIBAL_LINK_MESSAGE =
  'Link a cannibal BA (draft is enough) before submitting BA PCR for Return To Other Unit'

export type PcrSupplyFields = {
  pcrSupplyCategory?: string | null
  repairSite?: string | null
  repairVendorKind?: string | null
  repairDealerName?: string | null
  repairLifeMode?: string | null
  pcrComponentGrade?: string | null
  pcrReturnTo?: string | null
  returnOtherFleetUnitId?: number | null
  cannibalNoBa?: string | null
}

export type PcrSupplyPrismaData = {
  pcrSupplyCategory: string | null
  repairSite: string | null
  repairVendorKind: string | null
  repairDealerName: string | null
  repairLifeMode: string | null
  pcrComponentGrade: string | null
  pcrReturnTo: string | null
  returnOtherFleetUnitId: number | null
  cannibalNoBa: string | null
}

export function normalizeLifetimeMode(mode: string | null | undefined): LifetimeMode | null {
  if (mode === 'RETURN' || mode === 'CONTINUE_LIFE') return 'CONTINUE_LIFE'
  if (mode === 'BACK_TO_ZERO') return 'BACK_TO_ZERO'

  return null
}

export const emptyPcrSupplyForm = () => ({
  pcrSupplyCategory: '',
  repairSite: '',
  repairVendorKind: '',
  repairDealerName: '',
  repairLifeMode: '',
  pcrComponentGrade: '',
  pcrReturnTo: '',
  returnOtherFleetUnitId: '',
  cannibalNoBa: ''
})

export function pcrSupplyFormFromForecast(forecast: PcrSupplyFields | null | undefined) {
  const lifetime = normalizeLifetimeMode(forecast?.repairLifeMode)

  const returnTo =
    forecast?.pcrReturnTo || (forecast?.repairLifeMode === 'RETURN' ? 'ORIGINAL_UNIT' : '')

  return {
    pcrSupplyCategory: forecast?.pcrSupplyCategory ?? '',
    repairSite: forecast?.repairSite ?? '',
    repairVendorKind: forecast?.repairVendorKind ?? '',
    repairDealerName: forecast?.repairDealerName ?? '',
    repairLifeMode: lifetime ?? '',
    pcrComponentGrade: forecast?.pcrComponentGrade ?? '',
    pcrReturnTo: returnTo,
    returnOtherFleetUnitId: forecast?.returnOtherFleetUnitId ? String(forecast.returnOtherFleetUnitId) : '',
    cannibalNoBa: forecast?.cannibalNoBa ?? ''
  }
}

export function pcrSupplyPayloadFromForm(form: ReturnType<typeof emptyPcrSupplyForm>): PcrSupplyFields {
  const otherId = Number(form.returnOtherFleetUnitId)

  return {
    pcrSupplyCategory: form.pcrSupplyCategory || null,
    repairSite: form.repairSite || null,
    repairVendorKind: form.repairVendorKind || null,
    repairDealerName: form.repairDealerName.trim() || null,
    repairLifeMode: form.repairLifeMode || null,
    pcrComponentGrade: form.pcrComponentGrade || null,
    pcrReturnTo: form.pcrReturnTo || null,
    returnOtherFleetUnitId: Number.isFinite(otherId) && otherId > 0 ? otherId : null,
    cannibalNoBa: form.cannibalNoBa.trim() || null
  }
}

/** Keyword hint for forecast remark; refill when the component changes. */
export function remarkHintFromCompDesc(compDesc: string | null | undefined): string {
  const text = String(compDesc ?? '').toLowerCase()
  if (!text) return ''
  if (
    text.includes('cylinder') ||
    text.includes('silinder') ||
    text.includes('suspension') ||
    text.includes('suspensi')
  ) {
    return 'Reseal'
  }
  if (text.includes('engine')) return 'Top Overhaul'

  return ''
}

/** Persist/display remark — keep user text, else default from component desc. */
export function resolveForecastRemark(
  remark: string | null | undefined,
  compDesc: string | null | undefined
): string | null {
  const trimmed = String(remark ?? '').trim()
  if (trimmed) return trimmed

  const hint = remarkHintFromCompDesc(compDesc)

  return hint || null
}

export function refinePcrSupplyFields(data: PcrSupplyFields, ctx: z.RefinementCtx, required: boolean) {
  const category = data.pcrSupplyCategory ?? null
  if (!category) {
    if (required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pcrSupplyCategory'],
        message: 'Select PCR type'
      })
    }

    return
  }

  if (!data.repairSite) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['repairSite'],
      message: 'Select location'
    })
  }

  const lifetime = normalizeLifetimeMode(data.repairLifeMode)
  if (!lifetime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['repairLifeMode'],
      message: 'Select lifetime mode'
    })
  }

  if (data.repairSite === 'OUT_SITE') {
    if (!data.repairVendorKind) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['repairVendorKind'],
        message: 'Select out-site destination'
      })
    }

    if (data.repairVendorKind === 'DEALER' && !String(data.repairDealerName ?? '').trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['repairDealerName'],
        message: 'Dealer name is required'
      })
    }

    if (data.repairVendorKind === 'APS') {
      if (!data.pcrComponentGrade) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pcrComponentGrade'],
          message: 'Select component grade'
        })
      }

      if (data.pcrComponentGrade === 'USED' && lifetime === 'BACK_TO_ZERO') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['repairLifeMode'],
          message: 'Used components only allow Continue Life'
        })
      }
    }
  }

  const returnTo = data.pcrReturnTo ?? null
  if (!returnTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pcrReturnTo'],
      message: 'Select return to'
    })
  }

  if (returnTo === 'OTHER_UNIT') {
    if (category !== 'REPAIR') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['pcrReturnTo'],
        message: 'Return to Other Unit is only allowed for Repair'
      })
    }

    if (!data.returnOtherFleetUnitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['returnOtherFleetUnitId'],
        message: 'Select the other unit'
      })
    }
  }
}

export function toPcrSupplyPrismaData(
  input: PcrSupplyFields,
  { isWarranty }: { isWarranty: boolean }
): PcrSupplyPrismaData {
  const empty: PcrSupplyPrismaData = {
    pcrSupplyCategory: null,
    repairSite: null,
    repairVendorKind: null,
    repairDealerName: null,
    repairLifeMode: null,
    pcrComponentGrade: null,
    pcrReturnTo: null,
    returnOtherFleetUnitId: null,
    cannibalNoBa: null
  }

  if (isWarranty || !input.pcrSupplyCategory) return empty

  const repairSite = input.repairSite ?? null
  const repairVendorKind = repairSite === 'OUT_SITE' ? input.repairVendorKind ?? null : null

  const repairDealerName =
    repairSite === 'OUT_SITE' && repairVendorKind === 'DEALER'
      ? String(input.repairDealerName ?? '').trim() || null
      : null

  const pcrComponentGrade =
    repairSite === 'OUT_SITE' && repairVendorKind === 'APS' ? input.pcrComponentGrade ?? null : null

  const repairLifeMode = normalizeLifetimeMode(input.repairLifeMode)

  const isOther = input.pcrSupplyCategory === 'REPAIR' && input.pcrReturnTo === 'OTHER_UNIT'

  return {
    pcrSupplyCategory: input.pcrSupplyCategory,
    repairSite,
    repairVendorKind,
    repairDealerName,
    repairLifeMode,
    pcrComponentGrade,
    pcrReturnTo: isOther ? 'OTHER_UNIT' : input.pcrReturnTo === 'ORIGINAL_UNIT' ? 'ORIGINAL_UNIT' : input.pcrReturnTo ?? 'ORIGINAL_UNIT',
    returnOtherFleetUnitId: isOther ? input.returnOtherFleetUnitId ?? null : null,
    cannibalNoBa: isOther ? input.cannibalNoBa?.trim() || null : null
  }
}

export function formatPcrSupplySummary(row: PcrSupplyFields | null | undefined): string {
  const category = row?.pcrSupplyCategory as PcrSupplyCategory | null | undefined
  if (!category || !(category in PCR_SUPPLY_CATEGORY_LABELS)) return ''

  const parts = [PCR_SUPPLY_CATEGORY_LABELS[category]]
  const site = row?.repairSite as RepairSite | null | undefined
  if (site && site in REPAIR_SITE_LABELS) parts.push(REPAIR_SITE_LABELS[site])

  if (site === 'OUT_SITE') {
    const vendor = row?.repairVendorKind as RepairVendorKind | null | undefined
    if (vendor === 'DEALER' && row?.repairDealerName) {
      parts.push(`Dealer (${row.repairDealerName})`)
    } else if (vendor && vendor in REPAIR_VENDOR_KIND_LABELS) {
      parts.push(REPAIR_VENDOR_KIND_LABELS[vendor])
    }

    const grade = row?.pcrComponentGrade as PcrComponentGrade | null | undefined
    if (grade && grade in PCR_COMPONENT_GRADE_LABELS) parts.push(PCR_COMPONENT_GRADE_LABELS[grade])
  }

  const life = normalizeLifetimeMode(row?.repairLifeMode)
  if (life) parts.push(REPAIR_LIFE_MODE_LABELS[life])

  const returnTo = row?.pcrReturnTo as PcrReturnTo | null | undefined
  if (returnTo && returnTo in PCR_RETURN_TO_LABELS) parts.push(PCR_RETURN_TO_LABELS[returnTo])

  return parts.join(' · ')
}

type ForecastTypeGate = {
  status?: string | null
  forecastStatus?: string | null
  isWarranty?: boolean | null
  pcrSupplyCategory?: string | null
  repairSite?: string | null
  repairLifeMode?: string | null
  pcrReturnTo?: string | null
  cannibalNoBa?: string | null
  baPcrStatus?: string | null
}

function forecastStatusOf(row: ForecastTypeGate) {
  return row.status ?? row.forecastStatus ?? null
}

export function canEditOpenForecast(row: ForecastTypeGate | null | undefined) {
  if (!row || forecastStatusOf(row) !== 'OPEN') return false
  const ba = row.baPcrStatus ?? 'PENDING'

  return ba === 'PENDING' || ba === 'REJECTED'
}

/** Submitted BA still missing PTA/New/Repair — dedicated update, not full edit. */
export function canUpdateSubmittedPcrType(row: ForecastTypeGate | null | undefined) {
  if (!row || forecastStatusOf(row) !== 'OPEN') return false
  if (row.isWarranty) return false
  if (row.pcrSupplyCategory) return false
  const ba = row.baPcrStatus ?? 'PENDING'

  return ba !== 'PENDING' && ba !== 'REJECTED'
}

export function missingPcrSupplySubmitMessage(row: ForecastTypeGate | null | undefined) {
  if (!row || row.isWarranty) return null
  if (!row.pcrSupplyCategory) return MISSING_PCR_TYPE_MESSAGE
  if (!row.repairSite || !normalizeLifetimeMode(row.repairLifeMode) || !row.pcrReturnTo) {
    return 'Complete location, lifetime mode, and return to before submitting BA PCR'
  }
  if (row.pcrReturnTo === 'OTHER_UNIT' && !row.cannibalNoBa) return MISSING_CANNIBAL_LINK_MESSAGE

  return null
}

export function assertPcrSupplyReadyToSubmit(row: ForecastTypeGate) {
  const message = missingPcrSupplySubmitMessage(row)
  if (message) throw new Error(message)
}

/** Saved path from DB — null when legacy row never chose Normal vs Warranty. */
export function storedForecastPath(row: {
  isWarranty?: boolean | null
  pcrSupplyCategory?: string | null
}): 'normal' | 'warranty' | null {
  if (row.isWarranty) return 'warranty'
  if (row.pcrSupplyCategory) return 'normal'

  return null
}

export function resolveForecastPath(
  selectedPath: 'normal' | 'warranty' | null,
  underPolicy: boolean,
  savedPath: 'normal' | 'warranty' | null = null
): 'normal' | 'warranty' | null {
  if (selectedPath) return selectedPath
  if (savedPath) return savedPath
  if (!underPolicy) return 'normal'

  return null
}
