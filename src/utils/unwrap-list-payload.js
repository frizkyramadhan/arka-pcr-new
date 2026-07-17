/**
 * Normalise API list responses: plain array or { total, data } from TableServerSide APIs.
 */
export function unwrapListPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data

  return []
}
