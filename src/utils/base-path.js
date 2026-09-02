/**
 * Next.js basePath untuk deploy di subpath (mis. http://host/arka-pcr).
 * Set NEXT_PUBLIC_BASE_PATH saat build Docker; kosong untuk dev lokal di root.
 *
 * Aturan:
 * - Next `Link` / `router.push` → path TANPA basePath (`/units`)
 * - `window.location` / `fetch` / `window.open` → pakai `withBasePath` / `apiPath`
 * - NEXTAUTH_URL harus `http://host/arka-pcr/api/auth` (bukan hanya `/arka-pcr`)
 * - AUTH_URL (email deep link) tetap `http://host/arka-pcr`
 */

/** @returns {string} e.g. '' atau '/arka-pcr' */
export function getBasePath() {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
  const trimmed = String(raw).trim().replace(/\/$/, '')
  if (!trimmed || trimmed === '/') return ''

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/** True jika path sudah diawali basePath (hindari double prefix). */
export function hasBasePath(path) {
  const base = getBasePath()
  if (!base || !path) return false

  const normalized = path.startsWith('/') ? path : `/${path}`

  return normalized === base || normalized.startsWith(`${base}/`)
}

/**
 * Hapus basePath dari path/URL agar aman untuk Next Link / router.push.
 * Absolute http(s) → ambil pathname (+ search/hash).
 */
export function stripBasePath(path) {
  if (!path) return path

  let value = String(path)

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      value = `${url.pathname}${url.search}${url.hash}`
    } catch {
      return '/'
    }
  }

  const base = getBasePath()
  const normalized = value.startsWith('/') ? value : `/${value}`

  if (base && (normalized === base || normalized.startsWith(`${base}/`))) {
    const stripped = normalized.slice(base.length)

    return stripped.startsWith('/') ? stripped : `/${stripped}`
  }

  return normalized
}

/**
 * Path untuk Next.js router/Link (tanpa basePath, selalu absolute-from-app-root).
 */
export function toRouterPath(path, fallback = '/') {
  if (path == null || path === '') return fallback

  const stripped = stripBasePath(path)
  if (!stripped || stripped === '/') return fallback === undefined ? '/' : fallback

  return stripped
}

/**
 * Tambahkan basePath ke path absolut internal (API, unduhan, window.open).
 * Idempotent: tidak double-prefix. URL absolut http(s) tidak diubah.
 */
export function withBasePath(path) {
  if (!path) return path
  if (/^https?:\/\//i.test(path)) return path

  const base = getBasePath()
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (!base) return normalized
  if (hasBasePath(normalized)) return normalized

  return `${base}${normalized}`
}

/** Path API — menerima `/forecasts` atau `/api/forecasts`. */
export function apiPath(path = '') {
  if (!path) return withBasePath('/api/')
  if (path.startsWith('/api')) return withBasePath(path)

  return withBasePath(`/api/${path.replace(/^\//, '')}`)
}

/** NextAuth client basePath (SessionProvider) — selalu .../api/auth di bawah Next basePath. */
export function nextAuthBasePath() {
  const base = getBasePath()

  return base ? `${base}/api/auth` : '/api/auth'
}
