/**
 * POST /api/attachments/upload — JSON base64 upload (FMS Maintenance Actual detail).
 * Body: { entityType, entityId, uploadedById?, files: [{ name, type?, data: base64 }] }
 */
import fs from 'fs'
import path from 'path'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import {
  buildAttachmentStoragePath,
  ensureAttachmentsDir,
  getAttachmentsDir
} from '@/lib/fms/attachment-storage'
import {
  assertAttachmentRelatedEntityExists,
  attachmentInclude,
  isSupportedEntityType,
  mapAttachment,
  resolveUploadedById,
  uniqueAttachmentFileName
} from '@/lib/fms/attachments'
import { requireAttachmentWrite } from '@/lib/fms/attachment-auth'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/utils/api-auth'

export const runtime = 'nodejs'

const BODY_LIMIT_BYTES = 10 * 1024 * 1024
const MAX_FILE_SIZE = 3 * 1024 * 1024
const LOG_PREFIX = '[upload-api]'

type UploadFilePayload = {
  name?: string
  type?: string
  data?: string
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > BODY_LIMIT_BYTES) {
    console.warn(LOG_PREFIX, 'body too large', { limit: BODY_LIMIT_BYTES })

    return NextResponse.json(
      { error: `Request body too large. Maximum is ${BODY_LIMIT_BYTES / 1024 / 1024}mb.` },
      { status: 413 }
    )
  }

  let body: Record<string, unknown>
  try {
    const raw = await request.text()
    if (Buffer.byteLength(raw, 'utf8') > BODY_LIMIT_BYTES) {
      return NextResponse.json(
        { error: `Request body too large. Maximum is ${BODY_LIMIT_BYTES / 1024 / 1024}mb.` },
        { status: 413 }
      )
    }
    body = JSON.parse(raw) as Record<string, unknown>
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body (expected JSON)' }, { status: 400 })
    }
    console.error(LOG_PREFIX, 'body read/parse error', error)

    return NextResponse.json({ error: 'Invalid request body (expected JSON)' }, { status: 400 })
  }

  const sessionUserId = Number(session.user.id)
  const type = String(body.entityType || '').trim()
  const id = String(body.entityId || '').trim()
  const uploadedById = resolveUploadedById(body.uploadedById, sessionUserId)
  const filesPayload = body.files

  let payloadSize = 0
  if (Array.isArray(filesPayload)) {
    payloadSize = filesPayload.reduce(
      (sum, f) => sum + (typeof (f as UploadFilePayload)?.data === 'string' ? (f as UploadFilePayload).data!.length : 0),
      0
    )
  }

  console.log(LOG_PREFIX, 'request received', {
    contentLength: contentLength ? `${contentLength} bytes` : 'missing',
    bodyKeys: Object.keys(body),
    filesCount: Array.isArray(filesPayload) ? filesPayload.length : filesPayload ? 1 : 0,
    totalBase64Length: payloadSize ? `${payloadSize} chars (~${Math.round(payloadSize / 1024)} KB)` : 0
  })

  try {
    if (!type || !id) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
    }
    if (uploadedById === null) {
      return NextResponse.json({ error: 'uploadedById is required' }, { status: 400 })
    }
    if (!isSupportedEntityType(type)) {
      return NextResponse.json({ error: 'Unsupported entityType' }, { status: 400 })
    }

    const forbidden = requireAttachmentWrite(session, type)
    if (forbidden) return forbidden

    await assertAttachmentRelatedEntityExists(type, id)

    const items: UploadFilePayload[] = Array.isArray(filesPayload)
      ? filesPayload
      : filesPayload
        ? [filesPayload as UploadFilePayload]
        : []
    if (items.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 })
    }

    ensureAttachmentsDir()
    const uploadDir = getAttachmentsDir()
    const created = []

    for (const item of items) {
      const name = String(item?.name || 'file').trim()
      const base64 = item?.data
      if (!base64 || typeof base64 !== 'string') continue

      let buffer: Buffer
      try {
        buffer = Buffer.from(base64, 'base64')
      } catch {
        return NextResponse.json({ error: `Invalid base64 data for file "${name}"` }, { status: 400 })
      }

      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File "${name}" is too large. Maximum allowed is ${MAX_FILE_SIZE / 1024 / 1024} MB per file.`
          },
          { status: 400 }
        )
      }

      const storedName = uniqueAttachmentFileName(name)
      const destPath = path.join(uploadDir, storedName)
      fs.writeFileSync(destPath, buffer)
      const storagePath = buildAttachmentStoragePath(storedName)
      const mime = item.type && String(item.type).trim() ? String(item.type).trim() : null

      const attachment = await prisma.attachment.create({
        data: {
          entityType: type,
          entityId: id,
          fileName: name,
          storagePath,
          fileType: mime,
          fileSize: buffer.length,
          uploadedById
        },
        include: attachmentInclude
      })
      created.push(mapAttachment(attachment))
    }

    if (created.length === 0) {
      return NextResponse.json({ error: 'No valid file data received' }, { status: 400 })
    }

    console.log(LOG_PREFIX, 'success', { created: created.length, fileNames: created.map(a => a.fileName) })

    return NextResponse.json({ attachments: created }, { status: 201 })
  } catch (error) {
    console.error(LOG_PREFIX, 'handler error', {
      message: error instanceof Error ? error.message : String(error),
      code: error && typeof error === 'object' && 'code' in error ? error.code : undefined
    })

    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        {
          error: 'Related maintenance record was not found. Please refresh the page and try again.'
        },
        { status: 400 }
      )
    }

    const detail = error instanceof Error ? error.message : String(error)

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development'
            ? `Upload failed: ${detail}`
            : 'Unexpected server error while uploading file. Please try again later or contact the administrator.'
      },
      { status: 500 }
    )
  }
}
