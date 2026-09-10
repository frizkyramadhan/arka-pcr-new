/**
 * Internal paths for PCR forecast create/edit pages (no basePath).
 * Create `from` = return path. Detail/edit `from` = nav keyword (`approvals` | `unit`).
 */
export function safeInternalPath(from, fallback) {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
    return fallback
  }

  return from
}

export function forecastCreatePath({ fleetUnitId, idMod, idRep, from } = {}) {
  const params = new URLSearchParams()
  if (fleetUnitId) params.set('fleetUnitId', String(fleetUnitId))
  if (idMod) params.set('idMod', String(idMod))
  if (idRep) params.set('idRep', String(idRep))
  if (from) params.set('from', from)
  const query = params.toString()

  return query ? `/forecasts/create?${query}` : '/forecasts/create'
}

function withDetailNav(path, { from, fleetId } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (fleetId) params.set('fleetId', String(fleetId))
  const query = params.toString()

  return query ? `${path}?${query}` : path
}

export function forecastEditPath(idForecast, nav) {
  return withDetailNav(`/forecasts/${idForecast}/edit`, nav)
}

export function forecastDetailPath(idForecast, nav) {
  return withDetailNav(`/forecasts/${idForecast}`, nav)
}
