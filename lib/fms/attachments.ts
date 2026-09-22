/**
 * Shared attachment DTO mapping, validation, and filename helpers (FMS parity).
 */
import path from 'path'

import type { Attachment, AttachmentEntityType, User } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export const SUPPORTED_ATTACHMENT_ENTITY_TYPES: AttachmentEntityType[] = [
  'MAINTENANCE_ACTUAL',
  'MAINTENANCE_PLAN',
  'INSPECTION',
  'PCR_FORECAST'
]

export type AttachmentWithUploader = Attachment & {
  uploadedBy: Pick<User, 'username'>
}

export function mapAttachment(a: AttachmentWithUploader) {
  return {
    id: a.id,
    entityType: a.entityType,
    entityId: a.entityId,
    fileName: a.fileName,
    fileType: a.fileType ?? null,
    fileSize: a.fileSize ?? null,
    storagePath: a.storagePath,
    uploadedById: a.uploadedById,
    uploadedByUsername: a.uploadedBy?.username ?? null,
    uploadedAt: a.uploadedAt.toISOString()
  }
}

export function isSupportedEntityType(value: string): value is AttachmentEntityType {
  return SUPPORTED_ATTACHMENT_ENTITY_TYPES.includes(value as AttachmentEntityType)
}

export function sanitizeFileName(name: string): string {
  return (name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120)
}

export function uniqueAttachmentFileName(originalName: string): string {
  const ext = path.extname(originalName) || ''
  const base = sanitizeFileName(path.basename(originalName, ext))
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

  return `${unique}-${base}${ext}`.slice(0, 200)
}

/** Prefer explicit body uploadedById; fall back to session user idUser. */
export function resolveUploadedById(bodyUploadedById: unknown, sessionUserId: number): number | null {
  if (bodyUploadedById !== undefined && bodyUploadedById !== null && String(bodyUploadedById).trim() !== '') {
    const parsed = parseInt(String(bodyUploadedById), 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return null

    return parsed
  }

  if (Number.isFinite(sessionUserId) && sessionUserId > 0) return sessionUserId

  return null
}

export async function assertAttachmentRelatedEntityExists(
  entityType: AttachmentEntityType,
  entityId: string
): Promise<void> {
  if (entityType === 'MAINTENANCE_ACTUAL') {
    await prisma.maintenanceActual.findUniqueOrThrow({ where: { id: entityId } })

    return
  }

  if (entityType === 'MAINTENANCE_PLAN') {
    await prisma.maintenancePlan.findUniqueOrThrow({ where: { id: entityId } })

    return
  }

  if (entityType === 'INSPECTION') {
    const idIns = parseInt(entityId, 10)
    if (!Number.isFinite(idIns) || idIns <= 0) {
      throw new Error('Invalid inspection id')
    }
    await prisma.inspection.findFirstOrThrow({ where: { idIns, deletedAt: null } })

    return
  }

  if (entityType === 'PCR_FORECAST') {
    const idForecast = parseInt(entityId, 10)
    if (!Number.isFinite(idForecast) || idForecast <= 0) {
      throw new Error('Invalid forecast id')
    }
    await prisma.pcrForecast.findFirstOrThrow({ where: { idForecast, deletedAt: null } })
  }
}

export const attachmentInclude = {
  uploadedBy: { select: { username: true } }
} as const
