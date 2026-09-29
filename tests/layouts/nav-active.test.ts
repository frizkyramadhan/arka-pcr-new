import { describe, expect, it } from 'vitest'

import { hasActiveChild, isNavPathActive } from '../../src/@core/layouts/utils'

describe('isNavPathActive — maintenance actuals', () => {
  const menuPath = '/maintenance-actuals/list'

  it('keeps list active and lights add / view / edit', () => {
    expect(isNavPathActive('/maintenance-actuals/list/', menuPath)).toBe(true)
    expect(isNavPathActive('/maintenance-actuals/add/', menuPath)).toBe(true)
    expect(isNavPathActive('/maintenance-actuals/view/12/', menuPath)).toBe(true)
    expect(isNavPathActive('/maintenance-actuals/edit/12/', menuPath)).toBe(true)
  })

  it('does not steal dashboard or plan / type routes', () => {
    expect(isNavPathActive('/dashboards/maintenance/', menuPath)).toBe(false)
    expect(isNavPathActive('/maintenance-plans/', menuPath)).toBe(false)
    expect(isNavPathActive('/maintenance-types/', menuPath)).toBe(false)
  })
})

describe('hasActiveChild — Maintenance group', () => {
  const group = {
    title: 'Maintenance',
    children: [
      { title: 'Plan', path: '/maintenance-plans' },
      { title: 'Actual', path: '/maintenance-actuals/list' },
      { title: 'Type', path: '/maintenance-types' }
    ]
  }

  it('marks the parent group active on actual add / view / edit', () => {
    expect(hasActiveChild(group, '/maintenance-actuals/add/')).toBe(true)
    expect(hasActiveChild(group, '/maintenance-actuals/view/12/')).toBe(true)
    expect(hasActiveChild(group, '/maintenance-actuals/edit/12/')).toBe(true)
  })
})
