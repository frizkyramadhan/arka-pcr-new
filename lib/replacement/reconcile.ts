/**
 * Reopen / delete CLOSED replacement + recalculate replacement chain per component.
 */
import type { Prisma, Replacement } from '@prisma/client'
import type { Session } from 'next-auth'

import { calculateComponentLife } from '@/lib/calculations/life'
import { prisma } from '@/lib/prisma'
import { hasAnyPermission, isSuperUserOrAdmin } from '@/lib/utils/api-auth'
import { deleteStoredFile } from '@/lib/utils/file-storage'
import { toIsoDateOnly } from '@/lib/utils/date-only'

export function canManageClosedReplacement(session: Session): boolean {
  return isSuperUserOrAdmin(session)
}

/** Plant HO / admin — edit CLOSE WO in place (no reopen). */
export function canEditClosedReplacement(session: Session): boolean {
  return hasAnyPermission(session, ['system.admin', 'replacements.edit.close'])
}

export function assertCanEditClosedReplacement(session: Session) {
  if (!canEditClosedReplacement(session)) {
    throw new Error('You do not have permission to edit closed work orders')
  }
}

export function assertCanManageClosedReplacement(session: Session) {
  if (!canManageClosedReplacement(session)) {
    throw new Error('Only admin or super user can manage closed work orders')
  }
}

async function getComponentChain(
  fleetUnitId: number,
  idMod: number,
  tx: Prisma.TransactionClient = prisma
) {
  return tx.replacement.findMany({
    where: { fleetUnitId, idMod, deletedAt: null },
    orderBy: { idRep: 'asc' }
  })
}

/** OPEN row auto-created immediately after close (same last_rep_date as closed wo_end_date). */
export function findSpawnedOpenAfterClose(closed: Replacement, chain: Replacement[]): Replacement | null {
  const idx = chain.findIndex(row => row.idRep === closed.idRep)
  if (idx === -1 || idx >= chain.length - 1) return null

  const next = chain[idx + 1]
  if (next.woStatus !== 'OPEN') return null
  if (!closed.woEndDate || !next.lastRepDate) return null
  if (toIsoDateOnly(next.lastRepDate) !== toIsoDateOnly(closed.woEndDate)) return null

  return next
}

function findPreviousClose(chain: Replacement[], beforeIdRep: number): Replacement | null {
  let previous: Replacement | null = null
  for (const row of chain) {
    if (row.idRep >= beforeIdRep) break
    if (row.woStatus === 'CLOSE') previous = row
  }

  return previous
}

async function softDeleteReplacementInTx(tx: Prisma.TransactionClient, row: Replacement) {
  if (row.report) {
    deleteStoredFile(row.report)
  }

  await tx.replacement.update({
    where: { idRep: row.idRep },
    data: { deletedAt: new Date(), report: null }
  })
}

async function syncForecastOnReopen(replacementId: number) {
  const forecast = await prisma.pcrForecast.findUnique({ where: { idRep: replacementId } })
  if (!forecast || forecast.forecastStatus !== 'CLOSED') return

  await prisma.pcrForecast.update({
    where: { idForecast: forecast.idForecast },
    data: { forecastStatus: 'OPEN' }
  })
}

/** Recalculate frozen metrics on CLOSE rows; normalize OPEN rows for live calculation. */
export async function recalculateComponentChain(
  fleetUnitId: number,
  idMod: number,
  tx: Prisma.TransactionClient = prisma
) {
  const commod = await tx.commod.findUnique({ where: { idMod } })
  if (!commod) return

  const policy = commod.policy ?? 1
  const chain = await getComponentChain(fleetUnitId, idMod, tx)

  let previousClose: Replacement | null = null

  for (const row of chain) {
    if (row.woStatus === 'CLOSE') {
      const calc = calculateComponentLife({
        hmNow: Number(row.hmRep),
        hmLastReplacement: Number(row.lastHmRep ?? 0),
        compHour: row.compHour ?? 0,
        policy
      })

      await tx.replacement.update({
        where: { idRep: row.idRep },
        data: {
          compLife: calc.currentLife,
          lifePercent: Math.round(calc.lifePercent * 10) / 10,
          lifeCalculatedAt: new Date()
        }
      })

      previousClose = row
      continue
    }

    if (row.woStatus === 'OPEN') {
      const patch: Prisma.ReplacementUpdateInput = {
        compLife: 0,
        lifePercent: 0,
        lifeCalculatedAt: null,
        woEndDate: null
      }

      if (previousClose?.woEndDate) {
        const spawnedFromPrevious =
          row.lastRepDate && toIsoDateOnly(row.lastRepDate) === toIsoDateOnly(previousClose.woEndDate)

        if (spawnedFromPrevious) {
          // hm_rep tetap dinamis (hm_rep_manual) — jangan timpa dengan HM close
        } else {
          patch.lastRepDate = previousClose.woEndDate
          patch.lastHmRep = previousClose.hmRep
        }
      }

      await tx.replacement.update({
        where: { idRep: row.idRep },
        data: patch
      })
    }
  }
}

