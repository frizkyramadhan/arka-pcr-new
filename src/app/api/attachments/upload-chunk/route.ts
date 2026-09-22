/**
 * POST /api/attachments/upload-chunk — append base64 chunk; final chunk creates Attachment.
 */
import fs from 'fs'
import path from 'path'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import type { AttachmentEntityType } from '@prisma/client'

import {
  buildAttachmentStoragePath,
  ensureAttachmentsDir,
  getAttachmentTmpDir,
  getAttachmentsDir
} from '@/lib/fms/attachment-storage'
import { attachmentInclude, mapAttachment, uniqueAttachmentFileName } from '@/lib/fms/attachments'
import { requireAttachmentWrite } from '@/lib/fms/attachment-auth'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/utils/api-auth'

export const runtime = 'nodejs'

type ChunkUploadMeta = {
  entityType: AttachmentEntityType
  entityId: string
  uploadedById: number
  fileName: string
  fileType: string | null
  totalSize: number
  totalChunks: number
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const id = String(body.uploadId || '').trim()
  const index = parseInt(String(body.chunkIndex ?? ''), 10)
  const total = parseInt(String(body.totalChunks ?? ''), 10)
  const base64 = body.data

  try {
    if (!id) {
      return NextResponse.json({ error: 'uploadId is required' }, { status: 400 })
    }
    if (!Number.isInteger(index) || index < 0 || !Number.isInteger(total) || total <= 0 || index >= total) {
      return NextResponse.json({ error: 'Invalid chunkIndex or totalChunks' }, { status: 400 })
    }
    if (!base64 || typeof base64 !== 'string') {
      return NextResponse.json({ error: 'Chunk data (base64) is required' }, { status: 400 })
    }

    const dir = path.join(getAttachmentTmpDir(), id)
    const metaPath = path.join(dir, 'meta.json')
    const dataPath = path.join(dir, 'data')

    if (!fs.existsSync(metaPath)) {
      return NextResponse.json(
        { error: 'Upload session not found or expired. Please start a new upload.' },
        { status: 404 }
      )
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as ChunkUploadMeta

    const forbidden = requireAttachmentWrite(session, meta.entityType)
    if (forbidden) return forbidden

    let buffer: Buffer
    try {
      buffer = Buffer.from(base64, 'base64')
    } catch {
      return NextResponse.json({ error: 'Invalid base64 chunk data' }, { status: 400 })
    }

    fs.appendFileSync(dataPath, buffer)
    const isLast = index === total - 1

    if (!isLast) {
      return NextResponse.json({ ok: true })
    }

    const stats = fs.statSync(dataPath)
    if (stats.size !== meta.totalSize) {
      try {
        fs.rmSync(dir, { recursive: true })
      } catch {
        /* ignore cleanup errors */
      }

      return NextResponse.json(
        { error: 'File size mismatch. Upload may be corrupted. Please try again.' },
        { status: 400 }
      )
    }

    ensureAttachmentsDir()
    const storedName = uniqueAttachmentFileName(meta.fileName)
    const destPath = path.join(getAttachmentsDir(), storedName)
    fs.renameSync(dataPath, destPath)
    const storagePath = buildAttachmentStoragePath(storedName)

    const attachment = await prisma.attachment.create({
      data: {
        entityType: meta.entityType,
        entityId: meta.entityId,
        fileName: meta.fileName,
        storagePath,
        fileType: meta.fileType,
        fileSize: meta.totalSize,
        uploadedById: meta.uploadedById
      },
      include: attachmentInclude
    })

    try {
      fs.unlinkSync(metaPath)
      fs.rmdirSync(dir)
    } catch {
      /* ignore cleanup errors */
    }

    return NextResponse.json({ attachments: [mapAttachment(attachment)] }, { status: 201 })
  } catch (error) {
    console.error('[upload-chunk]', error instanceof Error ? error.message : error)

    return NextResponse.json({ error: 'Failed to save chunk.' }, { status: 500 })
  }
}
