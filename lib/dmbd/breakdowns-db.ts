/**
 * Database and SAP calls used when a breakdown is saved from the API.
 * SAP calls stay unused while local-only mode is on.
 * Kept out of the orchestration module so tests can pass fakes without opening MySQL.
 */
import { prisma } from '@/lib/prisma'
import { isOpenBdPositionEpisode, type BreakdownDeps } from '@/lib/dmbd/breakdowns'
import { getEquipmentById } from '@/lib/fleet-api/client'
import { listFailureComponents, listFailureDamages, listFailureSubComponents } from '@/lib/sap-b1/failure-codes'
import {
  BREAKDOWN_LOCATIONS,
  cancelServiceCall,
  createActivity,
  createServiceCall,
  deactivateActivity,
  findActivityMaster,
  findComponentName,
  findServiceCallSeries,
  listFailureCauses,
  listProjectPeople,
  listJobCategories,
  listJobCodes,
  patchActivity,
  patchServiceCall,
  serviceCallCardCode
} from '@/lib/dmbd/sap'

export const defaultBreakdownDeps: BreakdownDeps = {
  loadUnit: async fleetUnitId =>
    prisma.fleetUnitCache.findUnique({
      where: { fleetUnitId },
      select: { fleetUnitId: true, unitNo: true, projectCode: true, modelName: true }
    }),
  findOpenBdId: async fleetUnitId => {
    const rows = await prisma.breakdown.findMany({
      where: { fleetUnitId, finishedAt: null, cancelledAt: null },
      select: {
        id: true,
        activities: { select: { startedAt: true, createdAt: true, positionStatus: true } }
      }
    })
    const openBd = rows.find(row => isOpenBdPositionEpisode(row.activities))

    return openBd?.id ?? null
  },
  activityMaster: findActivityMaster,
  componentName: findComponentName,
  cardCode: serviceCallCardCode,
  seriesFor: findServiceCallSeries,

  // Sequential SAP reads — parallel Service Layer calls often time out on this host.
  woCatalog: async (componentCode, projectCode) => {
    const jobCategories = await listJobCategories()
    const jobCodes = await listJobCodes()
    const people = await listProjectPeople(projectCode ?? '')
    const components = await listFailureComponents()
    const damages = await listFailureDamages()
    const causes = await listFailureCauses()
    const subComponents = componentCode ? await listFailureSubComponents(componentCode) : []

    return {
      jobCategories,
      jobCodes,
      locations: BREAKDOWN_LOCATIONS,
      employees: [],
      users: people.users,
      operators: people.operators,
      mechanics: people.mechanics,
      components,
      damages,
      causes,
      subComponents
    }
  },

  // Live ARKFleet equipment. The MySQL unit cache does not store serial_no.
  unitSerial: async fleetUnitId => {
    try {
      const unit = await getEquipmentById(fleetUnitId)

      return unit?.serial_no?.trim() || null
    } catch {
      return null
    }
  },
  issueServiceCall: createServiceCall,
  issueActivity: createActivity,
  patchCall: patchServiceCall,
  cancelCall: cancelServiceCall,
  deactivate: deactivateActivity,
  saveNew: data => prisma.breakdown.create({ data, select: { id: true } }),
  nextRegisterNo: (projectCode, startedAt) =>
    import('@/lib/dmbd/register-no').then(mod => mod.nextBreakdownRegisterNo(prisma, projectCode, startedAt)),
  saveActivity: data => prisma.breakdownActivity.create({ data }).then(() => undefined),
  updateActivity: (id, data) => prisma.breakdownActivity.update({ where: { id }, data }).then(() => undefined),
  removeActivity: id => prisma.breakdownActivity.delete({ where: { id } }).then(() => undefined),
  patchActivity,
  loadBreakdown: id =>
    prisma.breakdown.findUnique({
      where: { id },
      include: { activities: { orderBy: { startedAt: 'asc' } } }
    }),
  markClosed: (id, resolution, finishedAt) =>
    prisma.breakdown
      .update({
        where: { id },
        data: { resolution, finishedAt, workOrderStatus: 'CLOSE' }
      })
      .then(() => undefined),
  saveHeader: (id, data) => prisma.breakdown.update({ where: { id }, data }).then(() => undefined),
  markCancelled: (id, cancelledAt) =>
    prisma.breakdown
      .update({
        where: { id },
        data: { cancelledAt, workOrderStatus: 'CANCEL' }
      })
      .then(() => undefined),
  removeBreakdown: id => prisma.breakdown.delete({ where: { id } }).then(() => undefined)
}
