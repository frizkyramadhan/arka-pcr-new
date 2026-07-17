/** Normalize unit number for matching legacy ↔ Fleet cache. */
export function normalizeUnitNo(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}
