/**
 * Siapa yang boleh convert forecast → replacement WO (manual).
 * Planner Foreman (`forecasts.submit`) atau user yang mengajukan BA PCR (`submittedBy`).
 */
import type { Session } from 'next-auth'

import { isAclEnabled } from '@/lib/acl/config'
import { hasPermission } from '@/lib/utils/api-auth'

export type ForecastConvertSubject = {
  submittedBy?: number | null
}

export function canUserConvertForecast(session: Session, forecast: ForecastConvertSubject): boolean {
  if (!isAclEnabled()) return true
  if (hasPermission(session, 'system.admin')) return true

  const userId = Number(session.user?.id)
  if (!Number.isFinite(userId)) return false

  if (hasPermission(session, 'forecasts.submit')) return true
  if (forecast.submittedBy != null && forecast.submittedBy === userId) return true

  return false
}
