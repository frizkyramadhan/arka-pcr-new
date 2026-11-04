/**
 * Operator and mechanic labels on the breakdown list and detail.
 * A stored name that repeats the NIK still needs the employee master name.
 * The same first and last name is shown once.
 */

export function nameNeedsLookup(code: string | null | undefined, name: string | null | undefined): boolean {
  const left = (code ?? '').trim()
  if (!left) return false
  const right = (name ?? '').trim()

  return !right || right === left
}

/** Join first / middle / last; drop empty parts and consecutive duplicates (e.g. HERI HERI → HERI). */
export function employeeDisplayName(firstName: unknown, lastName: unknown, middleName?: unknown): string {
  const parts = [firstName, middleName, lastName]
    .map(value => String(value ?? '').trim())
    .filter(Boolean)

  const unique: string[] = []
  for (const part of parts) {
    const prev = unique[unique.length - 1]
    if (prev && prev.toLowerCase() === part.toLowerCase()) continue
    unique.push(part)
  }

  return unique.join(' ')
}

/** "HERI HERI" becomes "HERI". Any other name stays as stored. */
export function collapseRepeatedName(name: string | null | undefined): string | null {
  const text = (name ?? '').trim()
  if (!text) return null
  const parts = text.split(/\s+/)
  if (parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) return parts[0]

  return text
}

/** NIK and name together. A name that is already the whole value is shown once. */
export function personLabel(code: string | null | undefined, name: string | null | undefined): string {
  const left = (code ?? '').trim()
  const right = collapseRepeatedName(name) ?? ''
  if (left && right && left !== right) return `${left} · ${right}`

  return right || left
}
