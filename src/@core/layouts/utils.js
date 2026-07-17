/**
 * Menu paths whose URL prefix overlaps another route (e.g. /cannibals vs /cannibals-approvals).
 */
const NAV_SIBLING_EXCLUSIONS = [{ menuPath: '/cannibals', excludePrefix: '/cannibals-approvals' }]

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

/**
 * Segment-safe path match — avoids /cannibals-approvals matching /cannibals.
 */
export const isNavPathActive = (currentURL, itemPath) => {
  if (!itemPath || !currentURL) return false

  const pathname = currentURL.split('?')[0].split('#')[0]
  const normalizedPath = itemPath.split('?')[0]

  for (const { menuPath, excludePrefix } of NAV_SIBLING_EXCLUSIONS) {
    if (normalizedPath === menuPath) {
      if (pathname === excludePrefix || pathname.startsWith(`${excludePrefix}/`)) {
        return false
      }
    }
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
