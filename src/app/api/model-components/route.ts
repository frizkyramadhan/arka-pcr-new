import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { modelComponentSchema } from '@/lib/validations/model-component'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'
import { parseListPagination } from '@/lib/utils/list-pagination'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const { searchParams } = new URL(request.url)
  const fleetModelId = searchParams.get('fleetModelId')

  const where = fleetModelId ? { fleetModelId: Number(fleetModelId) } : {}

  if (fleetModelId && Number.isNaN(Number(fleetModelId))) {
    return NextResponse.json({ error: 'Invalid fleetModelId' }, { status: 400 })
  }

  const pagination = parseListPagination(searchParams)

  const total = await prisma.commod.count({ where })

  const rows = await prisma.commod.findMany({
    where,
    include: {
      comp: {
        select: { idComp: true, compDesc: true, compType: true, status: true }
      }
    },
    orderBy: [{ fleetModelId: 'asc' }, { idMod: 'asc' }],
    skip: pagination.page * pagination.pageSize,
    take: pagination.pageSize
  })

  return NextResponse.json({ total, rows })
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'model-components.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = modelComponentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const comp = await prisma.comp.findFirst({
    where: { idComp: parsed.data.idComp, deletedAt: null }
  })

  if (!comp) {
    return NextResponse.json({ error: 'Component not found' }, { status: 400 })
  }

  try {
    const item = await prisma.commod.create({
      data: {
        fleetModelId: parsed.data.fleetModelId,
        idComp: parsed.data.idComp,
        policy: parsed.data.policy ?? null,
        price: parsed.data.price ?? null,
        lifeType: parsed.data.lifeType ?? null
      },
      include: {
        comp: {
          select: { idComp: true, compDesc: true, compType: true, status: true }
        }
      }
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create failed'

    if (message.includes('uq_commod_model_comp')) {
      return NextResponse.json({ error: 'Policy mapping already exists for this model and component' }, { status: 409 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
