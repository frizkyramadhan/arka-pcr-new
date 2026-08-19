/**
 * Audit log pengiriman email (notification_log).
 */

import { prisma } from '@/lib/prisma'
import type { NotificationEvent, SendMailResult } from '@/lib/notifications/types'

export type NotificationLogInput = {
  event: NotificationEvent
  entityKey: string
  recipientEmail: string
  recipientUserId?: number | null
  subject: string
  result: SendMailResult
  /** Optional actor (e.g. admin trial sender). */
  sentBy?: number | null
  entityType?: string | null
  entityId?: string | null
}

function splitEntityKey(entityKey: string): { entityType: string; entityId: string; dedupeKey: string } {
  const parts = entityKey.split('/')
  const entityType = (parts[0] ?? 'notification').slice(0, 30)
  const entityId = (parts.slice(1).join('/') || entityKey).slice(0, 50)
  const dedupeKey = entityKey.slice(0, 120)

  return { entityType, entityId, dedupeKey }
}

export async function writeNotificationLog(input: NotificationLogInput): Promise<void> {
  try {
    const split = splitEntityKey(input.entityKey)

    await prisma.notificationLog.create({
      data: {
        event: input.event.slice(0, 50),
        entityType: input.entityType?.slice(0, 30) ?? split.entityType,
        entityId: input.entityId?.slice(0, 50) ?? split.entityId,
        recipient: input.recipientEmail.slice(0, 255),
        subject: input.subject.slice(0, 255),
        status: input.result.ok ? (input.result.skipped ? 'SKIPPED' : 'SENT') : 'FAILED',
        messageId: input.result.ok ? input.result.id : null,
        errorMessage: input.result.ok
          ? input.result.reason ?? null
          : input.result.error.message.slice(0, 2000),
        dedupeKey: split.dedupeKey,
        sentBy: input.sentBy ?? input.recipientUserId ?? null
      }
    })
  } catch (err) {
    console.error(
      '[notifications] failed to write notification_log:',
      err instanceof Error ? err.message : err
    )
  }
}

/** True jika sudah ada kiriman sukses untuk dedupeKey hari ini (dedup cron). */
export async function wasNotifiedToday(entityKey: string): Promise<boolean> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const dedupeKey = entityKey.slice(0, 120)

  const existing = await prisma.notificationLog.findFirst({
    where: {
      dedupeKey,
      status: 'SENT',
      createdAt: { gte: start }
    },
    select: { id: true }
  })

  return Boolean(existing)
}
