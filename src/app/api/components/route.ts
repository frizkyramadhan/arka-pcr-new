/**
 * REST collection endpoint: GET /api/components (list), POST /api/components (create).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { listComponents, parseComponentListQuery } from '@/lib/components/service'
import { prisma } from '@/lib/prisma'
import { componentSchema } from '@/lib/validations/component'
import { requirePermissionOrForbidden, requireSession } from '@/lib/utils/api-auth'

export async function GET(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const query = parseComponentListQuery(request.nextUrl.searchParams)
  const result = await listComponents(query)

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const forbidden = requirePermissionOrForbidden(session, 'components.create')
  if (forbidden) return forbidden

  const body = await request.json()
  const parsed = componentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const component = await prisma.comp.create({
    data: {
      compDesc: parsed.data.compDesc,
      compType: parsed.data.compType ?? null,
      status: parsed.data.status
    }
  })

  return NextResponse.json(component, { status: 201 })
}