export async function reopenReplacement(session: Session, idRep: number) {
  assertCanManageClosedReplacement(session)

  const existing = await prisma.replacement.findFirst({
    where: { idRep, deletedAt: null }
  })

  if (!existing) return null
  if (existing.woStatus !== 'CLOSE') {
    throw new Error('Only CLOSED work orders can be reopened')
  }

  const chain = await getComponentChain(existing.fleetUnitId, existing.idMod)
  const idx = chain.findIndex(row => row.idRep === idRep)
  const nextAfter = idx >= 0 ? chain[idx + 1] : undefined

  if (nextAfter?.woStatus === 'CLOSE') {
    throw new Error('Cannot reopen: a newer closed work order exists')
  }

  const spawn = findSpawnedOpenAfterClose(existing, chain)

  if (nextAfter?.woStatus === 'OPEN' && !spawn) {
    throw new Error('Cannot reopen: another open work order exists for this component')
  }

  const restoredHmRep = spawn ? Number(spawn.lastHmRep ?? existing.hmRep) : Number(existing.hmRep)

  await prisma.$transaction(async tx => {
    if (spawn) {
      await softDeleteReplacementInTx(tx, spawn)
    }

    await tx.replacement.update({
      where: { idRep },
      data: {
        woStatus: 'OPEN',
        woEndDate: null,
        hmRep: restoredHmRep,
        hmRepManual: false,
        compLife: 0,
        lifePercent: 0,
        lifeCalculatedAt: null
      }
    })

    await recalculateComponentChain(existing.fleetUnitId, existing.idMod, tx)
  })

  await syncForecastOnReopen(idRep)

  return prisma.replacement.findUnique({
    where: { idRep },
    include: {
      commod: { include: { comp: true } },
      unit: true,
      forecast: { select: { idForecast: true, forecastStatus: true } }
    }
  })
}

export async function deleteClosedReplacement(session: Session, idRep: number) {
  assertCanManageClosedReplacement(session)

  const existing = await prisma.replacement.findFirst({
    where: { idRep, deletedAt: null }
  })

  if (!existing) return null
  if (existing.woStatus !== 'CLOSE') {
    throw new Error('Only CLOSED work orders can be deleted with this action')
  }

  const chain = await getComponentChain(existing.fleetUnitId, existing.idMod)
  const spawn = findSpawnedOpenAfterClose(existing, chain)
  const rowsAfter = chain.filter(row => row.idRep > idRep && row.idRep !== spawn?.idRep)

  if (rowsAfter.some(row => row.woStatus === 'CLOSE')) {
    throw new Error('Cannot delete: a newer closed work order exists')
  }

  await prisma.$transaction(async tx => {
    if (spawn) {
      await softDeleteReplacementInTx(tx, spawn)
    }

    await softDeleteReplacementInTx(tx, existing)

    const remaining = (await getComponentChain(existing.fleetUnitId, existing.idMod, tx)).filter(
      row => row.idRep > idRep
    )

    const previousClose = findPreviousClose(chain, idRep)

    for (const openRow of remaining) {
      if (openRow.woStatus !== 'OPEN') continue

      if (previousClose?.woEndDate) {
        await tx.replacement.update({
          where: { idRep: openRow.idRep },
          data: {
            lastRepDate: previousClose.woEndDate,
            lastHmRep: previousClose.hmRep
          }
        })
      }
    }

    await recalculateComponentChain(existing.fleetUnitId, existing.idMod, tx)
  })

  return { success: true }
}
