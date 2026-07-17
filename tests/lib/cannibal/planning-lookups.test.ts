import { describe, expect, it } from 'vitest'

import { sortPlanningActions } from '@/lib/cannibal/planning-lookups'

const sampleActions = [
  { idAction: 1, action: 'Order Component (ASSY)' },
  { idAction: 2, action: 'Sent Out Of Site For Repair' },
  { idAction: 3, action: 'Not Action (Repair On Site by Our Mechanic)' },
  { idAction: 4, action: 'Order Component (Separate)' }
]

describe('sortPlanningActions', () => {
  it('orders planning actions to match BA form layout', () => {
    const sorted = sortPlanningActions(sampleActions)

    expect(sorted.map(item => item.idAction)).toEqual([1, 4, 2, 3])
    expect(sorted.map(item => item.action)).toEqual([
      'Order Component (ASSY)',
      'Order Component (Separate)',
      'Sent Out Of Site For Repair',
      'Not Action (Repair On Site by Our Mechanic)'
    ])
  })
})
