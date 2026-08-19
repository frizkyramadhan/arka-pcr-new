/**
 * Fluent activity logger — Spatie `activity()->causedBy()->performedOn()->log()`.
 * Fail-soft: write errors are logged, never thrown to callers.
 */

import type { Session } from 'next-auth'
import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import type { ActivityAttributeChanges, ActivityLogInput } from '@/lib/activity-log/types'

function isEnabled(): boolean {
  return process.env.ACTIVITYLOG_ENABLED !== 'false'
}

function sessionUserId(session?: Session | null): number | null {
  const raw = session?.user?.id
  const id = Number(raw)
  if (!id || Number.isNaN(id)) return null

  return id
}

export class ActivityLogger {
  private payload: ActivityLogInput = {
    logName: 'default',
    description: ''
  }

  useLog(name: string): this {
    this.payload.logName = name

    return this
  }

  event(event: string): this {
    this.payload.event = event

    return this
  }

  performedOn(subjectType: string, subjectId: number | null | undefined): this {
    this.payload.subjectType = subjectType
    this.payload.subjectId = subjectId ?? null

    return this
  }

  on(subjectType: string, subjectId: number | null | undefined): this {
    return this.performedOn(subjectType, subjectId)
  }

  causedBy(causer: Session | number | null | undefined): this {
    if (causer && typeof causer === 'object') {
      this.payload.causerType = 'User'
      this.payload.causerId = sessionUserId(causer)
    } else if (typeof causer === 'number' && causer > 0) {
      this.payload.causerType = 'User'
      this.payload.causerId = causer
    } else {
      this.payload.causerType = null
      this.payload.causerId = null
    }

    return this
  }

  by(causer: Session | number | null | undefined): this {
    return this.causedBy(causer)
  }

  causedByAnonymous(): this {
    this.payload.causerType = null
    this.payload.causerId = null

    return this
  }

  withProperties(properties: Record<string, unknown> | null | undefined): this {
    this.payload.properties = properties ?? null

    return this
  }

  withAttributeChanges(changes: ActivityAttributeChanges | null | undefined): this {
    this.payload.attributeChanges = changes ?? null

    return this
  }

  tap(callback: (input: ActivityLogInput) => void): this {
    callback(this.payload)

    return this
  }

  async log(description: string): Promise<void> {
    this.payload.description = description
    await writeActivityLog(this.payload)
  }
}

export function activity(logName?: string): ActivityLogger {
  const logger = new ActivityLogger()
  if (logName) logger.useLog(logName)

  return logger
}

/** Fire-and-forget wrapper — services should prefer this so logging never blocks CRUD. */
export function logActivity(input: ActivityLogInput & { session?: Session | null }): void {
  const { session, ...rest } = input
  const causerId =
    typeof rest.causerId === 'number'
      ? rest.causerId
      : session
        ? sessionUserId(session)
        : null

  void writeActivityLog({
    ...rest,
    causerId,
    causerType: causerId ? rest.causerType ?? 'User' : null
  })
}

export async function writeActivityLog(input: ActivityLogInput): Promise<void> {
  if (!isEnabled()) return

  const description = input.description?.trim()
  if (!description) return

  try {
    await prisma.activityLog.create({
      data: {
        logName: input.logName?.slice(0, 50) ?? 'default',
        description: description.slice(0, 65000),
        event: input.event?.slice(0, 50) ?? null,
        subjectType: input.subjectType?.slice(0, 100) ?? null,
        subjectId: input.subjectId ?? null,
        causerType: input.causerId ? (input.causerType ?? 'User').slice(0, 100) : null,
        causerId: input.causerId ?? null,
        attributeChanges: (input.attributeChanges ?? undefined) as Prisma.InputJsonValue | undefined,
        properties: (input.properties ?? undefined) as Prisma.InputJsonValue | undefined,
        batchUuid: input.batchUuid?.slice(0, 36) ?? null
      }
    })
  } catch (err) {
    console.error('[activity-log] failed to write:', err instanceof Error ? err.message : err)
  }
}
