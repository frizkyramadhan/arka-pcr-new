/**
 * Maintenance Type — business logic for FMS parity CRUD.
 * Maps Prisma rows to JSON shapes expected by legacy MMS UI (allData, maintenanceTypes, mapItem).
 */
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export type MaintenanceTypeDto = {
  id: string
  name: string
  createdAt: string
}

function mapItem(m: { id: string; name: string; createdAt: Date }): MaintenanceTypeDto {
  return {
    id: m.id,
    name: m.name,
    createdAt: m.createdAt.toISOString()
  }
}

export type ListMaintenanceTypesQuery = {
  q?: string
}

export async function listMaintenanceTypes(query: ListMaintenanceTypesQuery) {
  const q = query.q?.trim() ?? ''
  const where: Prisma.MaintenanceTypeWhereInput = {}
  if (q) {
    where.name = { contains: q }
  }

  const [items, allData] = await Promise.all([
    prisma.maintenanceType.findMany({ where, orderBy: { name: 'asc' } }),
    prisma.maintenanceType.findMany({ orderBy: { name: 'asc' } })
  ])

  return {
    allData: allData.map(mapItem),
    maintenanceTypes: items.map(mapItem),
    total: items.length
  }
}

export async function getMaintenanceTypeById(id: string): Promise<MaintenanceTypeDto | null> {
  const item = await prisma.maintenanceType.findUnique({ where: { id } })
  if (!item) return null

  return mapItem(item)
}

export async function createMaintenanceType(name: string): Promise<
  | { ok: true; maintenanceType: MaintenanceTypeDto }
  | { ok: false; status: number; error: string }
> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { ok: false, status: 400, error: 'name is required' }
  }

  const existing = await prisma.maintenanceType.findFirst({ where: { name: trimmed } })
  if (existing) {
    return { ok: false, status: 409, error: 'Maintenance type with this name already exists' }
  }

  const created = await prisma.maintenanceType.create({ data: { name: trimmed } })

  return { ok: true, maintenanceType: mapItem(created) }
}

export async function updateMaintenanceType(
  id: string,
  body: { name?: string }
): Promise<{ ok: true; item: MaintenanceTypeDto } | { ok: false; status: number; error: string }> {
  const item = await prisma.maintenanceType.findUnique({ where: { id } })
  if (!item) {
    return { ok: false, status: 404, error: 'Maintenance type not found' }
  }

  const { name } = body
  if (name !== undefined) {
    if (!String(name).trim()) {
      return { ok: false, status: 400, error: 'name cannot be empty' }
    }

    const existing = await prisma.maintenanceType.findFirst({
      where: { name: name.trim(), id: { not: id } }
    })
    if (existing) {
      return { ok: false, status: 409, error: 'Another maintenance type with this name already exists' }
    }
  }

  const data: Prisma.MaintenanceTypeUpdateInput = {}
  if (name !== undefined) data.name = name.trim()

  const updated = await prisma.maintenanceType.update({ where: { id }, data })

  return { ok: true, item: mapItem(updated) }
}

export async function deleteMaintenanceType(
  id: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  try {
    await prisma.maintenanceType.delete({ where: { id } })

    return { ok: true }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2025') {
        return { ok: false, status: 404, error: 'Maintenance type not found' }
      }
      if (e.code === 'P2003') {
        return {
          ok: false,
          status: 409,
          error: 'Cannot delete: this type is used in maintenance plans or actuals. Remove usage first.'
        }
      }
    }
    throw e
  }
}
