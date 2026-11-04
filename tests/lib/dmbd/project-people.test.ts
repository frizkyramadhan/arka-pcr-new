/** Pure filter for project-scoped employee and user lists. */
import { describe, expect, it } from 'vitest'

import { employeeStaffRole, filterEmployeesByCodes, isPlantAssignee } from '@/lib/dmbd/sap'

describe('filterEmployeesByCodes', () => {
  const people = [
    { code: '13516', name: 'SUHRAWARDI' },
    { code: '15087', name: 'OTHER' },
    { code: '11202', name: 'THIRD' }
  ]

  it('returns the full list when no project codes exist yet', () => {
    expect(filterEmployeesByCodes(people, [])).toEqual(people)
  })

  it('keeps only NIKs used on that project', () => {
    expect(filterEmployeesByCodes(people, ['15087', '11202'])).toEqual([
      { code: '15087', name: 'OTHER' },
      { code: '11202', name: 'THIRD' }
    ])
  })
})

describe('employeeStaffRole', () => {
  const scope = { branch: 6, plant: 4, production: 13 }

  it('keeps an active Production operator at the project branch', () => {
    expect(
      employeeStaffRole({ branch: 6, department: 13, mechanic: 'N', recordStatus: 'A' }, scope)
    ).toBe('operator')
  })

  it('keeps an active Plant mechanic at the project branch', () => {
    expect(
      employeeStaffRole({ branch: 6, department: 4, mechanic: 'Y', recordStatus: 'A' }, scope)
    ).toBe('mechanic')
  })

  it('drops a mechanic in Production, an operator in Plant, another branch, and an inactive row', () => {
    expect(employeeStaffRole({ branch: 6, department: 13, mechanic: 'Y', recordStatus: 'A' }, scope)).toBeNull()
    expect(employeeStaffRole({ branch: 6, department: 4, mechanic: 'N', recordStatus: 'A' }, scope)).toBeNull()
    expect(employeeStaffRole({ branch: 3, department: 4, mechanic: 'Y', recordStatus: 'A' }, scope)).toBeNull()
    expect(employeeStaffRole({ branch: 6, department: 4, mechanic: 'Y', recordStatus: 'D' }, scope)).toBeNull()
  })
})

describe('isPlantAssignee', () => {
  const scope = { branch: 6, plant: 4 }

  it('keeps a Plant user at the project branch', () => {
    expect(isPlantAssignee({ branch: 6, department: 4 }, scope)).toBe(true)
  })

  it('drops another department or another branch', () => {
    expect(isPlantAssignee({ branch: 6, department: 5 }, scope)).toBe(false)
    expect(isPlantAssignee({ branch: 3, department: 4 }, scope)).toBe(false)
  })
})
