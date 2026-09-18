/**
 * Migrate FMS data from arka-fms MySQL into arka-pcr-new.
 *
 * Prerequisites: migrate deploy, fleet sync, DATABASE_URL + FMS_DATABASE_URL.
 * Usage: npm run migrate:import-fms
 */
import fs from 'fs'
import path from 'path'

import { PrismaClient } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { getUploadRoot } from '@/lib/utils/file-storage'

type Orphan = { kind: string; id: string; detail: string }

function fmsClient() {
  const fmsUrl = process.env.FMS_DATABASE_URL?.trim()
  if (!fmsUrl) throw new Error('Set FMS_DATABASE_URL (mysql://...) for source FMS database')

  return new PrismaClient({
    datasources: { db: { url: fmsUrl } },
    log: ['error']
  })
}

async function main() {
  const fms = fmsClient()
  const orphans: Orphan[] = []
  const report: Record<string, number> = {
    types: 0,
    plans: 0,
    actuals: 0,
    attachments: 0,
    filesCopied: 0,
    filesMissing: 0
  }

  try {
    const usersPcr = await prisma.user.findMany({ select: { idUser: true, username: true } })
    const usersFms = await fms.$queryRawUnsafe<{ id: string; username: string }[]>(
      'SELECT id, username FROM users'
    )
    const pcrByUsername = new Map(usersPcr.map(u => [u.username.toLowerCase(), u.idUser]))
    const admin =
      usersPcr.find(u => u.username.toLowerCase() === 'admin') ??
      (await prisma.user.findFirst({
        where: { userRoles: { some: { role: { name: 'administrator' } } } }
      }))
    const fallbackUserId = admin?.idUser
    if (!fallbackUserId) throw new Error('No administrator/fallback user in PCR')

    const fmsUserToPcr = new Map<string, number>()
    for (const fu of usersFms) {
      const mapped = pcrByUsername.get(fu.username.toLowerCase())
      if (mapped) fmsUserToPcr.set(fu.id, mapped)
      else {
        orphans.push({ kind: 'user', id: fu.id, detail: `username=${fu.username}` })
        fmsUserToPcr.set(fu.id, fallbackUserId)
      }
    }

    const types = await fms.$queryRawUnsafe<{ id: string; name: string; created_at: Date }[]>(
      'SELECT id, name, created_at FROM maintenance_types'
    )
    for (const t of types) {
      await prisma.maintenanceType.upsert({
        where: { id: t.id },
        create: { id: t.id, name: t.name, createdAt: t.created_at },
        update: { name: t.name }
      })
      report.types++
    }

    const plans = await fms.$queryRawUnsafe<
      {
        id: string
        project_id: string
        year: number
        month: number
        maintenance_type_id: string
        sum_plan: number
        created_by: string
        created_at: Date
        updated_at: Date
      }[]
    >(
      `SELECT id, project_id, year, month, maintenance_type_id, sum_plan, created_by, created_at, updated_at
       FROM maintenance_plans`
    )
    for (const p of plans) {
      const createdById = fmsUserToPcr.get(p.created_by) ?? fallbackUserId
      await prisma.maintenancePlan.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          projectId: p.project_id,
          year: p.year,
          month: p.month,
          maintenanceTypeId: p.maintenance_type_id,
          sumPlan: p.sum_plan,
          createdById,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        },
        update: {
          projectId: p.project_id,
          year: p.year,
          month: p.month,
          maintenanceTypeId: p.maintenance_type_id,
          sumPlan: p.sum_plan,
          createdById
        }
      })
      report.plans++
    }

    const actuals = await fms.$queryRawUnsafe<
      {
        id: string
        maintenance_plan_id: string
        unit_id: string
        maintenance_date: Date
        maintenance_time: string | null
        hour_meter: number
        remarks: string | null
        mechanics: string | null
        created_by: string
        created_at: Date
      }[]
    >(
      `SELECT id, maintenance_plan_id, unit_id, maintenance_date, maintenance_time, hour_meter, remarks, mechanics, created_by, created_at
       FROM maintenance_actuals`
    )
    for (const a of actuals) {
      const fleetUnitId = Number(a.unit_id)
      if (!Number.isFinite(fleetUnitId)) {
        orphans.push({ kind: 'actual-unit', id: a.id, detail: `unit_id=${a.unit_id}` })
        continue
      }
      const exists = await prisma.fleetUnitCache.findUnique({ where: { fleetUnitId } })
      if (!exists) {
        orphans.push({ kind: 'actual-unit-missing', id: a.id, detail: `fleetUnitId=${fleetUnitId}` })
        continue
      }
      const createdById = fmsUserToPcr.get(a.created_by) ?? fallbackUserId
      await prisma.maintenanceActual.upsert({
        where: { id: a.id },
        create: {
          id: a.id,
          maintenancePlanId: a.maintenance_plan_id,
          fleetUnitId,
          maintenanceDate: a.maintenance_date,
          maintenanceTime: a.maintenance_time,
          hourMeter: a.hour_meter,
          remarks: a.remarks,
          mechanics: a.mechanics,
          createdById,
          createdAt: a.created_at
        },
        update: {
          maintenancePlanId: a.maintenance_plan_id,
          fleetUnitId,
          maintenanceDate: a.maintenance_date,
          maintenanceTime: a.maintenance_time,
          hourMeter: a.hour_meter,
          remarks: a.remarks,
          mechanics: a.mechanics,
          createdById
        }
      })
      report.actuals++
    }

    const fmsUploads =
      process.env.FMS_UPLOADS_DIR ||
      path.join(process.cwd(), '..', 'arka-fms', 'public', 'uploads', 'attachments')
    const destRoot = path.join(getUploadRoot(), 'attachments')
    fs.mkdirSync(destRoot, { recursive: true })

    const attachments = await fms.$queryRawUnsafe<
      {
        id: string
        entity_type: 'MAINTENANCE_PLAN' | 'MAINTENANCE_ACTUAL'
        entity_id: string
        file_name: string
        file_type: string | null
        file_size: number | null
        storage_path: string
        uploaded_by: string
        uploaded_at: Date
      }[]
    >(
      `SELECT id, entity_type, entity_id, file_name, file_type, file_size, storage_path, uploaded_by, uploaded_at
       FROM attachments`
    )
    for (const att of attachments) {
      const uploadedById = fmsUserToPcr.get(att.uploaded_by) ?? fallbackUserId
      let storagePath = att.storage_path
      const fileName = path.basename(storagePath || att.file_name)
      const srcCandidates = [
        path.join(fmsUploads, fileName),
        storagePath.startsWith('/')
          ? path.join(process.cwd(), '..', 'arka-fms', 'public', ...storagePath.replace(/^\//, '').split('/'))
          : ''
      ].filter(Boolean)

      let copied = false
      for (const src of srcCandidates) {
        if (src && fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(destRoot, fileName))
          storagePath = `/uploads/attachments/${fileName}`
          copied = true
          report.filesCopied++
          break
        }
      }
      if (!copied) {
        report.filesMissing++
        orphans.push({ kind: 'attachment-file', id: att.id, detail: storagePath })
      }

      await prisma.attachment.upsert({
        where: { id: att.id },
        create: {
          id: att.id,
          entityType: att.entity_type,
          entityId: att.entity_id,
          fileName: att.file_name,
          fileType: att.file_type,
          fileSize: att.file_size,
          storagePath,
          uploadedById,
          uploadedAt: att.uploaded_at
        },
        update: {
          entityType: att.entity_type,
          entityId: att.entity_id,
          fileName: att.file_name,
          fileType: att.file_type,
          fileSize: att.file_size,
          storagePath,
          uploadedById
        }
      })
      report.attachments++
    }

    const outPath = path.join(process.cwd(), 'scripts', 'migration', 'fms-migrate-report.json')
    fs.writeFileSync(outPath, JSON.stringify({ report, orphans }, null, 2), 'utf8')
    console.log('Migration complete', report)
    console.log('Orphans:', orphans.length, '→', outPath)
  } finally {
    await fms.$disconnect()
    await prisma.$disconnect()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
