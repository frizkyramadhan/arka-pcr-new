/**
 * Fleet models list — fleet_model_cache + commod counts.
 */
import type { Session } from 'next-auth'

import { listCachedUnitsForSession } from '@/lib/fleet-api/db-cache'
import { isFleetApiEnabled } from '@/lib/fleet-api/config'
import { resolveFleetModelSnapshots } from '@/lib/fleet-api/model-cache'
import { prisma } from '@/lib/prisma'
import { paginateListIfRequested, parseOptionalPageFromSearchParams } from '@/lib/utils/list-pagination'

export type ModelListRow = {
  fleetModelId: number
  model: string
  manufacture: string
  plantGroup: string
  unitCount: number
  componentCount: number
  legacyModelIds: number[]
}

export type ModelListFilters = {
  search?: string | null
  model?: string | null
  manufacture?: string | null
  plantGroup?: string | null
}

export type ModelListQuery = ModelListFilters & {
  sortField:
    | 'fleetModelId'
    | 'model'
    | 'manufacture'
    | 'plantGroup'
    | 'unitCount'
    | 'componentCount'
  sortOrder: 'asc' | 'desc'
  pagination?: { page: number; pageSize: number }
}

export type ModelComponentRow = {
  idMod: number
  fleetModelId: number
  idComp: number
  policy: number | null
  price: string | null
  lifeType: string | null
  comp: {
    idComp: number
    compDesc: string
    compType: string | null
    status: string
  } | null
}

const MODEL_SORT_FIELDS = [
  'fleetModelId',
  'model',
  'manufacture',
  'plantGroup',
  'unitCount',
  'componentCount'
] as const

function includesTextFilter(value: string | null | undefined, query: string | null | undefined) {
  if (!query?.trim()) return true

  return String(value ?? '')
    .toLowerCase()
    .includes(query.trim().toLowerCase())
}

export function parseModelListQuery(searchParams: URLSearchParams): ModelListQuery {
  const sortFieldRaw = searchParams.get('column') ?? searchParams.get('sortField') ?? 'model'

  const sortField = MODEL_SORT_FIELDS.includes(sortFieldRaw as (typeof MODEL_SORT_FIELDS)[number])
    ? (sortFieldRaw as ModelListQuery['sortField'])
    : 'model'

  const sortOrderRaw = searchParams.get('sort') ?? searchParams.get('sortOrder') ?? 'asc'

  return {
    search: searchParams.get('search') ?? searchParams.get('q'),
    model: searchParams.get('model'),
    manufacture: searchParams.get('manufacture'),
    plantGroup: searchParams.get('plantGroup'),
    sortField,
    sortOrder: sortOrderRaw === 'desc' ? 'desc' : 'asc',
    pagination: parseOptionalPageFromSearchParams(searchParams)
  }
}

function applyModelFilters(rows: ModelListRow[], filters: ModelListFilters): ModelListRow[] {
  let result = rows

  if (filters.model) {
    result = result.filter(row => includesTextFilter(row.model, filters.model))
  }

  if (filters.manufacture) {
    result = result.filter(row => includesTextFilter(row.manufacture, filters.manufacture))
  }

  if (filters.plantGroup) {
    result = result.filter(row => includesTextFilter(row.plantGroup, filters.plantGroup))
  }

  if (filters.search) {
    const query = filters.search.toLowerCase()
    result = result.filter(
      row =>
        String(row.fleetModelId).includes(query) ||
        row.model.toLowerCase().includes(query) ||
        row.manufacture.toLowerCase().includes(query) ||
        row.plantGroup.toLowerCase().includes(query) ||
        row.legacyModelIds.some(id => String(id).includes(query))
    )
  }

  return result
}

function sortModels(
  rows: ModelListRow[],
  field: ModelListQuery['sortField'],
  order: 'asc' | 'desc'
): ModelListRow[] {
  const direction = order === 'asc' ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftRaw = left[field]
    const rightRaw = right[field]

    if (typeof leftRaw === 'number' && typeof rightRaw === 'number') {
      if (leftRaw < rightRaw) return -1 * direction
      if (leftRaw > rightRaw) return 1 * direction

      return 0
    }

    const leftText = String(leftRaw ?? '').toLowerCase()
    const rightText = String(rightRaw ?? '').toLowerCase()

    if (leftText < rightText) return -1 * direction
    if (leftText > rightText) return 1 * direction

    return 0
  })
}

