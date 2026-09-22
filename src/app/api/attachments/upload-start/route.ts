/**
 * POST /api/attachments/upload-start — begin chunked upload; returns uploadId.
 */
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { ensureAttachmentTmpDir, getAttachmentTmpDir } from '@/lib/fms/attachment-storage'
import { assertAttachmentRelatedEntityExists, isSupportedEntityType, resolveUploadedById } from '@/lib/fms/attachments'
import { requireAttachmentWrite } from '@/lib/fms/attachment-auth'
import { requireSession } from '@/lib/utils/api-auth'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const sessionUserId = Number(session.user.id)
  const type = String(body.entityType || '').trim()
  const id = String(body.entityId || '').trim()
  const uploadedById = resolveUploadedById(body.uploadedById, sessionUserId)
  const name = String(body.fileName || 'file').trim()
  const total = parseInt(String(body.totalSize ?? ''), 10)
  const chunks = parseInt(String(body.totalChunks ?? ''), 10)
  const fileTypeRaw = body.fileType

  try {
    if (!type || !id) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
    }
    if (uploadedById === null) {
      return NextResponse.json({ error: 'uploadedById is required' }, { status: 400 })
    }
    if (!name || !Number.isFinite(total) || total <= 0 || !Number.isInteger(chunks) || chunks <= 0) {
      return NextResponse.json(
        { error: 'fileName, totalSize and totalChunks (positive numbers) are required' },
        { status: 400 }
      )
    }
    if (total > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum is ${MAX_FILE_SIZE / 1024 / 1024} MB.` },
        { status: 400 }
      )
    }
    if (!isSupportedEntityType(type)) {
      return NextResponse.json({ error: 'Unsupported entityType' }, { status: 400 })
    }

    const forbidden = requireAttachmentWrite(session, type)
    if (forbidden) return forbidden

    await assertAttachmentRelatedEntityExists(type, id)

    ensureAttachmentTmpDir()
    const uploadId = randomUUID()
    const dir = path.join(getAttachmentTmpDir(), uploadId)
    fs.mkdirSync(dir, { recursive: true })

    const meta = {
      entityType: type,
      entityId: id,
      uploadedById,
      fileName: name,
      fileType: fileTypeRaw != null && String(fileTypeRaw).trim() ? String(fileTypeRaw).trim() : null,
      totalSize: total,
      totalChunks: chunks
    }
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta))
    fs.writeFileSync(path.join(dir, 'data'), Buffer.alloc(0))

    return NextResponse.json({ uploadId }, { status: 201 })
  } catch (error) {
    console.error('[upload-start]', error instanceof Error ? error.message : error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Related maintenance record was not found.' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to start upload.' }, { status: 500 })
  }
}
