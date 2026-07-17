import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SapB1DisabledError } from '@/lib/sap-b1/config'
import { clearSapDocumentCache } from '@/lib/sap-b1/cache'
import { getMisForMr, getSalesOrder, getServiceCall, searchSapDocuments } from '@/lib/sap-b1/documents-service'

vi.mock('@/lib/sap-b1/config', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/sap-b1/config')>()

  return {
    ...actual,
    isSapB1Enabled: vi.fn(() => true),
    isSapB1Configured: vi.fn(() => true)
  }
})

vi.mock('@/lib/sap-b1/session', () => ({
  sapB1AuthorizedJson: vi.fn()
}))

import { isSapB1Enabled } from '@/lib/sap-b1/config'
import { sapB1AuthorizedJson } from '@/lib/sap-b1/session'

describe('documents-service', () => {
  beforeEach(() => {
    vi.mocked(isSapB1Enabled).mockReturnValue(true)
    vi.mocked(sapB1AuthorizedJson).mockReset()
    clearSapDocumentCache()
  })

  it('maps Sales Order payload to MR document', async () => {
    vi.mocked(sapB1AuthorizedJson)
      .mockResolvedValueOnce({
        value: [{ DocEntry: 26684 }]
      })
      .mockResolvedValueOnce({
        DocEntry: 26684,
        DocNum: 265050773,
        DocDate: '2026-03-01T00:00:00Z',
        DocumentStatus: 'bost_Close',
        DocumentLines: [{ LineNum: 0, ItemCode: 'SP-001', ItemDescription: 'Pump', Quantity: 1, Price: 10, Currency: 'IDR' }]
      })

    const result = await getSalesOrder(265050773)

    expect(result).toMatchObject({
      docNum: 265050773,
      docStatusLabel: 'Closed',
      lines: [{ itemCode: 'SP-001' }]
    })

    // 2 calls to resolve+fetch the Order, plus 1 for UoM enrichment (line has itemCode but no uom).
    expect(sapB1AuthorizedJson).toHaveBeenCalledTimes(3)
  })

  it('maps ServiceCall payload to WO document', async () => {
    vi.mocked(sapB1AuthorizedJson).mockResolvedValue({
      value: [
        {
          DocNum: 1001,
          ServiceCallID: 55,
          Subject: 'Engine overhaul',
          Status: -3,
          CreationDate: '2026-01-10',
          ClosingDate: null,
          U_MIS_WODate: '2026-01-09'
        }
      ]
    })

    const result = await getServiceCall(1001)

    expect(result).toMatchObject({
      docNum: 1001,
      subject: 'Engine overhaul',
      statusLabel: 'Open'
    })
  })

  it('returns empty search result for non-numeric query', async () => {
    const result = await searchSapDocuments({ type: 'mr', query: 'abc' })

    expect(result).toEqual({ data: [], source: 'sap-b1' })
    expect(sapB1AuthorizedJson).not.toHaveBeenCalled()
  })

  it('throws when SAP integration is disabled', async () => {
    vi.mocked(isSapB1Enabled).mockReturnValue(false)

    await expect(getServiceCall(1)).rejects.toBeInstanceOf(SapB1DisabledError)
  })

  it('getMisForMr fetches the WO MI candidate list when none pre-fetched', async () => {
    vi.mocked(sapB1AuthorizedJson)
      .mockResolvedValueOnce({ value: [{ DocNum: 501, DocDate: '2026-03-01', DocumentStatus: 'bost_Open' }] })
      .mockResolvedValueOnce({ value: [{ DocEntry: 9001 }] })
      .mockResolvedValueOnce({ DocEntry: 9001, DocumentLines: [{ BaseEntry: 26684 }] })

    const result = await getMisForMr(26684, '1001')

    expect(result).toHaveLength(1)
    expect(result[0].docNum).toBe(501)
    // 1 list call (getMisForWo) + 2 calls to resolve/fetch the candidate's full document.
    expect(sapB1AuthorizedJson).toHaveBeenCalledTimes(3)
  })

  it('getMisForMr skips the WO list call when candidates are pre-fetched (N+1 fix)', async () => {
    vi.mocked(sapB1AuthorizedJson)
      .mockResolvedValueOnce({ value: [{ DocEntry: 9001 }] })
      .mockResolvedValueOnce({ DocEntry: 9001, DocumentLines: [{ BaseEntry: 26684 }] })

    const preFetched = [
      { docNum: 501, docDate: '2026-03-01', docStatus: 'O', docStatusLabel: 'Open', label: 'MI 501' }
    ]

    const result = await getMisForMr(26684, '1001', 10, preFetched)

    expect(result).toHaveLength(1)
    // Only the 2 calls to resolve/fetch the candidate's document — no getMisForWo list call.
    expect(sapB1AuthorizedJson).toHaveBeenCalledTimes(2)
  })
})
