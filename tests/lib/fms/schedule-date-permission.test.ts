import { describe, expect, it } from 'vitest'

import { scheduleDatePermissionError } from '@/lib/fms/schedule-date-permission'

describe('scheduleDatePermissionError', () => {
  it('allows adding dates without permission to change existing ones', () => {
    expect(scheduleDatePermissionError(2, 0, { allowCreate: true, allowModifyExisting: false })).toBeNull()
  })

  it('blocks removing an existing date without maintenance-plan.update', () => {
    expect(scheduleDatePermissionError(0, 1, { allowCreate: true, allowModifyExisting: false })).toBe(
      'You do not have permission to change or remove existing plan dates'
    )
  })

  it('blocks a move that also adds a date when create is missing', () => {
    expect(scheduleDatePermissionError(1, 1, { allowCreate: false, allowModifyExisting: true })).toBe(
      'You do not have permission to add plan dates'
    )
  })

  it('allows changing existing dates when update is granted', () => {
    expect(scheduleDatePermissionError(0, 3, { allowCreate: false, allowModifyExisting: true })).toBeNull()
  })
})
