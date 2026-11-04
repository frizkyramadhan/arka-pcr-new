/**
 * Pull a linked service call back over the breakdown.
 * Refresh WO runs this. Opening the breakdown does not. Saving the form still writes the other way.
 * Remark is left untouched. A closed call sets finish date, time, and resolution.
 */
import { prisma } from '@/lib/prisma'
import { listFailureSubComponents } from '@/lib/sap-b1/failure-codes'
import { sapB1AuthorizedJson } from '@/lib/sap-b1/session'
import { collapseRepeatedName } from '@/lib/dmbd/employee-label'
import { mapServiceCallInbound, type InboundNames } from '@/lib/dmbd/sap-inbound'
import { SERVICE_CALL_STATUS } from '@/lib/dmbd/payload'
import { findActivityMaster, findComponentName, listFailureCauses, lookupEmployeeNames } from '@/lib/dmbd/sap'

type Row = Record<string, unknown>

const CALL_SELECT = [
  'ServiceCallID',
  'DocNum',
  'Status',
  'Subject',
  'Description',
  'Resolution',
  'AssigneeCode',
  'ClosingDate',
  'U_MIS_HoursMeter',
  'U_MIS_JobCtg',
  'U_MIS_JobCode',
  'U_MIS_Location',
  'U_MIS_LastOpUse',
  'U_MIS_Mech1',
  'U_MIS_ComponentNo',
  'U_MIS_SubCompNo',
  'U_MIS_Damage',
  'U_MIS_FailCause',
  'U_U_MIS_Prepared',
  'U_MIS_SerialNo',
  'U_MIS_MalStartDt',
  'U_MIS_MalStartTm',
  'U_MIS_EndWkDt',
  'U_MIS_EndWkTm',
  'ServiceCallActivities'
].join(',')

const ACTIVITY_SELECT = [
  'ActivityCode',
  'Details',
  'StartDate',
  'StartTime',
  'EndDueDate',
  'EndTime',
  'U_MIS_ActCode',
  'U_U_MIS_StatPos',
  'U_MIS_Technician'
].join(',')

function text(value: unknown): string {
  return String(value ?? '').trim()
}

async function codeName(path: string): Promise<string | null> {
  try {
    const payload = await sapB1AuthorizedJson<{ value?: Row[] }>(path)
    const row = payload.value?.[0]
    if (!row) return null
    const name = text(row.U_MIS_DamageName || row.U_MIS_CauseNm || row.U_MIS_JobDesc || row.Name)

    return name || null
  } catch {
    return null
  }
}

async function assigneeName(userId: number): Promise<string | null> {
  try {
    const row = await sapB1AuthorizedJson<Row>(`/Users(${userId})?$select=InternalKey,UserCode,UserName`)
    const name = text(row.UserName)
    const code = text(row.UserCode)
    if (!code || code.toLowerCase() === 'b1i') return null

    return name ? `${name} · ${code}` : code
  } catch {
    return null
  }
}

async function loadNames(call: Row, activities: Row[]): Promise<InboundNames> {
  const operator = text(call.U_MIS_LastOpUse)
  const mechanic = text(call.U_MIS_Mech1)
  const people = await lookupEmployeeNames([operator, mechanic].filter(Boolean)).catch(() => new Map<string, string>())
  const componentCode = text(call.U_MIS_ComponentNo)
  const componentName = componentCode ? await findComponentName(componentCode).catch(() => null) : null
  const subs = componentCode ? await listFailureSubComponents(componentCode).catch(() => []) : []
  const subCode = text(call.U_MIS_SubCompNo)
  const damageCode = text(call.U_MIS_Damage)
  const causeCode = text(call.U_MIS_FailCause)
  const jobCode = text(call.U_MIS_JobCode)

  const damageName = damageCode
    ? await codeName(`/MIS_DAMAGE?$select=Code,Name,U_MIS_DamageName&$filter=Code eq '${damageCode.replace(/'/g, "''")}'&$top=1`)
    : null
  const causes = causeCode ? await listFailureCauses().catch(() => [] as Awaited<ReturnType<typeof listFailureCauses>>) : []

  const jobName = jobCode
    ? await codeName(
        `/MIS_JOBCODE?$select=U_MIS_JobCode,U_MIS_JobDesc&$filter=U_MIS_JobCode eq '${jobCode.replace(/'/g, "''")}'&$top=1`
      )
    : null
  const assignee = Number(call.AssigneeCode)
  const activityNames: Record<string, string> = {}
  for (const row of activities) {
    const code = text(row.U_MIS_ActCode)
    if (!code || activityNames[code]) continue
    const master = await findActivityMaster(code)
    if (master?.name) activityNames[code] = master.name
  }

  return {
    operatorName: operator ? collapseRepeatedName(people.get(operator)) : null,
    mechanicLeaderName: mechanic ? collapseRepeatedName(people.get(mechanic)) : null,
    componentName,
    subComponentName: subs.find(row => row.code === subCode)?.name ?? null,
    damageName,
    failureCauseName: causes.find(row => row.code === causeCode)?.name ?? null,
    jobCodeName: jobName,
    assigneeName: Number.isInteger(assignee) && assignee > 0 ? await assigneeName(assignee) : null,
    activityNames
  }
}

