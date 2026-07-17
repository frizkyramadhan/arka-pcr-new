import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { componentUpdateSchema } from '@/lib/validations/component'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idComp = Number(params.id)
  if (Number.isNaN(idComp)) {
    return NextResponse.json({ error: 'Invalid component id' }, { status: 400 })
  }

  const component = await prisma.comp.findFirst({
    where: { idComp, deletedAt: null }
  })

  if (!component) {
    return NextResponse.json({ error: 'Component not found' }, { status: 404 })
  }

  return NextResponse.json(component)
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'components.update')
  if (forbidden) return forbidden

  const idComp = Number(params.id)
  if (Number.isNaN(idComp)) {
    return NextResponse.json({ error: 'Invalid component id' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = componentUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.comp.findFirst({
    where: { idComp, deletedAt: null }
  })

  if (!existing) {
    return NextResponse.json({ error: 'Component not found' }, { status: 404 })
  }

  const component = await prisma.comp.update({
    where: { idComp },
    data: parsed.data
  })

  return NextResponse.json(component)
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'components.delete')
  if (forbidden) return forbidden

  const idComp = Number(params.id)
  if (Number.isNaN(idComp)) {
    return NextResponse.json({ error: 'Invalid component id' }, { status: 400 })
  }

  const existing = await prisma.comp.findFirst({
    where: { idComp, deletedAt: null }
  })

  if (!existing) {
    return NextResponse.json({ error: 'Component not found' }, { status: 404 })
  }

  await prisma.comp.update({
    where: { idComp },
    data: { deletedAt: new Date(), status: 'Inactive' }
  })

  return NextResponse.json({ success: true })
}
