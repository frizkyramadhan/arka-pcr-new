/**
 * Human-readable labels for role names in user/role lists.
 */

export type RoleLabelSource = {
  name: string
  description?: string | null
}

/** `plant_foreman` → `Plant Foreman` */
export function formatRoleName(name: string): string {
  return name
    .split('_')
    .map(part => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

/** Prefer short description (before em dash) from seed template, else formatted name. */
export function getRoleDisplayLabel(role: RoleLabelSource): string {
  const description = role.description?.trim()
  if (description) {
    const short = description.split(' — ')[0]?.trim()
    if (short) return short
  }

  return formatRoleName(role.name)
}
