/**
 * Achievement color thresholds — ≥80% success, 50–79% warning, <50% error.
 */

/** @typedef {'success' | 'warning' | 'error'} AchColor */

/**
 * Map Ach% to MUI palette color key.
 * @param {number | null | undefined} ach
 * @returns {AchColor | null}
 */
export function getAchievementColor(ach) {
  if (ach == null || Number.isNaN(Number(ach))) return null
  const value = Number(ach)
  if (value >= 80) return 'success'
  if (value >= 50) return 'warning'

  return 'error'
}

/**
 * Hex colors aligned with Vuexy palette for ApexCharts markers.
 * @param {number | null | undefined} ach
 * @returns {string | null}
 */
export function getAchievementHex(ach) {
  const color = getAchievementColor(ach)
  if (!color) return null
  if (color === 'success') return '#28C76F'
  if (color === 'warning') return '#FF9F43'

  return '#EA5455'
}

/**
 * Format Ach% for display.
 * @param {number | null | undefined} ach
 * @returns {string}
 */
export function formatAchievement(ach) {
  if (ach == null || Number.isNaN(Number(ach))) return '—'

  return `${Math.round(Number(ach))}%`
}
