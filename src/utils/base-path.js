/**
 * Next.js basePath untuk deploy di subpath (mis. http://host/arka-pcr).
 * Set NEXT_PUBLIC_BASE_PATH saat build Docker; kosong untuk dev lokal di root.
 */

/** @returns {string} e.g. '' atau '/arka-pcr' */
export function getBasePath() {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
  const trimmed = String(raw).trim().replace(/\/$/, '')
  if (!trimmed || trimmed === '/') return ''

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/**
 * Tambahkan basePath ke path absolut internal (API, unduhan, window.open).
 * URL absolut http(s) tidak diubah.
 */
export function withBasePath(path) {
  if (!path) return path
  if (/^https?:\/\//i.test(path)) return path

  const base = getBasePath()
  if (!base) return path

  const normalized = path.startsWith('/') ? path : `/${path}`

  return `${base}${normalized}`
}

/** Path API — menerima `/forecasts` atau `/api/forecasts`. */
export function apiPath(path = '') {
  if (!path) return withBasePath('/api/')
  if (path.startsWith('/api')) return withBasePath(path)

  return withBasePath(`/api/${path.replace(/^\//, '')}`)
}
