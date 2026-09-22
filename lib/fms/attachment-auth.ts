/**
 * Map attachment entity types to RBAC permission codes (read / write).
 */
import type { AttachmentEntityType } from '@prisma/client'
import type { NextResponse } from 'next/server'
import type { Session } from 'next-auth'

import {
  requireAnyPermissionOrForbidden,
  requirePermissionOrForbidden
} from '@/lib/utils/api-auth'

const READ_PERMISSION: Record<AttachmentEntityType, string> = {
  MAINTENANCE_ACTUAL: 'maintenance-actual.read',
  MAINTENANCE_PLAN: 'maintenance-actual.read',
  INSPECTION: 'inspections.access',
  PCR_FORECAST: 'forecasts.access'
}

const WRITE_PERMISSIONS: Record<AttachmentEntityType, string[]> = {
  MAINTENANCE_ACTUAL: ['maintenance-actual.update', 'maintenance-actual.create'],
  MAINTENANCE_PLAN: ['maintenance-actual.update', 'maintenance-actual.create'],
  INSPECTION: ['inspections.update', 'inspections.create'],
  PCR_FORECAST: ['forecasts.update', 'forecasts.submit', 'forecasts.create']
}

export function requireAttachmentRead(session: Session, entityType: AttachmentEntityType): NextResponse | null {
  return requirePermissionOrForbidden(session, READ_PERMISSION[entityType])
}

export function requireAttachmentWrite(session: Session, entityType: AttachmentEntityType): NextResponse | null {
  return requireAnyPermissionOrForbidden(session, WRITE_PERMISSIONS[entityType])
}

/** Resolve permissions from a stored attachment row (download / delete). */
export function requireAttachmentReadForId(
  session: Session,
  entityType: AttachmentEntityType
): NextResponse | null {
  return requireAttachmentRead(session, entityType)
}

export function requireAttachmentWriteForId(
  session: Session,
  entityType: AttachmentEntityType
): NextResponse | null {
  return requireAttachmentWrite(session, entityType)
}
