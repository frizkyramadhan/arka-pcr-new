import { describe, expect, it } from 'vitest'

import {
  listMissingOldcoreClassFields,
  resolveReplacementCloseRequirements
} from '@/lib/replacement/close-requirements'

describe('resolveReplacementCloseRequirements', () => {
  it('requires procurement and oldcore class for WO without forecast', () => {
    expect(resolveReplacementCloseRequirements(false, false, false)).toMatchObject({
      requiresProcurement: true,
      requiresOldcoreClass: true,
      requiresInstallationReport: false
    })
  })

  it('skips procurement and oldcore class for warranty forecast', () => {
    expect(resolveReplacementCloseRequirements(true, true, true)).toMatchObject({
      requiresProcurement: false,
      requiresOldcoreClass: false,
      requiresInstallationReport: true
    })
  })

  it('requires oldcore class for normal forecast', () => {
    expect(resolveReplacementCloseRequirements(false, true, false)).toMatchObject({
      requiresProcurement: true,
      requiresOldcoreClass: true
    })
  })
})

describe('listMissingOldcoreClassFields', () => {
  it('lists both fields when empty', () => {
    expect(listMissingOldcoreClassFields({})).toEqual(['Oldcore Status', 'Prediction Oldcore'])
  })
})
