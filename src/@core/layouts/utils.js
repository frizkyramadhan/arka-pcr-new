/**
 * Menu paths whose URL prefix overlaps another route (e.g. /cannibals vs /cannibals-approvals).
 */
import { stripBasePath } from 'src/utils/base-path'

const NAV_SIBLING_EXCLUSIONS = [
  { menuPath: '/cannibals', excludePrefix: '/cannibals-approvals' },

  // Unit replacement detail under /units/:id/replacements — keep Units inactive;
  // Actual (/replacements) claims those URLs via NAV_ACTIVE_ALIASES.
  {
    menuPath: '/units',
    excludeWhen: pathname => /^\/units\/[^/]+\/replacements(\/|$)/.test(pathname)
  }
]

/** Extra URL patterns that should light up a menu path (besides exact / prefix match). */
const NAV_ACTIVE_ALIASES = [
  {
    menuPath: '/replacements',
    matchWhen: pathname =>
      pathname === '/replacements' ||
      pathname.startsWith('/replacements/') ||
      /^\/units\/[^/]+\/replacements(\/|$)/.test(pathname)
  }
]

/**
 * Check for URL queries as well for matching
 * Current URL & Item Path
 */
export const handleURLQueries = (router, path) => {
  if (Object.keys(router.query).length && path) {
    const arr = Object.keys(router.query)

    return (
      isNavPathActive(router.asPath, path) &&
      router.asPath.includes(router.query[arr[0]]) &&
      path !== '/'
    )
  }

  return false
}

function isExcludedForMenuPath(pathname, menuPath) {
  for (const rule of NAV_SIBLING_EXCLUSIONS) {
    if (rule.menuPath !== menuPath) continue
    if (rule.excludeWhen?.(pathname)) return true
    if (rule.excludePrefix) {
      if (pathname === rule.excludePrefix || pathname.startsWith(`${rule.excludePrefix}/`)) {
        return true
      }
    }
  }

  return false
}

function matchesActiveAlias(pathname, menuPath) {
  for (const alias of NAV_ACTIVE_ALIASES) {
    if (alias.menuPath === menuPath && alias.matchWhen?.(pathname)) return true
  }

  return false
}

/**
 * Segment-safe path match — avoids /cannibals-approvals matching /cannibals.
 * Also applies nav aliases (e.g. unit replacement detail → Replacements > Actual).
 */
export const isNavPathActive = (currentURL, itemPath) => {
  if (!itemPath || !currentURL) return false

  // Defensive: asPath should already omit basePath, but strip if a caller passes a browser pathname.
  const pathname = stripBasePath(currentURL.split('?')[0].split('#')[0])
  const normalizedPath = itemPath.split('?')[0]

  if (isExcludedForMenuPath(pathname, normalizedPath)) {
    return false
  }

  if (matchesActiveAlias(pathname, normalizedPath)) {
    return true
  }

  if (normalizedPath === '/') {
    return pathname === '/'
  }

  if (pathname === normalizedPath) {
    return true
  }

  return pathname.startsWith(`${normalizedPath}/`)
}

/**
 * Check if the given item has the given url
 * in one of its children
 *
 * @param item
 * @param currentURL
 */
export const hasActiveChild = (item, currentURL) => {
  const { children } = item
  if (!children) {
    return false
  }
  for (const child of children) {
    if (child.children) {
      if (hasActiveChild(child, currentURL)) {
        return true
      }
    }
    const childPath = child.path

    // Check if the child has a link and is active
    if (child && childPath && currentURL && isNavPathActive(currentURL, childPath)) {
      return true
    }
  }

  return false
}

/**
 * Check if this is a children
 * of the given item
 *
 * @param children
 * @param openGroup
 * @param currentActiveGroup
 */
export const removeChildren = (children, openGroup, currentActiveGroup) => {
  children.forEach(child => {
    if (!currentActiveGroup.includes(child.title)) {
      const index = openGroup.indexOf(child.title)
      if (index > -1) openGroup.splice(index, 1)

      // @ts-ignore
      if (child.children) removeChildren(child.children, openGroup, currentActiveGroup)
    }
  })
}
