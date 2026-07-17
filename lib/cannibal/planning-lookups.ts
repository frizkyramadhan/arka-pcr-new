/**
 * Planning action lookup order — matches Berita Acara Kanibal form layout.
 */

export const PLANNING_ACTION_ORDER = [
  'ORDER COMPONENT (ASSY)',
  'ORDER COMPONENT (SEPARATE)',
  'SENT OUT OF SITE FOR REPAIR',
  'NOT ACTION (REPAIR ON SITE BY OUR MECHANIC)'
] as const

function normalizePlanningActionLabel(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, ' ')
}

export function sortPlanningActions<T extends { idAction: number; action: string }>(actions: T[]): T[] {
  return [...actions].sort((a, b) => {
    const ia = PLANNING_ACTION_ORDER.indexOf(
      normalizePlanningActionLabel(a.action) as (typeof PLANNING_ACTION_ORDER)[number]
    )
    const ib = PLANNING_ACTION_ORDER.indexOf(
      normalizePlanningActionLabel(b.action) as (typeof PLANNING_ACTION_ORDER)[number]
    )
    const rankA = ia === -1 ? 998 : ia
    const rankB = ib === -1 ? 998 : ib

    if (rankA !== rankB) return rankA - rankB

    return a.idAction - b.idAction
  })
}
