/**
 * Activity-log helpers for breakdown — teks deskripsi mudah dibaca di Activity Logs.
 */
import { logActivity } from '@/lib/activity-log'
import { getBreakdownDetail } from '@/lib/dmbd/list'

type Causer = number | null | undefined

export type BreakdownLogContext = {
  entityId: string
  registerNo?: string | null
  unitNo?: string | null
  projectCode?: string | null
  workOrder?: string | null
  problem?: string | null
  activityCode?: string | null
  position?: string | null
}

function unitLabel(ctx: BreakdownLogContext): string {
  const reg = (ctx.registerNo || '').trim()
  const unit = (ctx.unitNo || '').trim() || 'unit ?'
  const site = (ctx.projectCode || '').trim()
  const who = reg ? `${reg} · ${unit}` : unit

  return site ? `${who} (${site})` : who
}

function woLabel(ctx: BreakdownLogContext): string {
  const wo = (ctx.workOrder || '').trim()

  return wo ? ` · WO ${wo}` : ''
}

function clipProblem(problem: string | null | undefined, max = 60): string {
  const text = (problem || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''

  return text.length > max ? ` — ${text.slice(0, max)}…` : ` — ${text}`
}

/** Bangun kalimat deskripsi yang jelas untuk daftar Activity Logs. */
export function breakdownLogDescription(event: string, ctx: BreakdownLogContext): string {
  const who = unitLabel(ctx)
  const wo = woLabel(ctx)
  const hint = clipProblem(ctx.problem)

  switch (event) {
    case 'created':
      return `Membuat breakdown ${who}${wo}${hint}`
    case 'updated':
      return `Mengubah breakdown ${who}${wo}`
    case 'closed':
      return `Menutup breakdown ${who}${wo} → RFU`
    case 'cancelled':
      return `Membatalkan breakdown ${who}${wo} (status CANCEL, tidak dihitung di dashboard)`
    case 'deleted':
      return `Menghapus permanen breakdown ${who}${wo}`
    case 'activity-added':
      return `Menambah activity ${ctx.activityCode || '?'}${ctx.position ? ` (${ctx.position})` : ''} pada breakdown ${who}${wo}`
    case 'activity-updated':
      return `Mengubah activity ${ctx.activityCode || '?'}${ctx.position ? ` (${ctx.position})` : ''} pada breakdown ${who}${wo}`
    case 'activity-deleted':
      return `Menghapus activity pada breakdown ${who}${wo}`
    case 'imported':
      return ctx.problem || `Import history breakdown${ctx.projectCode ? ` (${ctx.projectCode})` : ''}`
    default:
      return `${event} breakdown ${who}${wo}`
  }
}

export function logBreakdownEvent(input: {
  causerId: Causer
  event: string
  entityId: string
  description?: string
  registerNo?: string | null
  unitNo?: string | null
  projectCode?: string | null
  workOrder?: string | null
  problem?: string | null
  activityCode?: string | null
  position?: string | null
  properties?: Record<string, unknown>
}) {
  const ctx: BreakdownLogContext = {
    entityId: input.entityId,
    registerNo: input.registerNo,
    unitNo: input.unitNo,
    projectCode: input.projectCode,
    workOrder: input.workOrder,
    problem: input.problem,
    activityCode: input.activityCode,
    position: input.position
  }

  logActivity({
    causerId: input.causerId ?? null,
    logName: 'breakdowns',
    event: input.event,
    description: input.description ?? breakdownLogDescription(input.event, ctx),
    subjectType: 'Breakdown',
    properties: {
      entityId: input.entityId,
      registerNo: input.registerNo ?? null,
      unitNo: input.unitNo ?? null,
      projectCode: input.projectCode ?? null,
      workOrder: input.workOrder ?? null,
      ...(input.properties ?? {})
    }
  })
}

/** Load detail for richer log text (fail-soft if missing). */
export async function logBreakdownFromId(
  causerId: Causer,
  event: string,
  entityId: string,
  extra?: {
    activityCode?: string | null
    position?: string | null
    properties?: Record<string, unknown>
    description?: string
  }
) {
  const row = await getBreakdownDetail(entityId).catch(() => null)
  logBreakdownEvent({
    causerId,
    event,
    entityId,
    registerNo: row?.registerNo,
    unitNo: row?.unitNo,
    projectCode: row?.projectCode,
    workOrder: row?.workOrder,
    problem: row?.problem,
    activityCode: extra?.activityCode,
    position: extra?.position,
    properties: extra?.properties,
    description: extra?.description
  })
}
