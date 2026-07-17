/**
 * Inject pending approval badge counts into the Approval nav group.
 */

function formatBadgeCount(count) {
  if (!count || count <= 0) return null

  return count > 99 ? '99+' : String(count)
}

export function applyApprovalBadges(navItems, counts) {
  if (!Array.isArray(navItems) || !counts) return navItems

  const pcrBadge = formatBadgeCount(counts.pcrRequest)
  const cannibalBadge = formatBadgeCount(counts.cannibalRequest)
  const totalBadge = formatBadgeCount(counts.total)

  return navItems.map(item => {
    if (item.title !== 'Approval' || !item.children) return item

    const children = item.children.map(child => {
      if (child.path === '/approvals' && pcrBadge) {
        return { ...child, badgeContent: pcrBadge, badgeColor: 'error' }
      }

      if (child.path === '/cannibals-approvals' && cannibalBadge) {
        return { ...child, badgeContent: cannibalBadge, badgeColor: 'error' }
      }

      return child
    })

    const updated = { ...item, children }

    if (totalBadge) {
      updated.badgeContent = totalBadge
      updated.badgeColor = 'error'
    }

    return updated
  })
}
