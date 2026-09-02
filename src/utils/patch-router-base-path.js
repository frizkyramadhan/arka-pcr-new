/**
 * Next.js 13.3.2 `addBasePath` always prefixes — it does NOT skip paths that
 * already include basePath. Passing `/arka-pcr/units` to `router.push` / Link
 * therefore becomes `/arka-pcr/arka-pcr/units`.
 *
 * Patch Router.push/replace (client) so any already-prefixed or absolute
 * same-origin URL is stripped before Next adds basePath again. Also self-heal
 * a double-prefixed address bar on first load.
 */
import Router from 'next/router'

import { getBasePath, stripBasePath } from 'src/utils/base-path'

/** Module-level guard — avoid double-patching on HMR. */
let patched = false

function normalizeRouterUrl(url) {
  if (url == null) return url

  if (typeof url === 'string') {
    if (/^https?:\/\//i.test(url)) {
      try {
        const parsed = new URL(url)
        if (typeof window !== 'undefined' && parsed.origin === window.location.origin) {
          return stripBasePath(`${parsed.pathname}${parsed.search}${parsed.hash}`) || '/'
        }
      } catch {
        return url
      }

      return url
    }

    return stripBasePath(url) || '/'
  }

  if (typeof url === 'object' && url.pathname != null) {
    return {
      ...url,
      pathname: stripBasePath(url.pathname) || '/'
    }
  }

  return url
}

function patchRouterMethod(method) {
  const original = Router[method].bind(Router)

  Router[method] = (url, as, options) => {
    const nextUrl = normalizeRouterUrl(url)
    const nextAs = as === undefined ? as : normalizeRouterUrl(as)

    return original(nextUrl, nextAs, options)
  }
}

/** Call once from `_app` (client bundle). Idempotent. */
export function patchRouterBasePath() {
  if (typeof window === 'undefined') return
  if (patched) return

  patched = true

  patchRouterMethod('push')
  patchRouterMethod('replace')

  const base = getBasePath()
  if (!base) return

  const { pathname, search, hash } = window.location
  const doublePrefix = `${base}${base}`

  if (pathname === doublePrefix || pathname.startsWith(`${doublePrefix}/`)) {
    // `/arka-pcr/arka-pcr/units/` → `/arka-pcr/units/`
    const fixedPath = pathname.slice(base.length) || '/'
    window.location.replace(`${fixedPath}${search}${hash}`)
  }
}
