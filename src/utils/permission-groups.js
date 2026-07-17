/**
 * Kelompokkan permission berdasarkan prefix modul pada kode (mis. component.create → modul component).
 */

/** Label tampilan modul dari segment pertama kode permission. */
export function formatPermissionModuleLabel(moduleKey) {
  if (!moduleKey || moduleKey === 'other') return 'Other'

  return moduleKey
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

/**
 * @param {Array<{ idPermission: number, code: string, description?: string | null }>} permissions
 * @returns {Array<{ module: string, label: string, permissions: Array<{ idPermission: number, code: string, actionLabel: string, description?: string | null }> }>}
 */
export function groupPermissionsByModule(permissions) {
  const groups = new Map()

  for (const permission of permissions ?? []) {
    if (!permission?.code) continue

    const code = permission.code
    const dotIndex = code.indexOf('.')
    const moduleKey = dotIndex > 0 ? code.slice(0, dotIndex) : 'other'
    const actionLabel = dotIndex > 0 ? code.slice(dotIndex + 1) : code

    if (!groups.has(moduleKey)) {
      groups.set(moduleKey, [])
    }

    groups.get(moduleKey).push({
      ...permission,
      actionLabel
    })
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, items]) => ({
      module,
      label: formatPermissionModuleLabel(module),
      permissions: items.sort((a, b) => (a?.code ?? '').localeCompare(b?.code ?? ''))
    }))
}

/** Segment modul dari kode permission (untuk filter list). */
export function getPermissionModuleKey(code) {
  if (!code) return 'other'
  const dotIndex = code.indexOf('.')

  return dotIndex > 0 ? code.slice(0, dotIndex) : 'other'
}
