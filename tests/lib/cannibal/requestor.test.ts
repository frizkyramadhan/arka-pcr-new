import { describe, expect, it } from 'vitest'

import {
  CANNIBAL_REQUEST_ROLE_TO_RBAC,
  isCannibalRequestRole,
  isRequestorAssignmentComplete,
  rbacRoleForRequestRole
} from '@/lib/cannibal/requestor-roles'
import { canHandoffPlantToRequestor, isPlantSectionComplete } from '@/lib/cannibal/workflow'

describe('cannibal requestor mapping', () => {
  it('maps form jabatan to RBAC roles without using plant_superintendent', () => {
    expect(rbacRoleForRequestRole('SUPT_PRODUCTION')).toBe('production_superintendent')
    expect(rbacRoleForRequestRole('PJO')).toBe('project_manager')
    expect(rbacRoleForRequestRole('GM_OPERATION')).toBe('operational_gm')
    expect(rbacRoleForRequestRole('GM_PLANT')).toBe('plant_manager')
    expect(CANNIBAL_REQUEST_ROLE_TO_RBAC.SUPT_PRODUCTION).not.toBe('plant_superintendent')
  })

  it('accepts only the four form jabatan codes', () => {
    expect(isCannibalRequestRole('SUPT_PRODUCTION')).toBe(true)
    expect(isCannibalRequestRole('plant_superintendent')).toBe(false)
  })

  it('requires both jabatan and user id', () => {
    expect(isRequestorAssignmentComplete({ cannibalRequestRole: 'PJO', requestedBy: 12 })).toBe(true)
    expect(isRequestorAssignmentComplete({ cannibalRequestRole: 'PJO', requestedBy: null })).toBe(false)
  })
})

describe('plant section completeness', () => {
  const plantOk = {
    failure: 'Engine overheat',
    plantP1UnitRfu: true
  }

  it('does not require symptom or failure cause', () => {
    expect(isPlantSectionComplete(plantOk)).toBe(true)
  })

  it('requires requestor fields before handoff', () => {
    expect(canHandoffPlantToRequestor(plantOk)).toBe(false)
    expect(
      canHandoffPlantToRequestor({
        ...plantOk,
        cannibalRequestRole: 'PJO',
        requestedBy: 7
      })
    ).toBe(true)
  })
})
