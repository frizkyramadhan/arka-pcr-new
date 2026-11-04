/** Operator and mechanic labels when the stored name is only the NIK. */
import { describe, expect, it } from 'vitest'

import { employeeDisplayName, nameNeedsLookup, personLabel } from '@/lib/dmbd/employee-label'

describe('employee labels', () => {
  it('looks up a name that repeats the NIK', () => {
    expect(nameNeedsLookup('14967', '14967')).toBe(true)
    expect(nameNeedsLookup('14967', null)).toBe(true)
    expect(nameNeedsLookup('14967', 'HERI HERI')).toBe(false)
    expect(nameNeedsLookup(null, null)).toBe(false)
  })

  it('shows the NIK and the name together', () => {
    expect(personLabel('14967', 'HERI')).toBe('14967 · HERI')
    expect(personLabel('14967', 'HERI HERI')).toBe('14967 · HERI')
    expect(personLabel('Budi Santoso', 'Budi Santoso')).toBe('Budi Santoso')
    expect(personLabel('14967', null)).toBe('14967')
  })

  it('keeps only the first name when it matches the last name', () => {
    expect(employeeDisplayName('HERI', 'HERI')).toBe('HERI')
    expect(employeeDisplayName('WITO', 'wito')).toBe('WITO')
    expect(employeeDisplayName('Rudi', 'Hartono')).toBe('Rudi Hartono')
  })

  it('includes middle name between first and last', () => {
    expect(employeeDisplayName('Rudi', 'Hartono', 'Budi')).toBe('Rudi Budi Hartono')
    expect(employeeDisplayName('HERI', 'HERI', '')).toBe('HERI')
  })
})