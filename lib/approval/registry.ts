/**
 * Registry level approval BA PCR & Cannibal — satu sumber kebenaran.
 * Tambah level baru: edit array `levels` di chain yang relevan, lalu jalankan
 * `npx tsx scripts/approval/backfill-approval-level.ts --chain=<PCR_FORECAST|CANNIBAL> --level=<CODE>`.
 */

export type ApprovalLevelConfig = {

  /** Kode level (max 5 karakter — kolom DB `level` VarChar(5)). */
  readonly level: string

  /** Label jabatan untuk UI & print. */
  readonly label: string

  /** Urutan paralel (PCR: PM/PLM/OD/FD/PD share step). */
  readonly stepOrder?: number

  /** Dibatasi project user (PS, PM pada cannibal). */
  readonly projectScoped?: boolean

  /** Label tahap menunggu untuk statusBaPcr (PCR). */
  readonly waitStageLabel?: string
}

export type ApprovalChainId = 'PCR_FORECAST' | 'CANNIBAL'

export type ApprovalChainConfig = {
  readonly id: ApprovalChainId
  readonly permissionModule: 'forecasts' | 'cannibals'
  readonly documentLabel: string
  readonly levels: readonly ApprovalLevelConfig[]
}

/** BA PCR forecast — PS → PM → PLM → OD → FD → PD */
export const PCR_FORECAST_APPROVAL_CHAIN: ApprovalChainConfig = {
  id: 'PCR_FORECAST',
  permissionModule: 'forecasts',
  documentLabel: 'BA PCR',
  levels: [
    {
      level: 'PS',
      label: 'Plant Superintendent / Dept Head',
      stepOrder: 1,
      projectScoped: true,
      waitStageLabel: 'Wait Plant Superintendent / Dept Head'
    },
    {
      level: 'PM',
      label: 'Project Manager',
      stepOrder: 2,
      projectScoped: true,
      waitStageLabel: 'Wait Project Manager'
    },
    {
      level: 'PLM',
      label: 'Plant Manager',
      stepOrder: 2,
      waitStageLabel: 'Wait Plant Manager'
    },
    {
      level: 'OD',
      label: 'Operation Director',
      stepOrder: 3,
      waitStageLabel: 'Wait Operation Director'
    },
    {
      level: 'FD',
      label: 'Commercial & Treasury Director',
      stepOrder: 3,
      waitStageLabel: 'Wait Commercial & Treasury Director'
    },
    {
      level: 'PD',
      label: 'President Director',
      stepOrder: 3,
      waitStageLabel: 'Wait President Director'
    }
  ]
}

export type ForecastApprovalContext = {
  isWarranty?: boolean | null
  pcrSupplyCategory?: string | null
}

export type ForecastChainInput = boolean | ForecastApprovalContext | null | undefined

/** BA PCR short chain — PS → PM → PLM (warranty & Normal PCR Repair). */
export const PCR_FORECAST_SHORT_APPROVAL_CHAIN: ApprovalChainConfig = {
  id: 'PCR_FORECAST',
  permissionModule: 'forecasts',
  documentLabel: 'BA PCR (short)',
  levels: PCR_FORECAST_APPROVAL_CHAIN.levels.filter(item =>
    item.level === 'PS' || item.level === 'PM' || item.level === 'PLM'
  )
}

/** @deprecated alias — same levels as short chain. */
export const PCR_FORECAST_WARRANTY_APPROVAL_CHAIN = PCR_FORECAST_SHORT_APPROVAL_CHAIN

export function forecastApprovalContextFrom(
  forecast: ForecastApprovalContext | null | undefined
): ForecastApprovalContext {
  return {
    isWarranty: Boolean(forecast?.isWarranty),
    pcrSupplyCategory: forecast?.pcrSupplyCategory ?? null
  }
}

/** Seeded rows stop before Direksi — warranty or Repair. */
export function inferForecastShortChain(approvals: Array<{ level: string }> | null | undefined): boolean {
  const levels = new Set((approvals ?? []).map(row => row.level))
  if (levels.size === 0) return false
  if (['OD', 'FD', 'PD'].some(level => levels.has(level))) return false

  return levels.has('PS') && levels.has('PLM')
}

export function usesShortForecastApprovalChain(
  ctx: ForecastApprovalContext,
  approvals?: Array<{ level: string }> | null
): boolean {
  if (ctx.isWarranty) return true
  if (ctx.pcrSupplyCategory === 'REPAIR') return true
  if (!ctx.pcrSupplyCategory && approvals?.length && inferForecastShortChain(approvals)) return true

  return false
}

