/**
 * GET /api/attachments/[id] — single attachment metadata.
 * DELETE /api/attachments/[id] — delete row and local file when under /uploads/attachments/.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { deleteAttachmentFileFromDisk } from '@/lib/fms/attachment-storage'
import { attachmentInclude, mapAttachment } from '@/lib/fms/attachments'
import { prisma } from '@/lib/prisma'
import { requireAnyPermissionOrForbidden, requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export const runtime = 'nodejs'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'maintenance-actual.read')
  if (forbidden) return forbidden

  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: attachmentInclude
    })
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    return NextResponse.json(mapAttachment(attachment))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load attachment'
    console.error('GET /api/attachments/[id]', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requireAnyPermissionOrForbidden(session, [
    'maintenance-actual.update',
    'maintenance-actual.create'
  ])
  if (forbidden) return forbidden

  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  try {
    const attachment = await prisma.attachment.findUnique({ where: { id } })
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    deleteAttachmentFileFromDisk(attachment.storagePath)
    await prisma.attachment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }
    const message = error instanceof Error ? error.message : 'Failed to delete attachment'
    console.error('DELETE /api/attachments/[id]', error)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
