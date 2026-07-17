/**
 * Debug SAP B1 Items stock/on-hand fields — verifikasi bentuk response sebelum extend items-service.
 * Run: npx tsx --env-file=.env.local scripts/debug-sap-item-stock.ts <ItemCode>
 * Tanpa argumen: ambil 1 ItemCode acak dari grup item yang dikonfigurasi (SAP_B1_ITEM_GROUP_CODES).
 */
import { getSapB1ItemGroupCodes } from '@/lib/sap-b1/config'
import { sapB1AuthorizedJson } from '@/lib/sap-b1/session'

async function resolveSampleItemCode(): Promise<string | null> {
  const groupCodes = getSapB1ItemGroupCodes()
  const filter = groupCodes.length ? `ItemsGroupCode eq ${groupCodes[0]}` : "Valid eq 'tYES'"
  const params = new URLSearchParams({ $select: 'ItemCode', $filter: filter, $top: '1' })
  const payload = await sapB1AuthorizedJson<{ value?: Array<{ ItemCode?: string }> }>(`/Items?${params.toString()}`)

  return payload.value?.[0]?.ItemCode ?? null
}

async function findItemWithStock(): Promise<string | null> {
  const groupCodes = getSapB1ItemGroupCodes()
  const filter = groupCodes.length
    ? `ItemsGroupCode eq ${groupCodes[0]} and QuantityOnStock gt 0`
    : 'QuantityOnStock gt 0'
  const params = new URLSearchParams({ $select: 'ItemCode,QuantityOnStock', $filter: filter, $top: '3' })
  const payload = await sapB1AuthorizedJson<{ value?: Array<{ ItemCode?: string; QuantityOnStock?: number }> }>(
    `/Items?${params.toString()}`
  )

  console.log('Sample items with stock > 0:', JSON.stringify(payload.value, null, 2))

  return payload.value?.[0]?.ItemCode ?? null
}

async function main() {
  if (process.argv[2] === '--find-stock') {
    await findItemWithStock()

    return
  }

  const itemCode = process.argv[2] ?? (await resolveSampleItemCode())
  if (!itemCode) {
    console.error('No ItemCode provided and none found from configured item groups.')
    process.exit(1)
  }

  console.log(`Probing stock fields for ItemCode=${itemCode}...`)

  // Probe each candidate scalar field individually — SAP rejects the whole $select if
  // any single property is invalid, so batch probing hides which ones actually exist.
  const scalarCandidates = [
    'QuantityOnStock',
    'CommittedQuantity',
    'OnOrder',
    'AvailableQuantity',
    'QuantityOrderedFromVendors',
    'QuantityOrderedByCustomers'
  ]

  for (const field of scalarCandidates) {
    try {
      const path = `/Items('${encodeURIComponent(itemCode)}')?$select=ItemCode,${field}`
      const payload = await sapB1AuthorizedJson<Record<string, unknown>>(path)

      console.log(`OK   ${field} =`, payload[field])
    } catch (error) {
      console.log(`FAIL ${field} —`, error instanceof Error ? error.message : error)
    }
  }

  // Probe candidate navigation properties (sub-collections) individually.
  const expandCandidates = ['ItemWarehouseInfoCollection', 'ItemWhsMD']

  for (const nav of expandCandidates) {
    try {
      const path = `/Items('${encodeURIComponent(itemCode)}')?$select=ItemCode&$expand=${nav}`
      const payload = await sapB1AuthorizedJson<Record<string, unknown>>(path)

      console.log(`OK   $expand=${nav} =`, JSON.stringify(payload[nav]))
    } catch (error) {
      console.log(`FAIL $expand=${nav} —`, error instanceof Error ? error.message : error)
    }
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
