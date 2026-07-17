/**
 * BA PCR rejection history — JSON array stored on ba_pcr.rejection_history.
 */

export type BaPcrRejectionHistoryEntry = {
  rejectedAt: string
  submittedAt: string | null
  noBaPcr: string | null
  level: string
  levelLabel: string | null
  note: string | null
  rejectedBy: number | null
  rejectedByName: string | null
}

function isValidEntry(value: unknown): value is BaPcrRejectionHistoryEntry {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>

  return typeof row.rejectedAt === 'string' && typeof row.level === 'string'
}

export function parseRejectionHistory(value: unknown): BaPcrRejectionHistoryEntry[] {
  if (!Array.isArray(value)) return []

  return value.filter(isValidEntry)
}

export function appendRejectionHistory(
  existing: unknown,
  entry: BaPcrRejectionHistoryEntry
): BaPcrRejectionHistoryEntry[] {
  return [...parseRejectionHistory(existing), entry]
}

export function formatRejectorName(
  user: { fullName: string | null; username: string | null; idUser?: number } | null | undefined
): string | null {
  if (!user) return null

  return user.fullName || user.username || (user.idUser ? `#${user.idUser}` : null)
}
