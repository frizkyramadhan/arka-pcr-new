/** Public SAP B1 client surface for API routes and scripts. */
import { isSapB1Configured, isSapB1Enabled } from '@/lib/sap-b1/config'
import {
  buildSapDocumentChain,
  getDeliveryNote,
  getMisForMr,
  getMisForWo,
  getMrsForWo,
  getPosForPr,
  getPrsForMr,
  getPurchaseOrder,
  getPurchaseRequest,
  getSalesOrder,
  getSapDocument,
  getSapDocumentWithRelations,
  getServiceCall,
  searchSapDocuments
} from '@/lib/sap-b1/documents-service'
import { listItemGroups, searchMaterials } from '@/lib/sap-b1/items-service'
import {
  ensureSession,
  getSapB1SessionDebugInfo,
  hasValidSession,
  invalidateSapB1Session,
  sapB1AuthorizedJson
} from '@/lib/sap-b1/session'
import type { SapB1ItemsResponse } from '@/types/sap-b1'

export { searchMaterials, listItemGroups }

export {
  buildSapDocumentChain,
  getServiceCall,
  getSalesOrder,
  getPurchaseRequest,
  getPurchaseOrder,
  getDeliveryNote,
  getSapDocument,
  getSapDocumentWithRelations,
  getMrsForWo,
  getMisForWo,
  getMisForMr,
  getPrsForMr,
  getPosForPr,
  searchSapDocuments
}

export {
  isSapB1Enabled,
  isSapB1Configured,
  invalidateSapB1Session,
  ensureSession,
  hasValidSession,
  getSapB1SessionDebugInfo
}

export { toFriendlySapErrorMessage } from '@/lib/sap-b1/error-messages'

export async function pingSapB1(): Promise<{
  ok: boolean
  enabled: boolean
  configured: boolean
  session?: ReturnType<typeof getSapB1SessionDebugInfo>
  itemCount?: number
  itemGroups?: Array<{ code: number; name: string }>
  error?: string
}> {
  if (!isSapB1Enabled()) {
    return { ok: false, enabled: false, configured: isSapB1Configured(), error: 'SAP B1 disabled via SAP_B1_ENABLED' }
  }

  if (!isSapB1Configured()) {
    return { ok: false, enabled: true, configured: false, error: 'SAP B1 credentials missing' }
  }

  try {
    await ensureSession()
    const payload = await sapB1AuthorizedJson<SapB1ItemsResponse>('/Items?$select=ItemCode&$top=1')
    const itemGroups = await listItemGroups(50).catch(() => undefined)

    return {
      ok: true,
      enabled: true,
      configured: true,
      session: getSapB1SessionDebugInfo(),
      itemCount: payload.value?.length ?? 0,
      itemGroups
    }
  } catch (error) {
    invalidateSapB1Session()

    return {
      ok: false,
      enabled: true,
      configured: true,
      session: getSapB1SessionDebugInfo(),
      error: error instanceof Error ? error.message : 'Unknown SAP B1 error'
    }
  }
}
