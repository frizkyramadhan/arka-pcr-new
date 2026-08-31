/**
 * Cannibal form — lookup ordering & single-choice statement helpers.
 */

export const PLANT_STATEMENT_OPTIONS = [
  { value: 'p1', label: 'P1 Unit RFU' },
  { value: 'production', label: 'Production Requirements' },
  { value: 'other', label: 'Other' }
]

export const LOGISTIC_STATEMENT_OPTIONS = [
  { value: 'no_stock', label: 'No Stock' },
  { value: 'lead_time', label: 'Lead Time Part' },
  { value: 'other', label: 'Other' }
]

/** Component status display order (matches BA form). */
export const COMPONENT_STATUS_ORDER = ['BRAND NEW', 'PEX REMAN', 'RESEAL ONLY', 'AS IS REPAIR', 'OTHER']

const normalizeLabel = value => String(value ?? '').trim().toUpperCase().replace(/\s+/g, ' ')

/** Map DB / legacy labels to order keys (e.g. "PEX / REMAN" → PEX REMAN). */
export function normalizeComponentStatusLabel(value) {
  const label = normalizeLabel(value)
  if (label.includes('PEX') && label.includes('REMAN')) return 'PEX REMAN'

  return label
}

export function sortComponentStatuses(statuses = []) {
  return [...statuses].sort((a, b) => {
    const ia = COMPONENT_STATUS_ORDER.indexOf(normalizeComponentStatusLabel(a.status))
    const ib = COMPONENT_STATUS_ORDER.indexOf(normalizeComponentStatusLabel(b.status))
    const rankA = ia === -1 ? 998 : ia
    const rankB = ib === -1 ? 998 : ib

    if (rankA !== rankB) return rankA - rankB

    return (a.idStatus ?? 0) - (b.idStatus ?? 0)
  })
}

/** Planning action display order (matches BA form). */
export const PLANNING_ACTION_OPTIONS = [
  { label: 'Order Component (ASSY)' },
  { label: 'Order Component (Separate)' },
  { label: 'Sent Out Of Site For Repair' },
  { label: 'Not Action (Repair On Site by Our Mechanic)' }
]

export function normalizePlanningActionLabel(value) {
  return normalizeLabel(value)
}

export function isPlanningActionSelected(ba, label) {
  const selected = normalizePlanningActionLabel(ba?.baAction?.action)

  return Boolean(selected) && selected === normalizePlanningActionLabel(label)
}

export function isComponentStatusOther(statusItem) {
  return normalizeComponentStatusLabel(statusItem?.status) === 'OTHER'
}

export function isComponentStatusResealOnly(statusItem) {
  return normalizeComponentStatusLabel(statusItem?.status) === 'RESEAL ONLY'
}

const HIDDEN_COMPONENT_STATUSES = new Set(['GOOD', 'DAMAGED', 'WORN'])

export function isHiddenComponentStatus(statusItem) {
  return HIDDEN_COMPONENT_STATUSES.has(normalizeComponentStatusLabel(statusItem?.status))
}

/** Hide RESEAL ONLY / Good / Damaged / Worn unless the current BA already uses it. */
export function statusesForNewForm(statuses = [], selectedId) {
  const selected = Number(selectedId)

  return sortComponentStatuses(statuses).filter(item => {
    const keepIfSelected = Number.isFinite(selected) && Number(item.idStatus) === selected
    if (isComponentStatusResealOnly(item) || isHiddenComponentStatus(item)) return keepIfSelected

    return true
  })
}

export function plantStatementFromFlags(data) {
  if (data?.plantOther) return 'other'
  if (data?.plantProductionReq) return 'production'
  if (data?.plantP1UnitRfu) return 'p1'

  return ''
}

export function flagsFromPlantStatement(value, otherText = '') {
  return {
    plantP1UnitRfu: value === 'p1',
    plantProductionReq: value === 'production',
    plantOther: value === 'other',
    plantOtherText: value === 'other' ? otherText : ''
  }
}

export function logisticStatementFromFlags(data) {
  if (data?.logisticOther) return 'other'
  if (data?.logisticLeadTime) return 'lead_time'
  if (data?.logisticNoStock) return 'no_stock'

  return ''
}

export function flagsFromLogisticStatement(value, otherText = '', leadTimeDays = '') {
  const days = leadTimeDays === '' || leadTimeDays == null ? null : Number(leadTimeDays)

  return {
    logisticNoStock: value === 'no_stock',
    logisticLeadTime: value === 'lead_time',
    logisticLeadTimeDays: value === 'lead_time' && Number.isFinite(days) && days > 0 ? days : null,
    logisticOther: value === 'other',
    logisticOtherText: value === 'other' ? otherText : ''
  }
}
