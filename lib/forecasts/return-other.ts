/**
 * Return To Other Unit — resolve target commod, list pickers, validate cannibal BA.
 */
import type { Session } from 'next-auth'

import {
  cannibalPairMatchesForecast,
  isBlockedCannibalLinkStatus,
  type CannibalLinkPair
} from '@/lib/forecasts/cannibal-link'
import { MISSING_CANNIBAL_LINK_MESSAGE } from '@/lib/forecasts/pcr-supply'
import { prisma } from '@/lib/prisma'

export type OtherUnitTarget = {
  fleetUnitId: number
  unitNo: string
  projectCode: string
  idMod: number
}

export async function resolveOtherUnitTarget(
  sourceIdMod: number,
  donorFleetUnitId: number,
  otherFleetUnitId: number
): Promise<OtherUnitTarget> {
  if (otherFleetUnitId === donorFleetUnitId) {
    throw new Error('Select a different unit for Return To Other Unit')
  }

  const [sourceCommod, otherUnit] = await Promise.all([
    prisma.commod.findUnique({
      where: { idMod: sourceIdMod },
      select: { idMod: true, idComp: true }
    }),
    prisma.fleetUnitCache.findUnique({
      where: { fleetUnitId: otherFleetUnitId },
      select: { fleetUnitId: true, unitNo: true, projectCode: true, fleetModelId: true }
    })
  ])

  if (!sourceCommod) throw new Error('Model-component policy not found')
  if (!otherUnit) throw new Error('Other unit not found')

  const targetCommod = await prisma.commod.findFirst({
    where: { fleetModelId: otherUnit.fleetModelId, idComp: sourceCommod.idComp },
    select: { idMod: true }
  })

  if (!targetCommod) {
    throw new Error('Other unit does not have the same component')
  }

  return {
    fleetUnitId: otherUnit.fleetUnitId,
    unitNo: otherUnit.unitNo,
    projectCode: otherUnit.projectCode,
    idMod: targetCommod.idMod
  }
}

export async function listReturnOtherUnitOptions(
  sourceIdMod: number,
  donorFleetUnitId: number,
  options: { search?: string | null; limit?: number } = {}
) {
  const sourceCommod = await prisma.commod.findUnique({
    where: { idMod: sourceIdMod },
    select: { idComp: true }
  })

  if (!sourceCommod) return []

  const matchingCommods = await prisma.commod.findMany({
    where: { idComp: sourceCommod.idComp },
    select: { fleetModelId: true }
  })

  const fleetModelIds = [...new Set(matchingCommods.map(row => row.fleetModelId))]
  if (fleetModelIds.length === 0) return []

  const limit = Math.min(100, Math.max(1, options.limit ?? 50))
  const search = options.search?.trim()

  const rows = await prisma.fleetUnitCache.findMany({
    where: {
      fleetUnitId: { not: donorFleetUnitId },
      fleetModelId: { in: fleetModelIds },
      ...(search
        ? {
            OR: [{ unitNo: { contains: search } }, { description: { contains: search } }]
          }
        : {})
    },
    select: {
      fleetUnitId: true,
      unitNo: true,
      description: true,
      projectCode: true
    },
    orderBy: [{ unitNo: 'asc' }],
    take: limit
  })

  return rows.map(row => ({
    id: row.fleetUnitId,
    unit_no: row.unitNo,
    description: row.description ?? '',
    project_code: row.projectCode
  }))
}

export async function assertCannibalBaLink(
  cannibalNoBa: string | null | undefined,
  pair: CannibalLinkPair,
  { required }: { required: boolean }
) {
  const noBa = cannibalNoBa?.trim() || null
  if (!noBa) {
    if (required) throw new Error(MISSING_CANNIBAL_LINK_MESSAGE)

    return null
  }

  const ba = await prisma.ba.findFirst({
    where: { noBa, deletedAt: null },
    include: { kanibals: { where: { deletedAt: null } } }
  })

  if (!ba) throw new Error('Cannibal BA not found')
  if (isBlockedCannibalLinkStatus(ba.statusBa)) {
    throw new Error('This cannibal BA cannot be used (expired or cancelled)')
  }

  if (!cannibalPairMatchesForecast(ba.kanibals, pair)) {
    throw new Error(
      'Cannibal BA must REMOVE the forecast unit and INSTALL the other unit for this component'
    )
  }

  return ba
}

export async function findCannibalInstallIdRep(
  cannibalNoBa: string,
  pair: CannibalLinkPair
): Promise<number | null> {
  const ba = await assertCannibalBaLink(cannibalNoBa, pair, { required: true })
  if (!ba) return null

  const expectedDesc = String(pair.compDesc ?? '').trim().toLowerCase()

  const install = ba.kanibals.find(line => {
    if (line.type !== 'INSTALL' || line.fleetUnitId !== pair.installFleetUnitId) return false
    if (!expectedDesc) return true

    return String(line.compDesc ?? '').trim().toLowerCase() === expectedDesc
  })

  return install?.idRep ?? null
}

export async function listCannibalLinkCandidates(
  _session: Session,
  pair: CannibalLinkPair,
  options: { search?: string | null; limit?: number } = {}
) {
  const limit = Math.min(50, Math.max(1, options.limit ?? 20))
  const search = options.search?.trim()

  const rows = await prisma.ba.findMany({
    where: {
      deletedAt: null,
      statusBa: { notIn: ['EXPIRED', 'CANCELLED', 'CANCEL'] },
      ...(search ? { noBa: { contains: search } } : {}),
      kanibals: {
        some: {
          deletedAt: null,
          type: 'REMOVE',
          fleetUnitId: pair.removeFleetUnitId
        }
      }
    },
    include: {
      kanibals: { where: { deletedAt: null } }
    },
    orderBy: { createdAt: 'desc' },
    take: 80
  })

  return rows
    .filter(row => cannibalPairMatchesForecast(row.kanibals, pair))
    .slice(0, limit)
    .map(row => ({
      noBa: row.noBa,
      idBa: row.idBa,
      statusBa: row.statusBa,
      projectCode: row.projectCode
    }))
}

export async function assertReturnOtherAssignment(input: {
  donorFleetUnitId: number
  sourceIdMod: number
  returnOtherFleetUnitId: number
  cannibalNoBa?: string | null
  compDesc?: string | null
  requireCannibal: boolean
}): Promise<OtherUnitTarget> {
  const target = await resolveOtherUnitTarget(
    input.sourceIdMod,
    input.donorFleetUnitId,
    input.returnOtherFleetUnitId
  )

  await assertCannibalBaLink(input.cannibalNoBa, {
    removeFleetUnitId: input.donorFleetUnitId,
    installFleetUnitId: target.fleetUnitId,
    compDesc: input.compDesc
  }, { required: input.requireCannibal })

  return target
}
