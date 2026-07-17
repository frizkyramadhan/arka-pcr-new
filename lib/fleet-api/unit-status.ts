/**
 * ARK Fleet unit status values — ACTIVE, IN-ACTIVE, SCRAP, SOLD.
 */
export const FLEET_UNIT_STATUSES = ['ACTIVE', 'IN-ACTIVE', 'SCRAP', 'SOLD'] as const

export type FleetUnitStatus = (typeof FLEET_UNIT_STATUSES)[number]

/** Filter dropdown options (empty value = all statuses). */
export const UNIT_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'IN-ACTIVE', label: 'In-active' },
  { value: 'SCRAP', label: 'Scrap' },
  { value: 'SOLD', label: 'Sold' }
]

export function normalizeUnitStatus(value: string | null | undefined): string {
  return (value ?? '').toUpperCase().replace(/\s+/g, '')
}

/** Match unit row status against filter code (handles IN-ACTIVE / INACTIVE). */
export function matchesUnitStatus(unitStatus: string, filterStatus: string): boolean {
  if (!filterStatus) return true

  const unit = normalizeUnitStatus(unitStatus)
  const filter = normalizeUnitStatus(filterStatus)

  if (filter === 'ACTIVE') return unit === 'ACTIVE'
  if (filter === 'INACTIVE' || filter === 'IN-ACTIVE') {
    return unit === 'INACTIVE' || unit === 'IN-ACTIVE'
  }
  if (filter === 'SCRAP') return unit === 'SCRAP'
  if (filter === 'SOLD') return unit === 'SOLD'

  return unit === filter
}

/** MUI chip color per fleet status. */
export function getUnitStatusChipColor(
  status: string | null | undefined
): 'success' | 'warning' | 'secondary' | 'info' | 'error' {
  const normalized = normalizeUnitStatus(status)

  if (normalized === 'ACTIVE') return 'success'
  if (normalized === 'INACTIVE' || normalized === 'IN-ACTIVE') return 'warning'
  if (normalized === 'SCRAP') return 'secondary'
  if (normalized === 'SOLD') return 'info'

  return 'error'
}
