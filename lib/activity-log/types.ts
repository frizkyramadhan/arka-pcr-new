/**
 * Types for ARKA PCR activity log — Spatie laravel-activitylog equivalent.
 */

export const ACTIVITY_SUBJECTS = {
  User: 'User',
  Role: 'Role',
  PcrForecast: 'PcrForecast',
  BaPcr: 'BaPcr',
  Ba: 'Ba',
  Replacement: 'Replacement',
  Sos: 'Sos',
  Inspection: 'Inspection',
  Condition: 'Condition',
  HourMeter: 'HourMeter'
} as const

export type ActivitySubjectType = (typeof ACTIVITY_SUBJECTS)[keyof typeof ACTIVITY_SUBJECTS] | string

export const ACTIVITY_LOG_NAMES = {
  default: 'default',
  auth: 'auth',
  users: 'users',
  forecasts: 'forecasts',
  cannibals: 'cannibals',
  replacements: 'replacements',
  sos: 'sos',
  inspections: 'inspections',
  conditions: 'conditions',
  hourMeters: 'hour-meters',
  approvals: 'approvals'
} as const

export type ActivityLogName = (typeof ACTIVITY_LOG_NAMES)[keyof typeof ACTIVITY_LOG_NAMES] | string

export type ActivityAttributeChanges = {
  attributes?: Record<string, unknown>
  old?: Record<string, unknown>
}

export type ActivityLogInput = {
  logName?: string | null
  description: string
  event?: string | null
  subjectType?: string | null
  subjectId?: number | null
  causerType?: string | null
  causerId?: number | null
  properties?: Record<string, unknown> | null
  attributeChanges?: ActivityAttributeChanges | null
  batchUuid?: string | null
}

export type ActivityLogListItem = {
  id: number
  logName: string | null
  description: string
  event: string | null
  subjectType: string | null
  subjectId: number | null
  causerType: string | null
  causerId: number | null
  causerName: string | null
  causerUsername: string | null
  attributeChanges: ActivityAttributeChanges | null
  properties: Record<string, unknown> | null
  batchUuid: string | null
  createdAt: string
}
