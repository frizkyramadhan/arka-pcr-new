/**
 * PCR supply category for non-warranty forecasts (PTA Reman / New / Repair).
 * Warranty stays on isWarranty — these fields stay null.
 */
import { z } from 'zod'

export const PCR_SUPPLY_CATEGORIES = ['PTA_REMAN', 'NEW_COMPONENT', 'REPAIR'] as const

export const REPAIR_SITES = ['ON_SITE', 'OUT_SITE'] as const

export const REPAIR_VENDOR_KINDS = ['APS', 'DEALER'] as const

export const REPAIR_LIFE_MODES = ['RETURN', 'CONTINUE_LIFE', 'BACK_TO_ZERO'] as const

export type PcrSupplyCategory = (typeof PCR_SUPPLY_CATEGORIES)[number]

export type RepairSite = (typeof REPAIR_SITES)[number]

export type RepairVendorKind = (typeof REPAIR_VENDOR_KINDS)[number]

export type RepairLifeMode = (typeof REPAIR_LIFE_MODES)[number]

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
  DEALER: 'Dealer'
}

export const REPAIR_LIFE_MODE_LABELS: Record<RepairLifeMode, string> = {
  RETURN: 'Return',
  CONTINUE_LIFE: 'Continue Life',
  BACK_TO_ZERO: 'Back to Zero'
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

export const REPAIR_LIFE_MODE_OPTIONS = REPAIR_LIFE_MODES.map(value => ({
  value,
  label: REPAIR_LIFE_MODE_LABELS[value]
}))

export const MISSING_PCR_TYPE_MESSAGE =
  'Complete the PCR type (PTA Reman, New Component, or Repair) before submitting BA PCR'

export type PcrSupplyFields = {
  pcrSupplyCategory?: string | null
  repairSite?: string | null
  repairVendorKind?: string | null
  repairDealerName?: string | null
  repairLifeMode?: string | null
}

export type PcrSupplyPrismaData = {
  pcrSupplyCategory: string | null
  repairSite: string | null
  repairVendorKind: string | null
  repairDealerName: string | null
  repairLifeMode: string | null
}

export const emptyPcrSupplyForm = () => ({
  pcrSupplyCategory: '',
  repairSite: '',
  repairVendorKind: '',
  repairDealerName: '',
  repairLifeMode: ''
})

export function pcrSupplyFormFromForecast(forecast: PcrSupplyFields | null | undefined) {
  return {
    pcrSupplyCategory: forecast?.pcrSupplyCategory ?? '',
    repairSite: forecast?.repairSite ?? '',
    repairVendorKind: forecast?.repairVendorKind ?? '',
    repairDealerName: forecast?.repairDealerName ?? '',
    repairLifeMode: forecast?.repairLifeMode ?? ''
  }
}

export function pcrSupplyPayloadFromForm(form: ReturnType<typeof emptyPcrSupplyForm>): PcrSupplyFields {
  return {
    pcrSupplyCategory: form.pcrSupplyCategory || null,
    repairSite: form.repairSite || null,
    repairVendorKind: form.repairVendorKind || null,
    repairDealerName: form.repairDealerName.trim() || null,
    repairLifeMode: form.repairLifeMode || null
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

  if (category !== 'REPAIR') return

  if (!data.repairSite) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['repairSite'],
      message: 'Select repair location'
    })
  }

  if (!data.repairLifeMode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['repairLifeMode'],
      message: 'Select repair life mode'
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
  }
}

export function toPcrSupplyPrismaData(
  input: PcrSupplyFields,
  { isWarranty }: { isWarranty: boolean }
): PcrSupplyPrismaData {
  if (isWarranty || !input.pcrSupplyCategory) {
    return {
      pcrSupplyCategory: null,
      repairSite: null,
      repairVendorKind: null,
      repairDealerName: null,
      repairLifeMode: null
    }
  }

  if (input.pcrSupplyCategory !== 'REPAIR') {
    return {
      pcrSupplyCategory: input.pcrSupplyCategory,
      repairSite: null,
      repairVendorKind: null,
      repairDealerName: null,
      repairLifeMode: null
    }
  }

  const repairSite = input.repairSite ?? null
  const repairVendorKind = repairSite === 'OUT_SITE' ? input.repairVendorKind ?? null : null

  const repairDealerName =
    repairSite === 'OUT_SITE' && repairVendorKind === 'DEALER' ? String(input.repairDealerName ?? '').trim() || null : null

  return {
    pcrSupplyCategory: 'REPAIR',
    repairSite,
    repairVendorKind,
    repairDealerName,
    repairLifeMode: input.repairLifeMode ?? null
  }
}

export function formatPcrSupplySummary(row: PcrSupplyFields | null | undefined): string {
  const category = row?.pcrSupplyCategory as PcrSupplyCategory | null | undefined
  if (!category || !(category in PCR_SUPPLY_CATEGORY_LABELS)) return ''

  if (category !== 'REPAIR') return PCR_SUPPLY_CATEGORY_LABELS[category]

  const parts = [PCR_SUPPLY_CATEGORY_LABELS.REPAIR]
  const site = row?.repairSite as RepairSite | null | undefined
  if (site && site in REPAIR_SITE_LABELS) parts.push(REPAIR_SITE_LABELS[site])

  if (site === 'OUT_SITE') {
    const vendor = row?.repairVendorKind as RepairVendorKind | null | undefined
    if (vendor === 'DEALER' && row?.repairDealerName) {
      parts.push(`Dealer (${row.repairDealerName})`)
    } else if (vendor && vendor in REPAIR_VENDOR_KIND_LABELS) {
      parts.push(REPAIR_VENDOR_KIND_LABELS[vendor])
    }
  }

  const life = row?.repairLifeMode as RepairLifeMode | null | undefined
  if (life && life in REPAIR_LIFE_MODE_LABELS) parts.push(REPAIR_LIFE_MODE_LABELS[life])

  return parts.join(' · ')
}

type ForecastTypeGate = {
  status?: string | null
  forecastStatus?: string | null
  isWarranty?: boolean | null
  pcrSupplyCategory?: string | null
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
  if (row.pcrSupplyCategory) return null

  return MISSING_PCR_TYPE_MESSAGE
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
