/** OData $filter builders for SAP B1 Service Layer Items queries. */
import type { SapB1Material } from '@/types/sap-b1'

/** Escape single quotes for OData string literals. */
export function escapeODataString(value: string): string {
  return value.replace(/'/g, "''")
}

/**
 * Autocomplete may send "PN — description"; SAP Items search should use PN/code only.
 * Also strips em dash (—) and hyphen separators from MUI option labels.
 */
export function normalizeMaterialSearchQuery(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const emDash = trimmed.indexOf(' — ')
  if (emDash > 0) return trimmed.slice(0, emDash).trim()

  const hyphen = trimmed.indexOf(' - ')
  if (hyphen > 0) return trimmed.slice(0, hyphen).trim()

  return trimmed
}

export function buildItemGroupFilter(groupCodes: number[]): string | null {
  if (groupCodes.length === 0) return null

  const clauses = groupCodes.map(code => `ItemsGroupCode eq ${code}`)

  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' or ')})`
}

export type BuildItemsSearchFilterInput = {
  query: string
  itemGroupCodes?: number[]
  /** When true, only active items (Valid eq tYES). */
  activeOnly?: boolean
}

/**
 * Search by ItemCode prefix OR ItemName contains (case-sensitive per B1 OData).
 * Combines optional item-group and active filters.
 */
export function buildItemsSearchFilter(input: BuildItemsSearchFilterInput): string {
  const q = escapeODataString(normalizeMaterialSearchQuery(input.query))
  if (!q) return "Valid eq 'tYES' and Frozen eq 'tNO'"

  const parts: string[] = []

  const searchClause = `(startswith(ItemCode,'${q}') or contains(ItemName,'${q}') or contains(ForeignName,'${q}'))`
  parts.push(searchClause)

  if (input.activeOnly !== false) {
    parts.push("Valid eq 'tYES'")
    parts.push("Frozen eq 'tNO'")
  }

  const groupFilter = buildItemGroupFilter(input.itemGroupCodes ?? [])
  if (groupFilter) parts.push(groupFilter)

  return parts.join(' and ')
}

export function mapSapItemToMaterial(item: {
  ItemCode?: string | null
  ItemName?: string | null
  ForeignName?: string | null
  ItemsGroupCode?: number | null
  QuantityOnStock?: number | null
}): SapB1Material | null {
  const pn = String(item.ItemCode ?? '').trim()
  if (!pn) return null

  return {
    pn,
    compDesc: String(item.ItemName ?? '').trim(),
    foreignName: item.ForeignName ? String(item.ForeignName).trim() : null,
    itemsGroupCode: item.ItemsGroupCode ?? null,
    onHand: item.QuantityOnStock != null ? Number(item.QuantityOnStock) : null
  }
}
