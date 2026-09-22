/**
 * GET /api/attachments/[id]/download — stream file from local disk (nginx-safe vs static /uploads).
 */
import { createReadStream, existsSync, statSync } from 'fs'
import path from 'path'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { Readable } from 'stream'

import { resolveAttachmentFilePath } from '@/lib/fms/attachment-storage'
import { requireAttachmentReadForId } from '@/lib/fms/attachment-auth'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/utils/api-auth'

export const runtime = 'nodejs'

type RouteContext = {
  params: { id: string }
}

function guessAttachmentMime(fileName: string): string {
  const ext = path.extname(fileName || '').toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.bmp':
      return 'image/bmp'
    case '.pdf':
      return 'application/pdf'
    default:
      return 'application/octet-stream'
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: String(id) } })
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    const forbidden = requireAttachmentReadForId(session, attachment.entityType)
    if (forbidden) return forbidden

    const filePath = resolveAttachmentFilePath(attachment.storagePath)
    if (!filePath || !existsSync(filePath)) {
      console.error('[attachment-download] file missing', {
        id: attachment.id,
        storagePath: attachment.storagePath,
        filePath
      })

      return NextResponse.json({ error: 'File not found on server' }, { status: 404 })
    }

    const stat = statSync(filePath)

    const mime =
      attachment.fileType && !attachment.fileType.includes('octet-stream')
        ? attachment.fileType
        : guessAttachmentMime(attachment.fileName)

    const nodeStream = createReadStream(filePath)
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(stat.size),
        'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        'Cache-Control': 'private, max-age=3600',

        // Help browser/img and proxies under subpath reverse proxy
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('[attachment-download]', error instanceof Error ? error.message : error)

    return NextResponse.json({ error: 'Failed to download attachment' }, { status: 500 })
  }
}
