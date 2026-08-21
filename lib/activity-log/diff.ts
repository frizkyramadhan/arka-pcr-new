/**
 * Diff helper — Spatie attribute_changes { attributes, old }.
 */

import type { ActivityAttributeChanges } from '@/lib/activity-log/types'

const DEFAULT_EXCEPT = ['password', 'updatedAt', 'createdAt', 'deletedAt']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return Number(value)
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber()
  }

  return value
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right))
}

/** Compare two snapshots; only changed keys appear in old/attributes. */
export function attributeChanges(
  oldValues: Record<string, unknown> | null | undefined,
  newValues: Record<string, unknown> | null | undefined,
  options: { except?: string[] } = {}
): ActivityAttributeChanges | null {
  const except = new Set([...(options.except ?? []), ...DEFAULT_EXCEPT])
  const old: Record<string, unknown> = {}
  const attributes: Record<string, unknown> = {}

  const keys = new Set([
    ...Object.keys(isPlainObject(oldValues) ? oldValues : {}),
    ...Object.keys(isPlainObject(newValues) ? newValues : {})
  ])

  for (const key of keys) {
    if (except.has(key)) continue
    const before = oldValues?.[key]
    const after = newValues?.[key]
    if (valuesEqual(before, after)) continue
    old[key] = normalizeValue(before) ?? null
    attributes[key] = normalizeValue(after) ?? null
  }

  if (Object.keys(attributes).length === 0) return null

  return { old, attributes }
}

/** Snapshot for create events — only `attributes`. */
export function createdAttributes(
  values: Record<string, unknown>,
  options: { except?: string[] } = {}
): ActivityAttributeChanges {
  const except = new Set([...(options.except ?? []), ...DEFAULT_EXCEPT, 'password'])
  const attributes: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(values)) {
    if (except.has(key)) continue
    attributes[key] = normalizeValue(value) ?? null
  }

  return { attributes }
}
