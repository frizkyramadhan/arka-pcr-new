import { describe, expect, it } from 'vitest'

import { canManageCannibalLogisticStatement, hasLogisticsRole } from '@/lib/cannibal/logistic-access'

describe('logistic-access', () => {
  it('detects admin_logistic role name', () => {
    expect(hasLogisticsRole(['admin_logistic'])).toBe(true)
    expect(hasLogisticsRole(['plant_foreman'])).toBe(false)
  })

  it('allows confirm.logistic permission for statement edit', () => {
    expect(
      canManageCannibalLogisticStatement(['cannibals.access', 'cannibals.confirm.logistic'], [])
    ).toBe(true)
  })

  it('allows logistics role without explicit permission codes', () => {
    expect(canManageCannibalLogisticStatement(['cannibals.access'], ['logistics'])).toBe(true)
  })
})