export function normalizeForecastChainInput(
  input: ForecastChainInput,
  approvals?: Array<{ level: string }> | null
): ForecastApprovalContext {
  if (typeof input === 'boolean') {
    return { isWarranty: input, pcrSupplyCategory: null }
  }
  if (input && typeof input === 'object') {
    return forecastApprovalContextFrom(input)
  }
  if (approvals?.length && inferForecastShortChain(approvals)) {
    return { isWarranty: inferForecastIsWarranty(approvals), pcrSupplyCategory: null }
  }

  return { isWarranty: false, pcrSupplyCategory: null }
}

/** Resolve BA PCR approval chain from warranty flag and/or PCR supply category. */
export function getForecastApprovalChain(
  input: ForecastChainInput = false,
  approvals?: Array<{ level: string }> | null
): ApprovalChainConfig {
  const ctx = normalizeForecastChainInput(input, approvals)
  if (usesShortForecastApprovalChain(ctx, approvals)) {
    return PCR_FORECAST_SHORT_APPROVAL_CHAIN
  }

  return PCR_FORECAST_APPROVAL_CHAIN
}

/** Infer warranty when director levels were never seeded. */
export function inferForecastIsWarranty(approvals: Array<{ level: string }> | null | undefined): boolean {
  return inferForecastShortChain(approvals)
}

/** BA Cannibal — PS → PM → OGM → PGM → OD → PD. projectScoped = ba.projectCode, bukan unit transfer. */
export const CANNIBAL_BA_APPROVAL_CHAIN: ApprovalChainConfig = {
  id: 'CANNIBAL',
  permissionModule: 'cannibals',
  documentLabel: 'cannibal BA',
  levels: [
    { level: 'PS', label: 'Plant Superintendent / Dept Head', projectScoped: true },
    { level: 'PM', label: 'Project Manager', projectScoped: true },
    { level: 'OGM', label: 'Operational General Manager' },
    { level: 'PGM', label: 'Plant General Manager' },
    { level: 'OD', label: 'Operational Director' },
    { level: 'PD', label: 'President Director' }
  ]
}

export const APPROVAL_CHAINS = {
  PCR_FORECAST: PCR_FORECAST_APPROVAL_CHAIN,
  CANNIBAL: CANNIBAL_BA_APPROVAL_CHAIN
} as const

export type PcrForecastApprovalLevel = (typeof PCR_FORECAST_APPROVAL_CHAIN.levels)[number]['level']

export type PcrApprovalLevel = PcrForecastApprovalLevel

export type CannibalBaApprovalLevel = (typeof CANNIBAL_BA_APPROVAL_CHAIN.levels)[number]['level']

export function getChainById(id: ApprovalChainId): ApprovalChainConfig {
  return APPROVAL_CHAINS[id]
}

/** Urutan sequential approval (satu per satu). */
export function getChainLevelOrder(chain: ApprovalChainConfig): string[] {
  return chain.levels.map(item => item.level)
}

export function getChainLevelLabels(chain: ApprovalChainConfig): Record<string, string> {
  return Object.fromEntries(chain.levels.map(item => [item.level, item.label]))
}

export function getChainLevelConfig(chain: ApprovalChainConfig, level: string): ApprovalLevelConfig | undefined {
  return chain.levels.find(item => item.level === level)
}

export function getChainApprovePermissionCodes(chain: ApprovalChainConfig): string[] {
  return chain.levels.map(item => `${chain.permissionModule}.approve.${item.level}`)
}

export function getChainProjectScopedLevels(chain: ApprovalChainConfig): string[] {
  return chain.levels.filter(item => item.projectScoped).map(item => item.level)
}

export function permissionCodeForLevel(chain: ApprovalChainConfig, level: string): string {
  return `${chain.permissionModule}.approve.${level}`
}

/** Baris seed `pcr_forecast_approval` saat submit BA PCR. */
export function getPcrForecastApprovalSeedRows(chain: ApprovalChainConfig = PCR_FORECAST_APPROVAL_CHAIN) {
  return chain.levels.map(item => ({
    level: item.level,
    stepOrder: item.stepOrder ?? 1,
    approverLabel: item.label,
    status: 'PENDING' as const
  }))
}

/** Map level → waitStageLabel untuk syncStatusBaPcr. */
export function getChainWaitStageLabels(chain: ApprovalChainConfig): Record<string, string> {
  const map: Record<string, string> = {}
  for (const item of chain.levels) {
    if (item.waitStageLabel) map[item.level] = item.waitStageLabel
  }

  return map
}
