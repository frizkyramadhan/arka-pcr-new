/**
 * Client-safe cannibal document gate — MR, PR, WO, and notes before Submit for Approval.
 * Browser pages import this file. Do not import Prisma, api-auth, or workflow.ts here;
 * that pulls DATABASE_URL into the client bundle and crashes /cannibals.
 */
type CannibalDocumentFields = {
  mrNo?: string | null
  prNo?: string | null
  executionNotes?: string | null

  /** Kept on old records. Submit and close ignore this flag. */
  documentationComplete?: boolean
  pairs?: Array<{ remove?: { woNoKanibal?: string | null }; install?: { woNoKanibal?: string | null } }>
}

/** Saved WO numbers and documentation notes. The documentation-complete checkbox is not part of this check. */
export function isExecutionComplete(ba: CannibalDocumentFields): boolean {
  if (!ba.executionNotes?.trim()) return false

  const pairs = ba.pairs ?? []
  if (pairs.length === 0) return false

  return pairs.every(pair => pair.remove?.woNoKanibal?.trim() && pair.install?.woNoKanibal?.trim())
}

function joinRequiredLabels(items: string[]): string {
  if (items.length === 1) return `${items[0]} is required before submit for approval`
  if (items.length === 2) return `${items[0]} and ${items[1]} are required before submit for approval`

  const last = items[items.length - 1]

  return `${items.slice(0, -1).join(', ')}, and ${last} are required before submit for approval`
}

/** Missing saved documents that block Submit for Approval. Null when MR, PR, both WO numbers, and notes are present. */
export function cannibalSubmitDocumentError(ba: CannibalDocumentFields): string | null {
  const missing: string[] = []

  if (!ba.mrNo?.trim()) missing.push('MR#')
  if (!ba.prNo?.trim()) missing.push('PR#')

  const pairs = ba.pairs ?? []
  const missingRemove = pairs.length === 0 || pairs.some(pair => !pair.remove?.woNoKanibal?.trim())
  const missingInstall = pairs.length === 0 || pairs.some(pair => !pair.install?.woNoKanibal?.trim())

  if (missingRemove) missing.push('WO REMOVE')
  if (missingInstall) missing.push('WO INSTALL')
  if (!ba.executionNotes?.trim()) missing.push('documentation notes')

  if (missing.length === 0) return null

  return joinRequiredLabels(missing)
}
