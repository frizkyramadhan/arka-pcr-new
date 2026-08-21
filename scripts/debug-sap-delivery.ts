/** Debug SAP delivery/MI linkage */
import { sapB1AuthorizedJson } from '@/lib/sap-b1/session'
import { getSalesOrder } from '@/lib/sap-b1/documents-service'

type SapListResponse = { value?: Array<Record<string, unknown>> }
type SapOrder = { DocumentLines?: Array<Record<string, unknown>> }

async function tryPath(label: string, path: string) {
  try {
    const d = await sapB1AuthorizedJson<SapListResponse | Record<string, unknown>>(path)

    const preview =
      d && typeof d === 'object' && Array.isArray((d as SapListResponse).value)
        ? (d as SapListResponse).value?.[0] ?? d
        : d
    console.log(`[OK] ${label}`, JSON.stringify(preview, null, 2).slice(0, 500))
  } catch (error) {
    console.error(`[FAIL] ${label}:`, error instanceof Error ? error.message : error)
  }
}

async function main() {
  await tryPath('delivery sample', '/DeliveryNotes?$top=1&$select=DocNum,DocEntry,DocumentStatus,DocDate')

  const mr = await getSalesOrder(265050773)
  console.log('MR entry', mr?.docEntry, 'exp', mr?.closeStatus)

  if (mr?.docEntry) {
    const full = await sapB1AuthorizedJson<SapOrder>(`/Orders(${mr.docEntry})`)
    const line = full.DocumentLines?.[0]
    console.log(
      'line target fields',
      line ? { TargetEntry: line.TargetEntry, TargetType: line.TargetType, TrgetEntry: line.TrgetEntry } : null
    )

    if (line?.TargetEntry) {
      await tryPath('delivery by entry', `/DeliveryNotes(${line.TargetEntry})?$select=DocNum,DocumentStatus,DocDate`)
    }
  }

  for (const f of ["U_MIS_MRNo eq '265050773'", "U_MIS_WoNo eq '265151564'"]) {
    await tryPath(
      `delivery filter ${f}`,
      `/DeliveryNotes?$filter=${encodeURIComponent(f)}&$top=3&$select=DocNum,DocumentStatus,DocDate`
    )
  }

  const fullOrder = await sapB1AuthorizedJson<SapOrder>('/Orders(26684)')
  const lines = fullOrder.DocumentLines
  const targets = [...new Set((lines ?? []).map(l => l.TargetEntry).filter(Boolean))]
  console.log('all TargetEntry on MR', targets)
}

main()
