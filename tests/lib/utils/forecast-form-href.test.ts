import { describe, expect, it } from 'vitest'

import {
  forecastCreatePath,
  forecastDetailPath,
  forecastEditPath,
  safeInternalPath
} from '../../../src/utils/forecast-form-href.js'

describe('safeInternalPath', () => {
  it('accepts in-app paths and rejects protocol-relative URLs', () => {
    expect(safeInternalPath('/units/1?tab=forecast', '/forecasts')).toBe('/units/1?tab=forecast')
    expect(safeInternalPath('//evil.example', '/forecasts')).toBe('/forecasts')
    expect(safeInternalPath('https://evil.example', '/forecasts')).toBe('/forecasts')
  })
})

describe('forecast form hrefs', () => {
  it('builds create query and detail/edit nav keywords', () => {
    expect(forecastCreatePath({ fleetUnitId: 9, idMod: 3, idRep: 12, from: '/units/9' })).toBe(
      '/forecasts/create?fleetUnitId=9&idMod=3&idRep=12&from=%2Funits%2F9'
    )
    expect(forecastEditPath(44, { from: 'unit', fleetId: 9 })).toBe('/forecasts/44/edit?from=unit&fleetId=9')
    expect(forecastDetailPath(44, { from: 'approvals' })).toBe('/forecasts/44?from=approvals')
  })
})
