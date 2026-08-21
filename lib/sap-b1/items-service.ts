/**
 * SAP B1 Items entity — search materials for cannibal P/N autocomplete.
 */
import {
  getSapB1ItemGroupCodes,
  isSapB1Configured,
  isSapB1Enabled,
  SapB1DisabledError,
  SapB1UnavailableError
} from '@/lib/sap-b1/config'
import { buildItemsSearchFilter, mapSapItemToMaterial, normalizeMaterialSearchQuery } from '@/lib/sap-b1/odata'
import { sapB1AuthorizedJson } from '@/lib/sap-b1/session'
import type { SapB1ItemGroupsResponse, SapB1ItemsResponse, SapB1Material } from '@/types/sap-b1'

const MIN_QUERY_LENGTH = 2
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export type SearchMaterialsInput = {
  query: string
  limit?: number
}

export type SearchMaterialsResult = {
  data: SapB1Material[]
  source: 'sap-b1'
}

function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_LIMIT

  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT)
}

export async function searchMaterials(input: SearchMaterialsInput): Promise<SearchMaterialsResult> {
  if (!isSapB1Enabled()) {
    throw new SapB1DisabledError()
  }

  if (!isSapB1Configured()) {
    throw new SapB1UnavailableError('SAP B1 is not configured')
  }

  const query = normalizeMaterialSearchQuery(input.query)
  if (query.length < MIN_QUERY_LENGTH) {
    return { data: [], source: 'sap-b1' }
  }

  const limit = clampLimit(input.limit)

  const filter = buildItemsSearchFilter({
    query,
    itemGroupCodes: getSapB1ItemGroupCodes(),
    activeOnly: true
  })

  const params = new URLSearchParams({
    // QuantityOnStock — total on-hand qty across warehouses, verified valid on this SAP
    // instance via scripts/debug-sap-item-stock.ts ($expand=ItemWarehouseInfoCollection is NOT supported here).
    $select: 'ItemCode,ItemName,ForeignName,ItemsGroupCode,QuantityOnStock',
    $filter: filter,
    $orderby: 'ItemCode',
    $top: String(limit)
  })

  const path = `/Items?${params.toString()}`

  const payload = await sapB1AuthorizedJson<SapB1ItemsResponse>(path)

  const data = (payload.value ?? [])
    .map(mapSapItemToMaterial)
    .filter((row): row is SapB1Material => row !== null)

  return { data, source: 'sap-b1' }
}

export async function listItemGroups(limit = 100): Promise<Array<{ code: number; name: string }>> {
  if (!isSapB1Enabled()) {
    throw new SapB1DisabledError()
  }

  const params = new URLSearchParams({
    $select: 'Number,GroupName',
    $orderby: 'Number',
    $top: String(limit)
  })

  const payload = await sapB1AuthorizedJson<SapB1ItemGroupsResponse>(`/ItemGroups?${params.toString()}`)

  return (payload.value ?? [])
    .filter(row => row.Number != null)
    .map(row => ({
      code: Number(row.Number),
      name: String(row.GroupName ?? '').trim()
    }))
}

export { MIN_QUERY_LENGTH, DEFAULT_LIMIT, MAX_LIMIT }
