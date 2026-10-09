/**
 * Empat permission Excel plan/actual hanya pada template planner.
 */
import { describe, expect, it } from 'vitest'

import { EXPORT_PERMISSION_CODES, FMS_PERMISSION_CODES, PERMISSION_CATALOG } from '@/lib/rbac/permission-catalog'
import { ROLE_TEMPLATES } from '@/lib/rbac/role-templates'

const EXCEL_CODES = [
  'exports.maintenance_plans',
  'imports.maintenance_plans',
  'exports.maintenance_actuals',
  'imports.maintenance_actuals'
] as const

describe('planner excel permissions', () => {
  it('describes Excel export and import, and mentions findings on the actual codes', () => {
    for (const code of EXCEL_CODES) {
      const def = PERMISSION_CATALOG.find(item => item.code === code)
      expect(def?.description.toLowerCase()).toContain('excel')
    }

    expect(PERMISSION_CATALOG.find(item => item.code === 'exports.maintenance_actuals')?.description.toLowerCase()).toContain(
      'finding'
    )
    expect(PERMISSION_CATALOG.find(item => item.code === 'imports.maintenance_actuals')?.description.toLowerCase()).toContain(
      'finding'
    )
    expect(PERMISSION_CATALOG.some(item => item.code === 'exports.maintenance')).toBe(false)
  })

  it('gives the four codes only to planner, not the shared FMS array', () => {
    const planner = ROLE_TEMPLATES.find(role => role.name === 'planner')
    expect(planner).toBeTruthy()

    for (const code of EXCEL_CODES) {
      expect(planner?.permissionCodes).toContain(code)
      expect(FMS_PERMISSION_CODES).not.toContain(code)
      expect(EXPORT_PERMISSION_CODES).not.toContain(code)
    }

    for (const role of ROLE_TEMPLATES) {
      if (role.name === 'planner') continue
      for (const code of EXCEL_CODES) {
        expect(role.permissionCodes).not.toContain(code)
      }
    }
  })
})
