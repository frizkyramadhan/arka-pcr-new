import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SapB1DisabledError } from '@/lib/sap-b1/config'
import { searchMaterials } from '@/lib/sap-b1/items-service'

vi.mock('@/lib/sap-b1/config', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/sap-b1/config')>()

  return {
    ...actual,
    isSapB1Enabled: vi.fn(() => true),
    isSapB1Configured: vi.fn(() => true),
    getSapB1ItemGroupCodes: vi.fn(() => [114])
  }
})

vi.mock('@/lib/sap-b1/session', () => ({
  sapB1AuthorizedJson: vi.fn()
}))

import { isSapB1Enabled } from '@/lib/sap-b1/config'
import { sapB1AuthorizedJson } from '@/lib/sap-b1/session'

describe('searchMaterials', () => {
  beforeEach(() => {
    vi.mocked(isSapB1Enabled).mockReturnValue(true)
    vi.mocked(sapB1AuthorizedJson).mockReset()
  })

  it('returns empty data for short queries without calling SAP', async () => {
    const result = await searchMaterials({ query: 'a' })

    expect(result).toEqual({ data: [], source: 'sap-b1' })
    expect(sapB1AuthorizedJson).not.toHaveBeenCalled()
  })

  it('maps SAP Items response to pn and compDesc', async () => {
    vi.mocked(sapB1AuthorizedJson).mockResolvedValue({
      value: [
        { ItemCode: 'PN-001', ItemName: 'Hydraulic Pump', ForeignName: null, ItemsGroupCode: 114, QuantityOnStock: 7 },
        { ItemCode: '', ItemName: 'Skip me' }
      ]
    })

    const result = await searchMaterials({ query: 'PN', limit: 10 })

    expect(result.data).toEqual([
      { pn: 'PN-001', compDesc: 'Hydraulic Pump', foreignName: null, itemsGroupCode: 114, onHand: 7 }
    ])
    expect(sapB1AuthorizedJson).toHaveBeenCalledOnce()

    const path = decodeURIComponent(vi.mocked(sapB1AuthorizedJson).mock.calls[0][0] as string).replace(/\+/g, ' ')
    expect(path).toContain('/Items?')
    expect(path).toContain('ItemsGroupCode eq 114')
    expect(path).toContain('$top=10')
    expect(path).toContain('QuantityOnStock')
  })

  it('throws when SAP integration is disabled', async () => {
    vi.mocked(isSapB1Enabled).mockReturnValue(false)

    await expect(searchMaterials({ query: 'filter' })).rejects.toBeInstanceOf(SapB1DisabledError)
  })
})
