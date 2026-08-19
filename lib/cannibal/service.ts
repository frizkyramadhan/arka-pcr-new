import type { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'

import {
  canApproveAtBaLevel,
  canRejectAtBaLevel,
  canRevokeBaApproval,
  getActionableLevels,
  getCannibalApprovalLabel,
  getPendingLevelForBa,
  isBaFullyApproved
} from '@/lib/cannibal/approval-workflow'
import {
  notifyApprovalDecisionAsync,
  notifyApprovalPendingAsync,
  notifyCannibalHandoffAsync,
  notifyFullyApprovedAsync
} from '@/lib/notifications'
import { logActivity } from '@/lib/activity-log'
import {
  hasLegacyCannibalApprovalSeedRoleFromSession,
  isLegacyOpenUnapprovedBa
} from '@/lib/cannibal/legacy-approval'
import { canManageCannibalLogisticStatement } from '@/lib/cannibal/logistic-access'
import { nextLegacyBaNumber } from '@/lib/cannibal/ba-number'
import {
  flattenPairsToLines,
  groupLinesToPairs,
  type KanibalLineWithPair,
  validateKanibalPairs
} from '@/lib/cannibal/pair-helpers'
import type { BaApprovalLevel } from '@/lib/cannibal/types'
import { BA_APPROVAL_LEVELS, BA_APPROVAL_DOCUMENT_CANNIBAL, EDITABLE_BA_STATUSES, LEGACY_BA_APPROVAL_LEVELS, SUBMITTABLE_BA_STATUSES, type BaStatus } from '@/lib/cannibal/types'
import { buildPlanPeriodMonthWhere } from '@/lib/forecasts/plan-period-filter'
import { ensureEquipmentCache } from '@/lib/hour-meter/service'
import { prisma } from '@/lib/prisma'
import type { CannibalCreateInput, CannibalExecutionUpdateInput, CannibalLogisticUpdateInput, CannibalPlanningUpdateInput, CannibalPlantStatementInput, CannibalPlantUpdateInput, KanibalLineInput } from '@/lib/validations/cannibal'
import { hasPermission } from '@/lib/utils/api-auth'
import { canAccessProject, getPrismaProjectFilter, resolveProjectFilter } from '@/lib/utils/project-scope'
import { paginatedFindMany, parseListPagination, type ListPaginationInput } from '@/lib/utils/list-pagination'
import { sortPlanningActions } from '@/lib/cannibal/planning-lookups'
import { canBackfillLogisticStatement, canBackfillPlantStatement, isMissingLogisticStatement, isMissingPlantStatement } from '@/lib/cannibal/legacy-statement'
import {
  hasRequiredProcurementDocs,
  isExecutionComplete,
  isLogisticSectionComplete,
  isPlantSectionComplete
} from '@/lib/cannibal/workflow'

export type CannibalListFilters = {
  projectCode?: string | null
  statusBa?: string | null
  search?: string | null
  noBa?: string | null
  postingDateFrom?: string | null
  postingDateTo?: string | null
  /** Month filter YYYY-MM or YYYY-MM-DD — matches postingDate within that month. */
  postingDate?: string | null
  fleetUnitId?: number | null
  removedUnitNo?: string | null
  installedUnitNo?: string | null
  pn?: string | null
  component?: string | null
  logisticStatement?: 'confirmed' | 'pending' | 'not_started' | null
  approvalLevel?: BaApprovalLevel | null
}

const userSummarySelect = { idUser: true, username: true, fullName: true } as const

/** Shared list include — enough for operational grid + report summary. */
const baListKanibalSelect = {
  idKanibal: true,
  type: true,
  fleetUnitId: true,
  unitNo: true,
  pairIndex: true,
  pn: true,
  sn: true,
  pos: true,
  compDesc: true,
  date: true,
  hmComp: true,
  woNoKanibal: true,
  woStatusKanibal: true,
  unit: { select: { modelName: true } }
} as const

const baListInclude = {
  kanibals: {
    where: { deletedAt: null },
    select: baListKanibalSelect,
    orderBy: [{ pairIndex: 'asc' as const }, { type: 'asc' as const }, { idKanibal: 'asc' as const }]
  },
  approvals: { orderBy: { level: 'asc' as const } },
  baAction: true,
  statementConfirmer: { select: userSummarySelect }
} satisfies Prisma.BaInclude

const baInclude = {
  kanibals: {
    where: { deletedAt: null },
    include: { unit: true, replacement: true },
    orderBy: [{ pairIndex: 'asc' as const }, { type: 'asc' as const }, { idKanibal: 'asc' as const }]
  },
  approvals: { orderBy: { level: 'asc' as const }, include: { user: { select: userSummarySelect } } },
  baCaused: true,
  baAction: true,
  baComponentStatus: true,
  creator: { select: userSummarySelect },
  statementRequester: { select: userSummarySelect },
  statementConfirmer: { select: userSummarySelect },
  plantSubmitter: { select: userSummarySelect }
} satisfies Prisma.BaInclude

function buildPlantJustificationData(input: Partial<CannibalCreateInput>) {
  return {
    plantP1UnitRfu: input.plantP1UnitRfu ?? false,
    plantProductionReq: input.plantProductionReq ?? false,
    plantOther: input.plantOther ?? false,
    plantOtherText: input.plantOtherText ?? ''
  }
}

function buildLogisticJustificationData(input: Partial<CannibalLogisticUpdateInput>) {
  const logisticLeadTime = input.logisticLeadTime ?? false

  return {
    logisticNoStock: input.logisticNoStock ?? false,
    logisticLeadTime,
    logisticLeadTimeDays: logisticLeadTime ? input.logisticLeadTimeDays ?? null : null,
    logisticOther: input.logisticOther ?? false,
    logisticOtherText: input.logisticOtherText ?? ''
  }
}

function buildJustificationData(input: Partial<CannibalCreateInput>) {
  return {
    ...buildPlantJustificationData(input),
    ...buildLogisticJustificationData(input)
  }
}

function resolveInputLines(input: { pairs?: CannibalCreateInput['pairs']; lines?: KanibalLineInput[] }): KanibalLineWithPair[] {
  if (input.pairs?.length) {
    const pairError = validateKanibalPairs(input.pairs)
    if (pairError) throw new Error(pairError)
    return flattenPairsToLines(input.pairs)
  }

  if (input.lines?.length) {
    return input.lines.map((line, index) => ({
      ...line,
      pairIndex: line.pairIndex ?? Math.floor(index / 2)
    }))
  }

  return []
}

export function mapCannibalRecord<T extends Record<string, unknown>>(record: T) {
  const kanibals = (record.kanibals as KanibalLineInput[] | undefined) ?? []
  return {
    ...record,
    pairs: groupLinesToPairs(kanibals)
  }
}

function primaryUnitNoFromCannibal(record: {
  pairs?: Array<{ remove?: { unitNo?: string | null }; install?: { unitNo?: string | null } }>
  kanibals?: Array<{ unitNo?: string | null }>
}): string | null {
  const fromPair = record.pairs?.[0]?.remove?.unitNo ?? record.pairs?.[0]?.install?.unitNo
  if (fromPair) return fromPair

  return record.kanibals?.[0]?.unitNo ?? null
}

function levelsBeforeApproval(level: BaApprovalLevel): BaApprovalLevel[] {
  const index = BA_APPROVAL_LEVELS.indexOf(level)
  if (index <= 0) return []

  return BA_APPROVAL_LEVELS.slice(0, index) as BaApprovalLevel[]
}

function buildListWhere(session: Session, filters: CannibalListFilters): Prisma.BaWhereInput {
  const where: Prisma.BaWhereInput = {
    deletedAt: null,
    ...resolveProjectFilter(session, filters.projectCode ?? null)
  }

  const andFilters: Prisma.BaWhereInput[] = []

  if (filters.statusBa) where.statusBa = filters.statusBa

  if (filters.noBa) {
    where.noBa = { contains: filters.noBa }
  }

  if (filters.postingDate) {
    const monthWhere = buildPlanPeriodMonthWhere(filters.postingDate)
    if (monthWhere) where.postingDate = monthWhere
  } else if (filters.postingDateFrom || filters.postingDateTo) {
    where.postingDate = {
      ...(filters.postingDateFrom ? { gte: new Date(filters.postingDateFrom) } : {}),
      ...(filters.postingDateTo ? { lte: new Date(filters.postingDateTo) } : {})
    }
  }

  if (filters.fleetUnitId) {
    andFilters.push({
      kanibals: {
        some: {
          deletedAt: null,
          fleetUnitId: filters.fleetUnitId
        }
      }
    })
  }

  if (filters.removedUnitNo) {
    andFilters.push({
      kanibals: {
        some: {
          deletedAt: null,
          type: 'REMOVE',
          unitNo: { contains: filters.removedUnitNo }
        }
      }
    })
  }

  if (filters.installedUnitNo) {
    andFilters.push({
      kanibals: {
        some: {
          deletedAt: null,
          type: 'INSTALL',
          unitNo: { contains: filters.installedUnitNo }
        }
      }
    })
  }

  if (filters.pn) {
    andFilters.push({
      kanibals: {
        some: {
          deletedAt: null,
          pn: { contains: filters.pn }
        }
      }
    })
  }

  if (filters.component) {
    andFilters.push({
      kanibals: {
        some: {
          deletedAt: null,
          compDesc: { contains: filters.component }
        }
      }
    })
  }

  if (filters.logisticStatement === 'confirmed') {
    andFilters.push({ statementConfirmedBy: { not: null } })
  } else if (filters.logisticStatement === 'pending') {
    andFilters.push({
      statusBa: 'PENDING_LOGISTICS',
      statementConfirmedBy: null
    })
  } else if (filters.logisticStatement === 'not_started') {
    andFilters.push({
      statementConfirmedBy: null,
      NOT: { statusBa: 'PENDING_LOGISTICS' }
    })
  }

  if (filters.approvalLevel) {
    andFilters.push({ statusBa: { in: ['SUBMITTED', 'OPEN'] } })
    andFilters.push({
      approvals: {
        some: {
          level: filters.approvalLevel,
          status: 'PENDING'
        }
      }
    })

    for (const priorLevel of levelsBeforeApproval(filters.approvalLevel)) {
      andFilters.push({
        approvals: {
          some: {
            level: priorLevel,
            status: 'APPROVED'
          }
        }
      })
    }
  }

  if (filters.search) {
    andFilters.push({
      OR: [
        { noBa: { contains: filters.search } },
        { projectCode: { contains: filters.search } },
        { symptom: { contains: filters.search } },
        { failure: { contains: filters.search } },
        { mrNo: { contains: filters.search } },
        { prNo: { contains: filters.search } },
        { poNo: { contains: filters.search } },
        {
          kanibals: {
            some: {
              deletedAt: null,
              OR: [
                { unitNo: { contains: filters.search } },
                { compDesc: { contains: filters.search } },
                { pn: { contains: filters.search } },
                { unit: { modelName: { contains: filters.search } } }
              ]
            }
          }
        }
      ]
    })
  }

  if (andFilters.length) {
    where.AND = andFilters
  }

  return where
}

async function syncKanibalLines(noBa: string, lines: KanibalLineWithPair[], session: Session) {
  await prisma.kanibal.updateMany({
    where: { noBa, deletedAt: null },
    data: { deletedAt: new Date() }
  })

  for (const line of lines) {
    const equipment = await ensureEquipmentCache(line.fleetUnitId, session)

    await prisma.kanibal.create({
      data: {
        noBa,
        fleetUnitId: equipment.fleetUnitId,
        date: line.date,
        compDesc: line.compDesc,
        pn: line.pn ?? '',
        sn: line.sn ?? '',
        pos: line.pos ?? '',
        hmComp: line.hmComp ?? 0,
        idRep: line.idRep ?? null,
        woNoKanibal: line.woNoKanibal ?? null,
        woStatusKanibal: line.woStatusKanibal ?? 'OPEN',
        type: line.type,
        pairIndex: line.pairIndex,
        unitNo: equipment.unitNo
      }
    })
  }
}

function buildPlantStatementSignature(
  data: {
    symptom?: string
    failure?: string
    plantP1UnitRfu?: boolean
    plantProductionReq?: boolean
    plantOther?: boolean
    plantOtherText?: string
  },
  userId?: number
) {
  if (!userId || !isPlantSectionComplete(data)) return {}

  const now = new Date()

  return {
    statementRequestedBy: userId,
    statementRequestedAt: now
  }
}

function buildLogisticStatementSignature(
  data: {
    logisticNoStock?: boolean
    logisticLeadTime?: boolean
    logisticLeadTimeDays?: number | null
    logisticOther?: boolean
    logisticOtherText?: string
  },
  userId?: number
) {
  if (!userId || !isLogisticSectionComplete(data)) {
    return {
      statementConfirmedBy: null,
      statementConfirmedAt: null
    }
  }

  const now = new Date()

  return {
    statementConfirmedBy: userId,
    statementConfirmedAt: now
  }
}

async function seedApprovalRecords(idBa: number) {
  await prisma.baApproval.deleteMany({
    where: {
      idBa,
      level: { in: [...LEGACY_BA_APPROVAL_LEVELS] }
    }
  })

  for (const level of BA_APPROVAL_LEVELS) {
    await prisma.baApproval.upsert({
      where: { idBa_level: { idBa, level } },
      create: { idBa, level, status: 'PENDING', documentType: BA_APPROVAL_DOCUMENT_CANNIBAL },
      update: { status: 'PENDING', approvedBy: null, approvedAt: null, remark: null, documentType: BA_APPROVAL_DOCUMENT_CANNIBAL }
    })
  }
}

type CannibalRecordForSubmit = {
  idBa: number
  statusBa: string
  statementConfirmedBy?: number | null
  symptom?: string
  failure?: string
  plantP1UnitRfu?: boolean
  plantProductionReq?: boolean
  plantOther?: boolean
  plantOtherText?: string
  logisticNoStock?: boolean
  logisticLeadTime?: boolean
  logisticLeadTimeDays?: number | null
  logisticOther?: boolean
  logisticOtherText?: string
  mrNo?: string | null
  prNo?: string | null
  documentationComplete?: boolean
  executionNotes?: string | null
  kanibals?: KanibalLineInput[]
  pairs?: Array<{ remove?: { woNoKanibal?: string | null }; install?: { woNoKanibal?: string | null } }>
}

/** Move BA to approval after logistics + record/documentation (MR/PR + WO) are complete. */
async function promoteCannibalToApproval(idBa: number, existing: CannibalRecordForSubmit) {
  if (!SUBMITTABLE_BA_STATUSES.includes(existing.statusBa as (typeof SUBMITTABLE_BA_STATUSES)[number])) {
    throw new Error('BA cannot be submitted in current status')
  }

  if (!isPlantSectionComplete(existing) || !isLogisticSectionComplete(existing)) {
    throw new Error('Plant and Logistic statements are required')
  }

  if (!existing.statementConfirmedBy) {
    throw new Error('Logistic confirmation is required before submit')
  }

  if (!hasRequiredProcurementDocs(existing)) {
    throw new Error('MR# and PR# are required before submitting for approval')
  }

  const kanibals = existing.kanibals ?? []
  if (kanibals.length === 0) {
    throw new Error('BA must have at least one kanibal line')
  }

  const pairs = existing.pairs?.length ? existing.pairs : groupLinesToPairs(kanibals)
  const pairError = validateKanibalPairs(pairs as Parameters<typeof validateKanibalPairs>[0])
  if (pairError) throw new Error(pairError)

  if (!isExecutionComplete({
    documentationComplete: existing.documentationComplete,
    executionNotes: existing.executionNotes,
    pairs
  })) {
    throw new Error('WO numbers, execution notes, and documentation completion are required before approval')
  }

  await seedApprovalRecords(idBa)

  const updated = await prisma.ba.update({
    where: { idBa },
    data: { statusBa: 'SUBMITTED' },
    include: baInclude
  })

  const mapped = mapCannibalRecord(updated as Record<string, unknown>)
  notifyApprovalPendingAsync({
    kind: 'CANNIBAL',
    documentId: idBa,
    documentNo: String(mapped.noBa ?? idBa),
    level: 'PS',
    unitNo: primaryUnitNoFromCannibal(mapped),
    projectCode: typeof mapped.projectCode === 'string' ? mapped.projectCode : null,
    actorName: null
  })

  return mapped
}

export async function listCannibalRecords(session: Session, filters: CannibalListFilters = {}) {
  const rows = await prisma.ba.findMany({
    where: buildListWhere(session, filters),
    include: baListInclude,
    orderBy: [{ postingDate: 'desc' }, { idBa: 'desc' }]
  })

  return rows.map(row => mapCannibalRecord(row))
}

export async function listCannibalRecordsPaginated(
  session: Session,
  filters: CannibalListFilters = {},
  query: ListPaginationInput
) {
  const where = buildListWhere(session, filters)
  const orderBy = buildBaApprovalQueueOrderBy(query.sortField, query.sortOrder)

  const { total, rows } = await paginatedFindMany({
    count: () => prisma.ba.count({ where }),
    findMany: ({ skip, take, orderBy: order }) =>
      prisma.ba.findMany({
        where,
        include: baListInclude,
        orderBy: order as Prisma.BaOrderByWithRelationInput[],
        skip,
        take
      }),
    pagination: query,
    orderBy
  })

  return { total, rows: rows.map(row => mapCannibalRecord(row as Record<string, unknown>)) }
}

export async function getCannibalById(session: Session, idBa: number) {
  const row = await prisma.ba.findFirst({
    where: {
      idBa,
      deletedAt: null,
      ...getPrismaProjectFilter(session)
    },
    include: baInclude
  })

  return row ? mapCannibalRecord(row) : null
}

export async function createCannibalRecord(session: Session, input: CannibalCreateInput, createdBy?: number) {
  if (!hasPermission(session, 'cannibals.create')) {
    throw new Error('Forbidden')
  }

  if (!canAccessProject(session, input.projectCode)) {
    throw new Error('Project code is outside your scope')
  }

  const lines = resolveInputLines(input)
  if (lines.length === 0) {
    throw new Error('At least one REMOVE/INSTALL pair is required')
  }

  const userId = createdBy ?? (Number(session.user.id) || undefined)
  const plantData = buildPlantJustificationData(input)
  const plantStatementSignature = buildPlantStatementSignature(
    { symptom: input.symptom, failure: input.failure, ...plantData },
    userId
  )
  const defaultActionId = await resolveDefaultActionId()
  const postingYear = new Date(input.postingDate).getFullYear()

  const mapped = await prisma.$transaction(async tx => {
    const noBa = await nextLegacyBaNumber(input.projectCode, tx, postingYear)

    const ba = await tx.ba.create({
      data: {
        noBa,
        projectCode: input.projectCode,
        postingDate: input.postingDate,
        symptom: input.symptom,
        failure: input.failure,
        idCaused: input.idCaused,
        causedOther: input.causedOther ?? '',
        idStatus: input.idStatus,
        statusOther: input.statusOther ?? '',
        idAction: defaultActionId,
        mrNo: null,
        prNo: null,
        poNo: null,
        statusBa: 'DRAFT',
        createdBy: userId ?? null,
        ...plantData,
        ...plantStatementSignature,
        logisticNoStock: false,
        logisticLeadTime: false,
        logisticOther: false,
        logisticOtherText: ''
      }
    })

    for (const line of lines) {
      const equipment = await ensureEquipmentCache(line.fleetUnitId, session)

      await tx.kanibal.create({
        data: {
          noBa,
          fleetUnitId: equipment.fleetUnitId,
          date: line.date,
          compDesc: line.compDesc,
          pn: line.pn ?? '',
          sn: line.sn ?? '',
          pos: line.pos ?? '',
          hmComp: line.hmComp ?? 0,
          idRep: line.idRep ?? null,
          woNoKanibal: line.woNoKanibal ?? null,
          woStatusKanibal: line.woStatusKanibal ?? 'OPEN',
          type: line.type,
          pairIndex: line.pairIndex,
          unitNo: equipment.unitNo
        }
      })
    }

    const created = await tx.ba.findUniqueOrThrow({ where: { idBa: ba.idBa }, include: baInclude })
    return mapCannibalRecord(created)
  })

  logActivity({
    session,
    logName: 'cannibals',
    event: 'created',
    description: `created cannibal BA ${mapped.noBa}`,
    subjectType: 'Ba',
    subjectId: mapped.idBa,
    properties: { noBa: mapped.noBa, projectCode: mapped.projectCode }
  })

  return mapped
}

export async function updateCannibalRecord(session: Session, idBa: number, input: CannibalPlantUpdateInput) {
  if (!hasPermission(session, 'cannibals.update')) {
    throw new Error('Forbidden')
  }

  const existing = await getCannibalById(session, idBa)
  if (!existing) return null

  if (!EDITABLE_BA_STATUSES.includes(existing.statusBa as (typeof EDITABLE_BA_STATUSES)[number])) {
    throw new Error('Only draft or rejected BA can be edited')
  }

  const userId = Number(session.user.id) || undefined
  const mergedPlant = buildPlantJustificationData({
    plantP1UnitRfu: input.plantP1UnitRfu ?? existing.plantP1UnitRfu,
    plantProductionReq: input.plantProductionReq ?? existing.plantProductionReq,
    plantOther: input.plantOther ?? existing.plantOther,
    plantOtherText: input.plantOtherText ?? existing.plantOtherText
  })

  const plantKeys = ['plantP1UnitRfu', 'plantProductionReq', 'plantOther', 'plantOtherText'] as const
  const headerKeys = [
    'projectCode',
    'postingDate',
    'symptom',
    'failure',
    'idCaused',
    'causedOther',
    'idStatus',
    'statusOther',
    'idAction',
    'mrNo',
    'prNo',
    'poNo'
  ] as const

  const plantDataChanged =
    plantKeys.some(key => input[key] !== undefined && input[key] !== existing[key]) ||
    headerKeys.some(key => input[key] !== undefined && input[key] !== existing[key]) ||
    Boolean(input.pairs || input.lines)

  const mergedForSignature = {
    symptom: input.symptom ?? (existing.symptom as string | undefined),
    failure: input.failure ?? (existing.failure as string | undefined),
    ...mergedPlant
  }
  const plantStatementSignature = buildPlantStatementSignature(mergedForSignature, userId)

  const mapped = await prisma.$transaction(async tx => {
    await tx.ba.update({
      where: { idBa },
      data: {
        projectCode: input.projectCode,
        postingDate: input.postingDate,
        symptom: input.symptom,
        failure: input.failure,
        idCaused: input.idCaused,
        causedOther: input.causedOther,
        idStatus: input.idStatus,
        statusOther: input.statusOther,
        idAction: input.idAction,
        mrNo: input.mrNo,
        prNo: input.prNo,
        poNo: input.poNo,
        ...mergedPlant,
        ...plantStatementSignature,
        ...(plantDataChanged
          ? {
              plantSubmittedBy: null,
              plantSubmittedAt: null,
              statementConfirmedBy: null,
              statementConfirmedAt: null
            }
          : {})
      }
    })

    if (input.pairs || input.lines) {
      const lines = resolveInputLines(input as CannibalCreateInput)
      if (lines.length === 0) throw new Error('At least one REMOVE/INSTALL pair is required')
      await syncKanibalLines(existing.noBa, lines, session)
    }

    const updated = await tx.ba.findUniqueOrThrow({ where: { idBa }, include: baInclude })
    return mapCannibalRecord(updated)
  })

  logActivity({
    session,
    logName: 'cannibals',
    event: 'updated',
    description: `updated cannibal plant ${mapped.noBa}`,
    subjectType: 'Ba',
    subjectId: idBa,
    properties: { noBa: mapped.noBa, projectCode: mapped.projectCode, section: 'plant' }
  })

  return mapped
}

export async function submitCannibalToLogistics(session: Session, idBa: number) {
  if (!hasPermission(session, 'cannibals.update')) {
    throw new Error('Forbidden')
  }

  const existing = await getCannibalById(session, idBa)
  if (!existing) return null

  if (!EDITABLE_BA_STATUSES.includes(existing.statusBa as (typeof EDITABLE_BA_STATUSES)[number])) {
    throw new Error('Only draft or rejected BA can be sent to logistics')
  }

  if (!isPlantSectionComplete(existing)) {
    throw new Error('Plant section must be complete before sending to logistics')
  }

  const pairs = groupLinesToPairs(existing.kanibals as KanibalLineInput[])
  const pairError = validateKanibalPairs(pairs)
  if (pairError) throw new Error(pairError)

  const userId = Number(session.user.id)
  const now = new Date()

  const updated = await prisma.ba.update({
    where: { idBa },
    data: {
      statusBa: 'PENDING_LOGISTICS',
      plantSubmittedBy: userId,
      plantSubmittedAt: now,
      statementRequestedBy: userId,
      statementRequestedAt: now,
      statementConfirmedBy: null,
      statementConfirmedAt: null
    },
    include: baInclude
  })

  const mapped = mapCannibalRecord(updated)
  notifyCannibalHandoffAsync({
    idBa,
    documentNo: String(mapped.noBa ?? idBa),
    handoff: 'TO_LOGISTICS',
    unitNo: primaryUnitNoFromCannibal(mapped),
    projectCode: typeof mapped.projectCode === 'string' ? mapped.projectCode : null,
    actorName: session.user?.name ?? session.user?.email ?? null
  })

  logActivity({
    session,
    logName: 'cannibals',
    event: 'updated',
    description: `handed off cannibal BA ${mapped.noBa} to logistics`,
    subjectType: 'Ba',
    subjectId: idBa,
    properties: {
      noBa: mapped.noBa,
      projectCode: mapped.projectCode,
      handoff: 'TO_LOGISTICS',
      statusBa: mapped.statusBa
    }
  })

  return mapped
}

export async function updateCannibalLogisticStatement(session: Session, idBa: number, input: CannibalLogisticUpdateInput) {
  const permissions = session.user?.permissions ?? []
  const roles = session.user?.roles ?? []

  if (!canManageCannibalLogisticStatement(permissions, roles)) {
    throw new Error('Forbidden')
  }

  const existing = await getCannibalById(session, idBa)
  if (!existing) return null

  const isLegacyBackfill = canBackfillLogisticStatement(existing.statusBa as BaStatus) && isMissingLogisticStatement(existing)

  if (existing.statusBa !== 'PENDING_LOGISTICS' && !isLegacyBackfill) {
    throw new Error('Logistic statement can only be updated while BA is pending logistics')
  }

  const logisticData = buildLogisticJustificationData(input)
  const mergedLogistic = {
    logisticNoStock: input.logisticNoStock ?? existing.logisticNoStock,
    logisticLeadTime: input.logisticLeadTime ?? existing.logisticLeadTime,
    logisticLeadTimeDays: input.logisticLeadTimeDays ?? existing.logisticLeadTimeDays,
    logisticOther: input.logisticOther ?? existing.logisticOther,
    logisticOtherText: input.logisticOtherText ?? existing.logisticOtherText
  }
  const userId = Number(session.user.id) || undefined
  const logisticStatementSignature = buildLogisticStatementSignature(mergedLogistic, userId)

  const moveToDocument =
    !isLegacyBackfill && Boolean(logisticStatementSignature.statementConfirmedBy)

  const updated = await prisma.ba.update({
    where: { idBa },
    data: {
      ...logisticData,
      ...logisticStatementSignature,
      ...(moveToDocument ? { statusBa: 'PENDING_DOCUMENT' } : {})
    },
    include: baInclude
  })

  const mapped = mapCannibalRecord(updated as Record<string, unknown>)
  logActivity({
    session,
    logName: 'cannibals',
    event: 'updated',
    description: `updated cannibal logistic ${mapped.noBa}`,
    subjectType: 'Ba',
    subjectId: idBa,
    properties: {
      noBa: mapped.noBa,
      projectCode: mapped.projectCode,
      section: 'logistic',
      statusBa: mapped.statusBa
    }
  })

  return mapped
}

export async function backfillCannibalPlantSection(session: Session, idBa: number, input: CannibalPlantUpdateInput) {
  if (!hasPermission(session, 'cannibals.update')) {
    throw new Error('Forbidden')
  }

  const existing = await getCannibalById(session, idBa)
  if (!existing) return null

  if (!canBackfillPlantStatement(existing.statusBa as BaStatus)) {
    throw new Error('Plant section can only be backfilled on legacy records')
  }

  if (!isMissingPlantStatement(existing)) {
    throw new Error('Plant statement already exists')
  }

  const userId = Number(session.user.id) || undefined
  const mergedPlant = buildPlantJustificationData({
    plantP1UnitRfu: input.plantP1UnitRfu ?? existing.plantP1UnitRfu,
    plantProductionReq: input.plantProductionReq ?? existing.plantProductionReq,
    plantOther: input.plantOther ?? existing.plantOther,
    plantOtherText: input.plantOtherText ?? existing.plantOtherText
  })

  const mergedForSignature = {
    symptom: input.symptom ?? (existing.symptom as string | undefined),
    failure: input.failure ?? (existing.failure as string | undefined),
    ...mergedPlant
  }
  const plantStatementSignature = buildPlantStatementSignature(mergedForSignature, userId)

  const mapped = await prisma.$transaction(async tx => {
    await tx.ba.update({
      where: { idBa },
      data: {
        projectCode: input.projectCode,
        postingDate: input.postingDate,
        symptom: input.symptom,
        failure: input.failure,
        idCaused: input.idCaused,
        causedOther: input.causedOther,
        idStatus: input.idStatus,
        statusOther: input.statusOther,
        ...mergedPlant,
        ...plantStatementSignature
      }
    })

    if (input.pairs || input.lines) {
      const lines = resolveInputLines(input as CannibalCreateInput)
      if (lines.length === 0) throw new Error('At least one REMOVE/INSTALL pair is required')
      await syncKanibalLines(existing.noBa, lines, session)
    }

    const updated = await tx.ba.findUniqueOrThrow({ where: { idBa }, include: baInclude })
    return mapCannibalRecord(updated)
  })

  logActivity({
    session,
    logName: 'cannibals',
    event: 'updated',
    description: `backfilled cannibal plant ${mapped.noBa}`,
    subjectType: 'Ba',
    subjectId: idBa,
    properties: { noBa: mapped.noBa, projectCode: mapped.projectCode, section: 'plant', backfill: true }
  })

  return mapped
}

/** @deprecated Use backfillCannibalPlantSection — kept for statement-only callers. */
export async function backfillCannibalPlantStatement(session: Session, idBa: number, input: CannibalPlantStatementInput) {
  return backfillCannibalPlantSection(session, idBa, input)
}

export async function updateCannibalExecution(session: Session, idBa: number, input: CannibalExecutionUpdateInput) {
  if (!hasPermission(session, 'cannibals.update')) {
    throw new Error('Forbidden')
  }

  const existing = await getCannibalById(session, idBa)
  if (!existing) return null

  if (existing.statusBa !== 'PENDING_DOCUMENT') {
    throw new Error('Documentation can only be updated while BA is pending documentation')
  }

  const lines = flattenPairsToLines(input.pairs)

  const mapped = await prisma.$transaction(async tx => {
    await tx.ba.update({
      where: { idBa },
      data: {
        idAction: input.idAction,
        mrNo: input.mrNo?.trim() || null,
        prNo: input.prNo?.trim() || null,
        poNo: input.poNo?.trim() || null,
        executionNotes: input.executionNotes?.trim() || null,
        documentationComplete: input.documentationComplete ?? false
      }
    })

    await syncKanibalLines(existing.noBa, lines, session)

    const updated = await tx.ba.findUniqueOrThrow({ where: { idBa }, include: baInclude })
    return mapCannibalRecord(updated)
  })

  logActivity({
    session,
    logName: 'cannibals',
    event: 'updated',
    description: `updated cannibal documentation ${mapped.noBa}`,
    subjectType: 'Ba',
    subjectId: idBa,
    properties: {
      noBa: mapped.noBa,
      projectCode: mapped.projectCode,
      section: 'documentation',
      mrNo: input.mrNo?.trim() || null,
      prNo: input.prNo?.trim() || null,
      documentationComplete: Boolean(input.documentationComplete)
    }
  })

  return mapped
}

export async function confirmCannibalStatement(session: Session, idBa: number) {
  const permissions = session.user?.permissions ?? []
  const roles = session.user?.roles ?? []

  if (!canManageCannibalLogisticStatement(permissions, roles)) {
    throw new Error('Forbidden')
  }

  const existing = await prisma.ba.findFirst({
    where: { idBa, deletedAt: null, ...getPrismaProjectFilter(session) }
  })

  if (!existing) return null

  if (existing.statusBa !== 'PENDING_LOGISTICS') {
    throw new Error('Statement can only be confirmed while BA is pending logistics')
  }

  if (!isLogisticSectionComplete(existing)) {
    throw new Error('Logistic statement must be complete before confirmation')
  }

  if (existing.statementConfirmedBy) {
    throw new Error('Statement has already been confirmed by logistic')
  }

  const userId = Number(session.user.id)
  const now = new Date()

  const updated = await prisma.ba.update({
    where: { idBa },
    data: {
      statementConfirmedBy: userId,
      statementConfirmedAt: now,
      statusBa: 'PENDING_DOCUMENT'
    },
    include: baInclude
  })

  const mapped = mapCannibalRecord(updated)
  const notifyIds = [mapped.plantSubmittedBy, mapped.createdBy, mapped.statementRequestedBy]
    .map(value => Number(value))
    .filter(id => Number.isFinite(id) && id > 0)

  notifyCannibalHandoffAsync({
    idBa,
    documentNo: String(mapped.noBa ?? idBa),
    handoff: 'STATEMENT_CONFIRMED',
    unitNo: primaryUnitNoFromCannibal(mapped),
    projectCode: typeof mapped.projectCode === 'string' ? mapped.projectCode : null,
    actorName: session.user?.name ?? session.user?.email ?? null,
    notifyUserIds: notifyIds
  })

  logActivity({
    session,
    logName: 'cannibals',
    event: 'updated',
    description: `confirmed cannibal logistic statement ${mapped.noBa}`,
    subjectType: 'Ba',
    subjectId: idBa,
    properties: {
      noBa: mapped.noBa,
      projectCode: mapped.projectCode,
      handoff: 'STATEMENT_CONFIRMED',
      statusBa: mapped.statusBa
    }
  })

  return mapped
}

export async function deleteCannibalRecord(session: Session, idBa: number) {
  if (!hasPermission(session, 'cannibals.update')) {
    throw new Error('Forbidden')
  }

  const existing = await getCannibalById(session, idBa)
  if (!existing) return null

  if (existing.statusBa !== 'DRAFT') {
    throw new Error('Only draft BA can be deleted')
  }

  await prisma.$transaction([
    prisma.kanibal.updateMany({ where: { noBa: existing.noBa }, data: { deletedAt: new Date() } }),
    prisma.ba.update({ where: { idBa }, data: { deletedAt: new Date() } })
  ])

  logActivity({
    session,
    logName: 'cannibals',
    event: 'deleted',
    description: `deleted cannibal BA ${existing.noBa}`,
    subjectType: 'Ba',
    subjectId: idBa,
    properties: { noBa: existing.noBa, projectCode: existing.projectCode }
  })

  return { success: true }
}

export async function submitCannibalRecord(session: Session, idBa: number) {
  if (!hasPermission(session, 'cannibals.update')) {
    throw new Error('Forbidden')
  }

  const existing = await getCannibalById(session, idBa)
  if (!existing) return null

  const mapped = await promoteCannibalToApproval(idBa, existing as CannibalRecordForSubmit)
  logActivity({
    session,
    logName: 'approvals',
    event: 'submitted',
    description: `submitted cannibal BA ${existing.noBa}`,
    subjectType: 'Ba',
    subjectId: idBa,
    properties: { noBa: existing.noBa, projectCode: existing.projectCode }
  })

  return mapped
}

export async function cancelCannibalRecord(session: Session, idBa: number) {
  if (!hasPermission(session, 'cannibals.update')) {
    throw new Error('Forbidden')
  }

  const existing = await getCannibalById(session, idBa)
  if (!existing) return null

  if (!['SUBMITTED', 'REJECTED', 'PENDING_LOGISTICS', 'PENDING_DOCUMENT'].includes(existing.statusBa)) {
    throw new Error('Only submitted, pending logistics, pending documentation, or rejected BA can be cancelled')
  }

  const updated = await prisma.ba.update({
    where: { idBa },
    data: { statusBa: 'CANCELLED' },
    include: baInclude
  })

  return mapCannibalRecord(updated)
}

export async function closeCannibalRecord(session: Session, idBa: number) {
  if (!hasPermission(session, 'cannibals.update')) {
    throw new Error('Forbidden')
  }

  const existing = await getCannibalById(session, idBa)
  if (!existing) return null

  if (existing.statusBa !== 'APPROVED' && !isBaFullyApproved(existing.approvals)) {
    throw new Error('BA must be fully approved before closing')
  }

  const executionReady = isExecutionComplete({
    documentationComplete: existing.documentationComplete,
    executionNotes: existing.executionNotes,
    pairs: existing.pairs as Array<{ remove?: { woNoKanibal?: string | null }; install?: { woNoKanibal?: string | null } }>
  })

  if (!executionReady) {
    throw new Error('WO numbers, execution notes, and documentation completion are required before closing')
  }

  const updated = await prisma.ba.update({
    where: { idBa },
    data: { statusBa: 'CLOSED' },
    include: baInclude
  })

  return mapCannibalRecord(updated)
}

/** Admin/superuser — seed PS→OD PENDING rows for legacy OPEN BA never approved in old system. */
export async function seedLegacyCannibalApprovalChain(session: Session, idBa: number) {
  if (!hasLegacyCannibalApprovalSeedRoleFromSession(session)) {
    throw new Error('Forbidden')
  }

  const existing = await getCannibalById(session, idBa)
  if (!existing) return null

  if (!isLegacyOpenUnapprovedBa(existing)) {
    throw new Error('BA must be OPEN with no new approval levels to initialize')
  }

  await seedApprovalRecords(idBa)

  return getCannibalById(session, idBa)
}

export type PaginatedResult<T> = {
  total: number
  rows: T[]
}

type BaApprovalQueueQuery = ListPaginationInput

function buildApprovalQueueWhere(session: Session, filters: CannibalListFilters): Prisma.BaWhereInput {
  const where = buildListWhere(session, filters)

  if (!filters.statusBa) {
    where.statusBa = { in: ['SUBMITTED', 'OPEN'] }
  }

  return where
}

function resolveQueueApprovalId(
  ba: { approvals?: { idBaApproval: number; level: string }[] },
  session: Session
): number | null {
  const levels = getActionableLevels(ba as never, session)
  const targetLevel = levels[0] ?? getPendingLevelForBa(ba as never)
  if (!targetLevel) return null

  return ba.approvals?.find(row => row.level === targetLevel)?.idBaApproval ?? null
}

export async function getCannibalApprovalById(session: Session, idBaApproval: number) {
  const approval = await prisma.baApproval.findFirst({
    where: {
      idBaApproval,
      documentType: BA_APPROVAL_DOCUMENT_CANNIBAL,
      ba: {
        deletedAt: null,
        ...getPrismaProjectFilter(session)
      }
    },
    include: {
      ba: { include: baInclude },
      user: { select: userSummarySelect }
    }
  })

  if (!approval?.ba) return null

  const ba = mapCannibalRecord(approval.ba)

  return {
    ...ba,
    idBaApproval: approval.idBaApproval,
    documentType: approval.documentType,
    contextApprovalLevel: approval.level,
    contextApprovalStatus: approval.status
  }
}

export async function listBaApprovalQueue(
  session: Session,
  filters: CannibalListFilters = {},
  query?: BaApprovalQueueQuery
): Promise<PaginatedResult<any>> {
  const admin = hasPermission(session, 'system.admin')

  const page = Number.isFinite(query?.page) && (query?.page ?? 0) >= 0 ? Math.floor(query?.page ?? 0) : 0
  const pageSize =
    Number.isFinite(query?.pageSize) && (query?.pageSize ?? 0) > 0 ? Math.min(Math.floor(query?.pageSize ?? 10), 100) : 10

  const userLevels = admin
    ? [...BA_APPROVAL_LEVELS]
    : BA_APPROVAL_LEVELS.filter(level => hasPermission(session, `cannibals.approve.${level}`))

  if (!admin && userLevels.length === 0) {
    return { total: 0, rows: [] }
  }

  const where: Prisma.BaWhereInput = {
    ...buildApprovalQueueWhere(session, filters)
  }

  if (!admin) {
    where.approvals = {
      some: {
        level: { in: userLevels },
        status: 'PENDING'
      }
    }
  }

  const [total, rows] = await Promise.all([
    prisma.ba.count({ where }),
    prisma.ba.findMany({
      where,
      include: baInclude,
      orderBy: buildBaApprovalQueueOrderBy(query?.sortField, query?.sortOrder),
      skip: page * pageSize,
      take: pageSize
    })
  ])

  const mapped = rows
    .map(row => {
      const ba = mapCannibalRecord(row)

      return {
        ...ba,
        actionableLevels: getActionableLevels(row, session),
        pendingLevel: getActionableLevels(row, session)[0] ?? null,
        queueApprovalId: resolveQueueApprovalId(row, session),
        needsLegacyApprovalInit: isLegacyOpenUnapprovedBa(row)
      }
    })
    .filter(row => admin || row.actionableLevels.length > 0)

  return { total, rows: mapped }
}

function buildBaApprovalQueueOrderBy(sortField?: string | null, sortOrder?: 'asc' | 'desc' | null): Prisma.BaOrderByWithRelationInput[] {
  const direction = sortOrder === 'asc' ? 'asc' : 'desc'
  if (!sortField) return [{ postingDate: 'desc' }, { idBa: 'desc' }]

  switch (sortField) {
    case 'noBa':
      return [{ noBa: direction }, { idBa: direction }]
    case 'projectCode':
      return [{ projectCode: direction }, { idBa: direction }]
    case 'postingDate':
      return [{ postingDate: direction }, { idBa: direction }]
    case 'statusBa':
      return [{ statusBa: direction }, { idBa: direction }]
    default:
      return [{ postingDate: 'desc' }, { idBa: 'desc' }]
  }
}

export async function approveBaLevel(session: Session, idBaApproval: number, remark?: string | null) {
  const approval = await prisma.baApproval.findUnique({
    where: { idBaApproval },
    include: { ba: { include: { approvals: true } } }
  })

  if (!approval || approval.ba.deletedAt) {
    return null
  }

  if (approval.documentType !== BA_APPROVAL_DOCUMENT_CANNIBAL) {
    throw new Error('Invalid approval document type')
  }

  const ba = approval.ba
  const level = approval.level as BaApprovalLevel
  const userId = Number(session.user.id)

  if (!canApproveAtBaLevel(ba, level, session)) {
    throw new Error('You are not authorized to approve at this level')
  }

  const now = new Date()

  await prisma.baApproval.update({
    where: { idBaApproval },
    data: {
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: now,
      remark: remark ?? null
    }
  })

  const updated = await getCannibalById(session, ba.idBa)
  if (!updated) return null

  const actorName = session.user?.name ?? session.user?.email ?? null
  const documentNo = String(updated.noBa ?? ba.idBa)
  const unitNo = primaryUnitNoFromCannibal(updated)
  const projectCode = typeof updated.projectCode === 'string' ? updated.projectCode : ba.projectCode
  const submitterUserId = updated.plantSubmittedBy ?? updated.createdBy ?? null

  notifyApprovalDecisionAsync({
    kind: 'CANNIBAL',
    documentId: ba.idBa,
    documentNo,
    decision: 'APPROVED',
    level,
    levelLabel: getCannibalApprovalLabel(level),
    unitNo,
    projectCode,
    actorName,
    remark: remark ?? null,
    submitterUserId: submitterUserId ? Number(submitterUserId) : null
  })

  logActivity({
    session,
    logName: 'approvals',
    event: 'approved',
    description: `approved cannibal BA ${documentNo} at ${level}`,
    subjectType: 'Ba',
    subjectId: ba.idBa,
    properties: { level, unitNo, projectCode }
  })

  if (isBaFullyApproved(updated.approvals)) {
    const approved = await prisma.ba.update({
      where: { idBa: ba.idBa },
      data: { statusBa: 'APPROVED' },
      include: baInclude
    })
    const mapped = mapCannibalRecord(approved)
    notifyFullyApprovedAsync({
      kind: 'CANNIBAL',
      documentId: ba.idBa,
      documentNo,
      unitNo,
      projectCode,
      actorName,
      submitterUserId: submitterUserId ? Number(submitterUserId) : null
    })

    return mapped
  }

  const nextLevel = getPendingLevelForBa(updated)
  if (nextLevel) {
    notifyApprovalPendingAsync({
      kind: 'CANNIBAL',
      documentId: ba.idBa,
      documentNo,
      level: nextLevel,
      levelLabel: getCannibalApprovalLabel(nextLevel),
      unitNo,
      projectCode,
      actorName
    })
  }

  return updated
}

export async function rejectBaLevel(session: Session, idBaApproval: number, remark?: string | null) {
  const approval = await prisma.baApproval.findUnique({
    where: { idBaApproval },
    include: { ba: { include: { approvals: true } } }
  })

  if (!approval || approval.ba.deletedAt) {
    return null
  }

  if (approval.documentType !== BA_APPROVAL_DOCUMENT_CANNIBAL) {
    throw new Error('Invalid approval document type')
  }

  const ba = approval.ba
  const level = approval.level as BaApprovalLevel
  const userId = Number(session.user.id)

  if (!canRejectAtBaLevel(ba, level, session)) {
    throw new Error('You are not authorized to reject at this level')
  }

  const now = new Date()

  await prisma.$transaction([
    prisma.baApproval.update({
      where: { idBaApproval },
      data: {
        status: 'NOT APPROVED',
        approvedBy: userId,
        approvedAt: now,
        remark: remark ?? null
      }
    }),
    prisma.ba.update({
      where: { idBa: ba.idBa },
      data: {
        statusBa: 'REJECTED',
        statementConfirmedBy: null,
        statementConfirmedAt: null,
        plantSubmittedBy: null,
        plantSubmittedAt: null
      }
    })
  ])

  const result = await getCannibalById(session, ba.idBa)
  if (result) {
    notifyApprovalDecisionAsync({
      kind: 'CANNIBAL',
      documentId: ba.idBa,
      documentNo: String(result.noBa ?? ba.idBa),
      decision: 'REJECTED',
      level,
      levelLabel: getCannibalApprovalLabel(level),
      unitNo: primaryUnitNoFromCannibal(result),
      projectCode: typeof result.projectCode === 'string' ? result.projectCode : ba.projectCode,
      actorName: session.user?.name ?? session.user?.email ?? null,
      remark: remark ?? null,
      submitterUserId: result.createdBy ? Number(result.createdBy) : ba.createdBy,
      extraRecipientUserIds: [ba.plantSubmittedBy, ba.statementRequestedBy].filter(
        (id): id is number => typeof id === 'number' && id > 0
      )
    })
    logActivity({
      session,
      logName: 'approvals',
      event: 'rejected',
      description: `rejected cannibal BA ${result.noBa} at ${level}`,
      subjectType: 'Ba',
      subjectId: ba.idBa,
      properties: { level, noBa: result.noBa }
    })
  }

  return result
}

export async function revokeBaLevel(session: Session, idBaApproval: number) {
  const approval = await prisma.baApproval.findUnique({
    where: { idBaApproval },
    include: { ba: { include: { approvals: true } } }
  })

  if (!approval || approval.ba.deletedAt) {
    return null
  }

  if (approval.documentType !== BA_APPROVAL_DOCUMENT_CANNIBAL) {
    throw new Error('Invalid approval document type')
  }

  const ba = approval.ba
  const level = approval.level as BaApprovalLevel

  if (!canRevokeBaApproval(ba, level, session)) {
    throw new Error('You cannot revoke approval at this stage')
  }

  await prisma.baApproval.update({
    where: { idBaApproval },
    data: {
      status: 'PENDING',
      approvedBy: null,
      approvedAt: null,
      remark: null
    }
  })

  const approvals = await prisma.baApproval.findMany({
    where: { idBa: ba.idBa }
  })

  if (!isBaFullyApproved(approvals) && ba.statusBa === 'APPROVED') {
    await prisma.ba.update({
      where: { idBa: ba.idBa },
      data: { statusBa: 'OPEN' }
    })
  }

  const result = await getCannibalById(session, ba.idBa)
  if (result) {
    const actorName = session.user?.name ?? session.user?.email ?? null
    const documentNo = String(result.noBa ?? ba.idBa)
    const unitNo = primaryUnitNoFromCannibal(result)
    const projectCode = typeof result.projectCode === 'string' ? result.projectCode : ba.projectCode

    notifyApprovalDecisionAsync({
      kind: 'CANNIBAL',
      documentId: ba.idBa,
      documentNo,
      decision: 'REVOKED',
      level,
      levelLabel: getCannibalApprovalLabel(level),
      unitNo,
      projectCode,
      actorName,
      submitterUserId: result.plantSubmittedBy
        ? Number(result.plantSubmittedBy)
        : result.createdBy
          ? Number(result.createdBy)
          : ba.createdBy
    })

    const nextLevel = getPendingLevelForBa(result)
    if (nextLevel) {
      notifyApprovalPendingAsync({
        kind: 'CANNIBAL',
        documentId: ba.idBa,
        documentNo,
        level: nextLevel,
        levelLabel: getCannibalApprovalLabel(nextLevel),
        unitNo,
        projectCode,
        actorName
      })
    }
  }

  return result
}

const PLANNING_EDITABLE_STATUSES = [
  'PENDING_LOGISTICS',
  'PENDING_DOCUMENT',
  'SUBMITTED',
  'OPEN',
  'APPROVED',
  'REJECTED'
] as const

export async function updateCannibalPlanning(session: Session, idBa: number, input: CannibalPlanningUpdateInput) {
  if (!hasPermission(session, 'cannibals.update')) {
    throw new Error('Forbidden')
  }

  const existing = await getCannibalById(session, idBa)
  if (!existing) return null

  if (!PLANNING_EDITABLE_STATUSES.includes(existing.statusBa as (typeof PLANNING_EDITABLE_STATUSES)[number])) {
    throw new Error('Planning section cannot be updated at this workflow stage')
  }

  await prisma.ba.update({
    where: { idBa },
    data: {
      idAction: input.idAction,
      ...(input.mrNo !== undefined ? { mrNo: input.mrNo ?? null } : {}),
      ...(input.prNo !== undefined ? { prNo: input.prNo ?? null } : {}),
      ...(input.poNo !== undefined ? { poNo: input.poNo ?? null } : {})
    }
  })

  const mapped = await getCannibalById(session, idBa)
  if (mapped) {
    logActivity({
      session,
      logName: 'cannibals',
      event: 'updated',
      description: `updated cannibal planning ${mapped.noBa}`,
      subjectType: 'Ba',
      subjectId: idBa,
      properties: {
        noBa: mapped.noBa,
        projectCode: mapped.projectCode,
        section: 'planning',
        mrNo: mapped.mrNo,
        prNo: mapped.prNo,
        poNo: mapped.poNo
      }
    })
  }

  return mapped
}

export async function getBaLookups() {
  const [caused, actions, statuses] = await Promise.all([
    prisma.baCaused.findMany({ orderBy: { idCaused: 'asc' } }),
    prisma.baAction.findMany({ orderBy: { idAction: 'asc' } }),
    prisma.baComponentStatus.findMany()
  ])

  const statusOrder = ['BRAND NEW', 'PEX REMAN', 'RESEAL ONLY', 'AS IS REPAIR', 'OTHER']
  const normalizeStatus = (value: string) => {
    const label = value.trim().toUpperCase().replace(/\s+/g, ' ')
    if (label.includes('PEX') && label.includes('REMAN')) return 'PEX REMAN'

    return label
  }
  const sortedStatuses = [...statuses].sort((a, b) => {
    const ia = statusOrder.indexOf(normalizeStatus(a.status))
    const ib = statusOrder.indexOf(normalizeStatus(b.status))
    const rankA = ia === -1 ? 998 : ia
    const rankB = ib === -1 ? 998 : ib

    if (rankA !== rankB) return rankA - rankB

    return a.idStatus - b.idStatus
  })

  return { caused, actions: sortPlanningActions(actions), statuses: sortedStatuses }
}

async function resolveDefaultActionId(): Promise<number> {
  const first = await prisma.baAction.findFirst({ orderBy: { idAction: 'asc' } })
  if (!first) throw new Error('Planning action lookup is not configured')

  return first.idAction
}
