/**
 * GET /api/attachments — list by entityType & entityId.
 * POST /api/attachments — create metadata-only attachment row (external or pre-uploaded path).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  assertAttachmentRelatedEntityExists,
  attachmentInclude,
  isSupportedEntityType,
  mapAttachment,
  resolveUploadedById
} from '@/lib/fms/attachments'
import { requireAttachmentRead, requireAttachmentWrite } from '@/lib/fms/attachment-auth'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/utils/api-auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = request.nextUrl
  const type = String(searchParams.get('entityType') || '').trim()
  const id = String(searchParams.get('entityId') || '').trim()

  if (!type || !id) {
    return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
  }

  if (!isSupportedEntityType(type)) {
    return NextResponse.json({ error: 'Unsupported entityType' }, { status: 400 })
  }

  const forbidden = requireAttachmentRead(session, type)
  if (forbidden) return forbidden

  try {
    const attachments = await prisma.attachment.findMany({
      where: { entityType: type, entityId: id },
      include: attachmentInclude,
      orderBy: [{ uploadedAt: 'desc' }]
    })

    return NextResponse.json({
      attachments: attachments.map(mapAttachment),
      total: attachments.length,
      params: { entityType: type, entityId: id }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list attachments'
    console.error('GET /api/attachments', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const sessionUserId = Number(session.user.id)
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const type = String(body.entityType || '').trim()
  const id = String(body.entityId || '').trim()
  const name = String(body.fileName || '').trim()
  const storagePath = String(body.storagePath || '').trim()
  const uploadedById = resolveUploadedById(body.uploadedById, sessionUserId)

  if (!type || !id) {
    return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: 'fileName is required' }, { status: 400 })
  }
  if (!storagePath) {
    return NextResponse.json({ error: 'storagePath is required' }, { status: 400 })
  }
  if (uploadedById === null) {
    return NextResponse.json({ error: 'uploadedById is required' }, { status: 400 })
  }

  if (!isSupportedEntityType(type)) {
    return NextResponse.json({ error: 'Unsupported entityType' }, { status: 400 })
  }

  const forbidden = requireAttachmentWrite(session, type)
  if (forbidden) return forbidden

  const fileSizeRaw = body.fileSize

  const size =
    fileSizeRaw !== undefined && fileSizeRaw !== null && String(fileSizeRaw).trim() !== ''
      ? parseInt(String(fileSizeRaw), 10)
      : null

  if (size !== null && (Number.isNaN(size) || size < 0)) {
    return NextResponse.json({ error: 'fileSize must be a non-negative number if provided' }, { status: 400 })
  }

  const fileTypeRaw = body.fileType

  const fileType =
    fileTypeRaw != null && String(fileTypeRaw).trim() !== '' ? String(fileTypeRaw).trim() : null

  try {
    await assertAttachmentRelatedEntityExists(type, id)

    const created = await prisma.attachment.create({
      data: {
        entityType: type,
        entityId: id,
        fileName: name,
        storagePath,
        fileType,
        fileSize: size,
        uploadedById
      },
      include: attachmentInclude
    })

    return NextResponse.json({ attachment: mapAttachment(created) }, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Related entity not found' }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Failed to create attachment'
    console.error('POST /api/attachments', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