async function buildUnitCountMap(session: Session): Promise<Map<number, number>> {
  const units = await listCachedUnitsForSession(session)
  const map = new Map<number, number>()

  for (const unit of units) {
    const modelId = unit.model_id
    map.set(modelId, (map.get(modelId) ?? 0) + 1)
  }

  return map
}

async function buildComponentCountMap(): Promise<Map<number, number>> {
  const groups = await prisma.commod.groupBy({
    by: ['fleetModelId'],
    _count: { idMod: true }
  })

  return new Map(groups.map(group => [group.fleetModelId, group._count.idMod]))
}

async function buildLegacyModelMap(): Promise<Map<number, number[]>> {
  const rows = await prisma.legacyModelMapping.findMany({
    select: { legacyModelId: true, fleetModelId: true }
  })

  const map = new Map<number, number[]>()

  for (const row of rows) {
    const list = map.get(row.fleetModelId) ?? []
    list.push(row.legacyModelId)
    map.set(row.fleetModelId, list)
  }

  return map
}

async function listModelsFromCache(): Promise<
  Array<{
    fleetModelId: number
    model: string
    manufacture: string
    plantGroup: string
  }>
> {
  const cached = await prisma.fleetModelCache.findMany({ orderBy: { modelName: 'asc' } })

  if (cached.length > 0) {
    return cached.map(row => ({
      fleetModelId: row.fleetModelId,
      model: row.modelName ?? `Model ${row.fleetModelId}`,
      manufacture: row.manufacture ?? '',
      plantGroup: row.plantGroup ?? ''
    }))
  }

  const snapshots = await resolveFleetModelSnapshots()

  return snapshots.map(row => ({
    fleetModelId: row.fleetModelId,
    model: row.modelName ?? `Model ${row.fleetModelId}`,
    manufacture: row.manufacture ?? '',
    plantGroup: row.plantGroup ?? ''
  }))
}

export async function listModelsQuery(
  session: Session,
  query: ModelListQuery
): Promise<{ total: number; data: ModelListRow[]; source: 'fleet' | 'cache' }> {
  const [models, unitCountMap, componentCountMap, legacyModelMap] = await Promise.all([
    listModelsFromCache(),
    buildUnitCountMap(session),
    buildComponentCountMap(),
    buildLegacyModelMap()
  ])

  const rows: ModelListRow[] = models.map(item => ({
    fleetModelId: item.fleetModelId,
    model: item.model,
    manufacture: item.manufacture,
    plantGroup: item.plantGroup,
    unitCount: unitCountMap.get(item.fleetModelId) ?? 0,
    componentCount: componentCountMap.get(item.fleetModelId) ?? 0,
    legacyModelIds: legacyModelMap.get(item.fleetModelId) ?? []
  }))

  const filtered = applyModelFilters(rows, query)
  const sorted = sortModels(filtered, query.sortField, query.sortOrder)
  const source: 'fleet' | 'cache' = isFleetApiEnabled() ? 'fleet' : 'cache'

  return {
    ...paginateListIfRequested(sorted, query.pagination),
    source
  }
}

export async function listModelComponents(fleetModelId: number): Promise<ModelComponentRow[]> {
  const rows = await prisma.commod.findMany({
    where: { fleetModelId },
    include: {
      comp: {
        select: { idComp: true, compDesc: true, compType: true, status: true }
      },
      fleetModel: {
        select: { fleetModelId: true, modelName: true }
      }
    },
    orderBy: [{ comp: { compDesc: 'asc' } }, { idMod: 'asc' }]
  })

  return rows.map(row => ({
    idMod: row.idMod,
    fleetModelId: row.fleetModelId,
    idComp: row.idComp,
    policy: row.policy,
    price: row.price?.toString() ?? null,
    lifeType: row.lifeType,
    comp: row.comp
  }))
}
