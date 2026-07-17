import { describe, expect, it } from 'vitest'

import { cannibalLogisticUpdateSchema } from '@/lib/validations/cannibal'

describe('cannibalLogisticUpdateSchema', () => {
  it('requires lead time days when Lead Time Part is selected', () => {
    const result = cannibalLogisticUpdateSchema.safeParse({
      logisticNoStock: false,
      logisticLeadTime: true,
      logisticOther: false,
      logisticOtherText: ''
    })

    expect(result.success).toBe(false)
  })

  it('accepts lead time with positive days', () => {
    const result = cannibalLogisticUpdateSchema.safeParse({
      logisticNoStock: false,
      logisticLeadTime: true,
      logisticLeadTimeDays: 14,
      logisticOther: false,
      logisticOtherText: ''
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.logisticLeadTimeDays).toBe(14)
    }
  })
})