/** Copy the linked service call onto this breakdown. No service call, or a SAP error, leaves the row as it is. */
export async function syncBreakdownFromSap(breakdownId: string): Promise<void> {
  const row = await prisma.breakdown.findUnique({
    where: { id: breakdownId },
    include: { activities: true }
  })
  if (!row?.sapServiceCallId) return

  const call = await sapB1AuthorizedJson<Row>(`/ServiceCalls(${row.sapServiceCallId})?$select=${CALL_SELECT}`)
  const linked = Array.isArray(call.ServiceCallActivities) ? call.ServiceCallActivities : []
  const activities: Row[] = []
  for (const line of linked) {
    const code = Number((line as Row).ActivityCode)
    if (!Number.isInteger(code) || code <= 0) continue
    try {
      activities.push(await sapB1AuthorizedJson<Row>(`/Activities(${code})?$select=${ACTIVITY_SELECT}`))
    } catch {
      // A missing activity line does not block the header.
    }
  }

  const names = await loadNames(call, activities)
  const inbound = mapServiceCallInbound(call, activities, names)
  const header = inbound.header
  const status = Number(call.Status)
  if (header.finishedAt && header.finishedAt < row.startedAt) {
    header.finishedAt = null
    header.resolution = null
    header.workOrderStatus = 'OPEN'
  }
  if (header.startedAt && header.finishedAt && header.startedAt > header.finishedAt) {
    delete header.startedAt
  }

  // A cancelled call does not reopen or close the local row.
  if (status === SERVICE_CALL_STATUS.cancel) {
    header.finishedAt = row.finishedAt
    header.resolution = row.resolution
    header.workOrderStatus = row.finishedAt ? 'CLOSE' : 'OPEN'
  }
  if (header.workOrderStatus === 'CLOSE' && !header.finishedAt) {
    header.finishedAt = row.finishedAt
    header.resolution = row.resolution
    header.workOrderStatus = row.finishedAt ? 'CLOSE' : 'OPEN'
  }
  if (!header.finishedAt && header.workOrderStatus === 'OPEN' && row.finishedAt) {
    const otherOpen = await prisma.breakdown.findFirst({
      where: { fleetUnitId: row.fleetUnitId, finishedAt: null, cancelledAt: null, id: { not: row.id } },
      select: { id: true }
    })
    if (otherOpen) {
      header.finishedAt = row.finishedAt
      header.resolution = row.resolution
      header.workOrderStatus = 'CLOSE'
    }
  }

  await prisma.breakdown.update({
    where: { id: row.id },
    data: header
  })

  for (const activity of inbound.activities) {
    const existing = row.activities.find(item => item.sapActivityCode === activity.sapActivityCode)
    if (existing) {
      await prisma.breakdownActivity.update({
        where: { id: existing.id },
        data: {
          breakdownCode: activity.breakdownCode,
          breakdownCodeName: activity.breakdownCodeName,
          positionStatus: activity.positionStatus,
          startedAt: activity.startedAt,
          endedAt: activity.endedAt,
          ...(activity.details ? { details: activity.details } : {}),
          technicianName: activity.technicianName
        }
      })
      continue
    }

    await prisma.breakdownActivity.create({
      data: {
        breakdown: { connect: { id: row.id } },
        sapActivityCode: activity.sapActivityCode,
        activityCategory: 'WO',
        breakdownCode: activity.breakdownCode,
        breakdownCodeName: activity.breakdownCodeName,
        positionStatus: activity.positionStatus,
        startedAt: activity.startedAt,
        endedAt: activity.endedAt,
        details: activity.details || row.problem,
        technicianName: activity.technicianName,
        createdBy: { connect: { idUser: row.createdById } }
      }
    })
  }
}
