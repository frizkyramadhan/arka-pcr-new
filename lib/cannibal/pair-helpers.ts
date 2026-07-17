/**
 * Kanibal transfer pair helpers — flatten/group REMOVE+INSTALL lines for CRUD API.
 */
import type { KanibalLineInput } from '@/lib/validations/cannibal'

export type KanibalSideInput = Omit<KanibalLineInput, 'type'>

export type KanibalPairInput = {
  remove: KanibalSideInput
  install: KanibalSideInput
}

export type KanibalLineWithPair = KanibalLineInput & { pairIndex: number }

export function hasPlantStatement(data: {
  plantP1UnitRfu?: boolean
  plantProductionReq?: boolean
  plantOther?: boolean
}): boolean {
  return Boolean(data.plantP1UnitRfu || data.plantProductionReq || data.plantOther)
}

export function hasLogisticStatement(data: {
  logisticNoStock?: boolean
  logisticLeadTime?: boolean
  logisticOther?: boolean
}): boolean {
  return Boolean(data.logisticNoStock || data.logisticLeadTime || data.logisticOther)
}

export function isJustificationComplete(data: {
  plantP1UnitRfu?: boolean
  plantProductionReq?: boolean
  plantOther?: boolean
  plantOtherText?: string
  logisticNoStock?: boolean
  logisticLeadTime?: boolean
  logisticLeadTimeDays?: number | null
  logisticOther?: boolean
  logisticOtherText?: string
}): boolean {
  if (!hasPlantStatement(data) || !hasLogisticStatement(data)) return false
  if (data.plantOther && !data.plantOtherText?.trim()) return false
  if (data.logisticOther && !data.logisticOtherText?.trim()) return false
  if (data.logisticLeadTime && (!data.logisticLeadTimeDays || data.logisticLeadTimeDays <= 0)) return false

  return true
}

export function flattenPairsToLines(pairs: KanibalPairInput[]): KanibalLineWithPair[] {
  const lines: KanibalLineWithPair[] = []

  pairs.forEach((pair, index) => {
    lines.push({ ...pair.remove, type: 'REMOVE', pairIndex: index })
    lines.push({ ...pair.install, type: 'INSTALL', pairIndex: index })
  })

  return lines
}

type KanibalLineRecord = KanibalLineInput & {
  pairIndex?: number | null
  idKanibal?: number
  unitNo?: string | null
  unit?: { unitNo?: string | null; modelName?: string | null } | null
}

/** Map satu baris kanibal ke sisi pair — selalu sertakan fleetUnitId + unitNo untuk UI. */
function mapLineToSide(line: KanibalLineRecord): KanibalSideInput & {
  unitNo?: string
  unit?: { modelName?: string | null } | null
} {
  return {
    fleetUnitId: line.fleetUnitId,
    date: line.date,
    compDesc: line.compDesc,
    pn: line.pn ?? '',
    sn: line.sn ?? '',
    pos: line.pos ?? '',
    hmComp: line.hmComp ?? 0,
    idRep: line.idRep ?? null,
    woNoKanibal: line.woNoKanibal ?? null,
    woStatusKanibal: line.woStatusKanibal ?? 'OPEN',
    unitNo:
      line.unitNo != null && String(line.unitNo).trim() !== ''
        ? String(line.unitNo).trim()
        : line.unit?.unitNo != null && String(line.unit.unitNo).trim() !== ''
          ? String(line.unit.unitNo).trim()
          : '',
    unit: line.unit?.modelName != null ? { modelName: line.unit.modelName } : null
  }
}

export function groupLinesToPairs(lines: KanibalLineRecord[]): (KanibalPairInput & {
  remove: KanibalSideInput & { unitNo?: string; unit?: { modelName?: string | null } | null }
  install: KanibalSideInput & { unitNo?: string; unit?: { modelName?: string | null } | null }
})[] {
  const byPair = new Map<number, Partial<Record<'REMOVE' | 'INSTALL', KanibalSideInput & { unitNo?: string }>>>()

  for (const line of lines) {
    const pairIndex = line.pairIndex ?? 0
    const bucket = byPair.get(pairIndex) ?? {}
    bucket[line.type as 'REMOVE' | 'INSTALL'] = mapLineToSide(line)
    byPair.set(pairIndex, bucket)
  }

  const sortedKeys = [...byPair.keys()].sort((a, b) => a - b)

  return sortedKeys.map(key => {
    const bucket = byPair.get(key)!
    return {
      remove: bucket.REMOVE ?? ({} as KanibalSideInput),
      install: bucket.INSTALL ?? ({} as KanibalSideInput)
    }
  })
}

export function validateKanibalPairs(pairs: KanibalPairInput[]): string | null {
  if (pairs.length === 0) return 'Data REMOVE dan INSTALL wajib diisi'
  if (pairs.length > 1) return 'Satu BA hanya untuk satu komponen (hapus transfer pair tambahan)'

  const pair = pairs[0]
  const label = 'Komponen'

  if (!pair.remove?.fleetUnitId) return `${label}: unit REMOVE wajib dipilih`
  if (!pair.install?.fleetUnitId) return `${label}: unit INSTALL wajib dipilih`
  if (!pair.remove.compDesc?.trim()) return `${label}: deskripsi komponen wajib diisi`
  if (!pair.remove.pn?.trim() && !pair.install.pn?.trim()) return `${label}: P/N wajib diisi`

  return null
}
