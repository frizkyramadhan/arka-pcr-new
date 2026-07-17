import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { modelComponentUpdateSchema } from '@/lib/validations/model-component'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

type RouteContext = {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idMod = Number(params.id)
  if (Number.isNaN(idMod)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const item = await prisma.commod.findUnique({
    where: { idMod },
    include: {
      comp: {
        select: { idComp: true, compDesc: true, compType: true, status: true }
      }
    }
  })

  if (!item) {
    return NextResponse.json({ error: 'Model-component not found' }, { status: 404 })
  }

  return NextResponse.json(item)
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'model-components.update')
  if (forbidden) return forbidden

  const idMod = Number(params.id)
  if (Number.isNaN(idMod)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const body = await request.json()
  const parsed = modelComponentUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.commod.findUnique({ where: { idMod } })
  if (!existing) {
    return NextResponse.json({ error: 'Model-component not found' }, { status: 404 })
  }

  try {
    const item = await prisma.commod.update({
      where: { idMod },
      data: parsed.data,
      include: {
        comp: {
          select: { idComp: true, compDesc: true, compType: true, status: true }
        }
      }
    })

    return NextResponse.json(item)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed'

    if (message.includes('uq_commod_model_comp')) {
      return NextResponse.json(
        { error: 'Policy mapping already exists for this model and component' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'model-components.delete')
  if (forbidden) return forbidden

  const idMod = Number(params.id)
  if (Number.isNaN(idMod)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const existing = await prisma.commod.findUnique({ where: { idMod } })
  if (!existing) {
    return NextResponse.json({ error: 'Model-component not found' }, { status: 404 })
  }

  await prisma.commod.delete({ where: { idMod } })

  return NextResponse.json({ success: true })
}
