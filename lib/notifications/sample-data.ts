/**
 * Ambil data real terakhir dari DB untuk preview email admin (gambaran produksi).
 */

import {
  getChainLevelConfig,
  PCR_FORECAST_APPROVAL_CHAIN
} from '@/lib/approval/registry'
import {
  CANNIBAL_REQUEST_ROLE_LABELS,
  isCannibalRequestRole
} from '@/lib/cannibal/requestor-roles'
import { buildCannibalDetailUrl, buildDetailUrl } from '@/lib/notifications/events'
import { prisma } from '@/lib/prisma'
import type {
  NotificationEvent,
  NotificationPayload,
  TrialSample
} from '@/lib/notifications/types'

export type PreviewDataSource = {
  label: string
  documentNo?: string
  unitNo?: string
  projectCode?: string
  fetchedAt: string
}

async function latestBaPcr() {
  return prisma.baPcr.findFirst({
    where: { isActive: true },
    orderBy: { idBaPcr: 'desc' },
    include: {
      forecast: true,
      submitter: { select: { fullName: true, username: true } },
      approvals: { orderBy: { stepOrder: 'asc' } }
    }
  })
}

/** Catatan default per template — selaras dengan subheadline/body masing-masing event. */
function defaultRemarkForEvent(
  event: NotificationEvent,
  context: { level?: string | null; levelLabel?: string | null } = {}
): string | undefined {
  const level = context.levelLabel ?? context.level

  switch (event) {
    case 'approval_pending':
      return 'Mohon review dan approve sesuai kebijakan PCR site.'
    case 'approval_decision':
      return level
        ? `Level ${level} telah disetujui. Mohon pantau kelanjutan approval berikutnya.`
        : 'Keputusan approval telah dicatat. Mohon pantau kelanjutan proses.'
    case 'fully_approved':
      return 'Seluruh level approval telah disetujui. Forecast siap dikonversi ke PCR actual sesuai rencana site.'
    default:
      return undefined
  }
}

async function latestCannibalBa() {
  return prisma.ba.findFirst({
    where: { deletedAt: null },
    orderBy: { idBa: 'desc' },
    include: {
      kanibals: {
        where: { deletedAt: null, type: 'REMOVE' },
        take: 1,
        orderBy: { idKanibal: 'asc' }
      },
      plantSubmitter: { select: { fullName: true, username: true } },
      requestor: { select: { fullName: true, username: true } }
    }
  })
}

async function latestCannibalBaWithRequestor() {
  return prisma.ba.findFirst({
    where: {
      deletedAt: null,
      requestedBy: { not: null },
      cannibalRequestRole: { not: null }
    },
    orderBy: { idBa: 'desc' },
    include: {
      kanibals: {
        where: { deletedAt: null, type: 'REMOVE' },
        take: 1,
        orderBy: { idKanibal: 'asc' }
      },
      plantSubmitter: { select: { fullName: true, username: true } },
      requestor: { select: { fullName: true, username: true } }
    }
  })
}

function actorName(fullName?: string | null, username?: string | null): string {
  return fullName?.trim() || username?.trim() || 'System'
}

function mergeSample(real: TrialSample, override?: TrialSample): TrialSample {
  if (!override) return real

  return {
    documentNo: override.documentNo ?? real.documentNo,
    level: override.level ?? real.level,
    unitNo: override.unitNo ?? real.unitNo,
    projectCode: override.projectCode ?? real.projectCode,
    compDesc: override.compDesc ?? real.compDesc,
    actorName: override.actorName ?? real.actorName,
    remark: override.remark ?? real.remark,
    message: override.message ?? real.message
  }
}

function hasFormOverride(sample?: TrialSample): boolean {
  if (!sample) return false

  return Boolean(
    sample.documentNo ||
      sample.level ||
      sample.unitNo ||
      sample.projectCode ||
      sample.compDesc ||
      sample.actorName ||
      sample.remark ||
      sample.message
  )
}

/** Payload preview berbasis record terakhir di DB (fallback statis jika kosong). */
export async function buildRealisticPreviewPayload(
  event: NotificationEvent,
  formSample?: TrialSample
): Promise<{ payload: NotificationPayload; source: PreviewDataSource }> {
  const fetchedAt = new Date().toISOString()

  const baPcr = await latestBaPcr()
  const cannibal = await latestCannibalBa()
  const cannibalRequestor = (await latestCannibalBaWithRequestor()) ?? cannibal

  const pendingApproval = baPcr?.approvals.find(row => row.status === 'PENDING')
  const lastApproved = [...(baPcr?.approvals ?? [])].reverse().find(row => row.status === 'APPROVED')
  const pcrLevel = pendingApproval?.level ?? lastApproved?.level ?? 'PS'

  const pcrLevelLabel =
    getChainLevelConfig(PCR_FORECAST_APPROVAL_CHAIN, pcrLevel)?.label ?? pcrLevel
  const forecastRemark = baPcr?.forecast.remark?.trim() || undefined
  const approvalNote = lastApproved?.note?.trim() || undefined

  const realSample: TrialSample = {
    documentNo: baPcr?.noBaPcr ?? '008/PLT-017C/PCR/VI/2026',
    level: pcrLevel,
    unitNo: baPcr?.forecast.unitNo ?? 'E 044',
    projectCode: baPcr?.forecast.projectCode ?? '017C',
    compDesc: baPcr?.forecast.compDesc ?? 'ALTERNATOR',
    actorName: actorName(baPcr?.submitter?.fullName, baPcr?.submitter?.username),
    message: 'ARKA PCR email notification — uji koneksi SMTP.'
  }

  const sample = hasFormOverride(formSample) ? mergeSample(realSample, formSample) : realSample

  const pcrDocId = baPcr?.idBaPcr ?? 8
  const cannibalDocId = cannibal?.idBa ?? 2495
  const cannibalNo = cannibal?.noBa ?? '2652021185'
  const cannibalUnit = cannibal?.kanibals[0]?.unitNo ?? 'T 109'

  const requestorBa = cannibalRequestor ?? cannibal

  const requestorRole = isCannibalRequestRole(requestorBa?.cannibalRequestRole)
    ? requestorBa.cannibalRequestRole
    : 'PJO'

  const requestorRoleLabel = isCannibalRequestRole(requestorRole)
    ? CANNIBAL_REQUEST_ROLE_LABELS[requestorRole]
    : requestorRole
  const requestorName = actorName(requestorBa?.requestor?.fullName, requestorBa?.requestor?.username)
  const requestorBaId = requestorBa?.idBa ?? cannibalDocId
  const requestorBaNo = requestorBa?.noBa ?? cannibalNo
  const requestorBaUnit = requestorBa?.kanibals[0]?.unitNo ?? cannibalUnit

  const requestorRejectRemark =
    requestorBa?.requestedRejectRemark?.trim() ||
    'Mohon naikkan order P1 terlebih dahulu sebelum submit ulang kanibal.'

  const cannibalRequestorBase = {
    kind: 'CANNIBAL' as const,
    documentId: requestorBaId,
    documentNo: requestorBaNo,
    unitNo: requestorBaUnit,
    projectCode: requestorBa?.projectCode ?? '021C',
    actorName: actorName(requestorBa?.plantSubmitter?.fullName, requestorBa?.plantSubmitter?.username),
    detailUrl: buildCannibalDetailUrl(requestorBaId),
    requestorRole,
    requestorRoleLabel,
    requestorName
  }

  const docBase = {
    kind: 'PCR_FORECAST' as const,
    documentId: pcrDocId,
    documentNo: sample.documentNo!,
    unitNo: sample.unitNo,
    projectCode: sample.projectCode,
    compDesc: sample.compDesc,
    level: sample.level,
    levelLabel: pcrLevelLabel,
    actorName: sample.actorName,
    detailUrl: buildDetailUrl('PCR_FORECAST', pcrDocId)
  }

  let payload: NotificationPayload
  let source: PreviewDataSource

  switch (event) {
    case 'approval_pending':
      payload = {
        event,
        ...docBase,
        remark: sample.remark ?? forecastRemark ?? defaultRemarkForEvent(event, { level: pcrLevel, levelLabel: pcrLevelLabel }),
        permissionCode: `forecasts.approve.${sample.level ?? 'PS'}`
      }
      source = {
        label: `BA PCR aktif #${pcrDocId}`,
        documentNo: sample.documentNo,
        unitNo: sample.unitNo,
        projectCode: sample.projectCode,
        fetchedAt
      }
      break

    case 'approval_decision':
      payload = {
        event,
        ...docBase,
        remark:
          sample.remark ??
          approvalNote ??
          defaultRemarkForEvent(event, {
            level: lastApproved?.level ?? sample.level,
            levelLabel: lastApproved?.approverLabel ?? pcrLevelLabel
          }),
        decision: 'APPROVED'
      }
      source = {
        label: `BA PCR #${pcrDocId} — contoh approve level ${sample.level}`,
        documentNo: sample.documentNo,
        unitNo: sample.unitNo,
        projectCode: sample.projectCode,
        fetchedAt
      }
      break

    case 'fully_approved':
      payload = {
        event,
        ...docBase,
        remark: sample.remark ?? defaultRemarkForEvent(event)
      }
      source = {
        label: `BA PCR #${pcrDocId} — fully approved`,
        documentNo: sample.documentNo,
        unitNo: sample.unitNo,
        projectCode: sample.projectCode,
        fetchedAt
      }
      break

    case 'cannibal_handoff':
      payload = {
        event,
        kind: 'CANNIBAL',
        documentId: cannibalDocId,
        documentNo: cannibalNo,
        unitNo: cannibalUnit,
        projectCode: cannibal?.projectCode ?? '021C',
        level: null,
        levelLabel: null,
        actorName: actorName(cannibal?.plantSubmitter?.fullName, cannibal?.plantSubmitter?.username),
        detailUrl: buildCannibalDetailUrl(cannibalDocId),
        handoff: 'TO_LOGISTICS',
        requestorRoleLabel: requestorRoleLabel
      }
      source = {
        label: `Cannibal BA #${cannibalDocId} — logistics handoff`,
        documentNo: cannibalNo,
        unitNo: cannibalUnit,
        projectCode: cannibal?.projectCode ?? undefined,
        fetchedAt
      }
      break

    case 'cannibal_requestor_pending':
      payload = {
        event,
        ...cannibalRequestorBase,
        remark: sample.remark ?? `Mohon review dan confirm permintaan ${requestorRoleLabel} di ARKA PCR.`
      }
      source = {
        label: `Cannibal BA #${requestorBaId} — menunggu ${requestorRoleLabel}`,
        documentNo: requestorBaNo,
        unitNo: requestorBaUnit,
        projectCode: requestorBa?.projectCode ?? undefined,
        fetchedAt
      }
      break

    case 'cannibal_requestor_confirmed':
      payload = {
        event,
        ...cannibalRequestorBase,
        actorName: sample.actorName ?? requestorName
      }
      source = {
        label: `Cannibal BA #${requestorBaId} — ${requestorRoleLabel} confirmed`,
        documentNo: requestorBaNo,
        unitNo: requestorBaUnit,
        projectCode: requestorBa?.projectCode ?? undefined,
        fetchedAt
      }
      break

    case 'cannibal_requestor_rejected':
      payload = {
        event,
        ...cannibalRequestorBase,
        actorName: sample.actorName ?? requestorName,
        remark: sample.remark ?? requestorRejectRemark
      }
      source = {
        label: `Cannibal BA #${requestorBaId} — ${requestorRoleLabel} rejected`,
        documentNo: requestorBaNo,
        unitNo: requestorBaUnit,
        projectCode: requestorBa?.projectCode ?? undefined,
        fetchedAt
      }
      break

    case 'plain_ping':
      payload = {
        event,
        message: sample.message ?? 'ARKA PCR email notification — uji koneksi SMTP.'
      }
      source = { label: 'System ping', fetchedAt }
      break

    default: {
      const _exhaustive: never = event
      throw new Error(`Unknown event: ${_exhaustive}`)
    }
  }

  return { payload, source }
}

/** Metadata ringkas semua template + sumber data untuk halaman admin. */
export async function listPreviewSamples(): Promise<
  Array<{ event: NotificationEvent; source: PreviewDataSource }>
> {
  const events: NotificationEvent[] = [
    'approval_pending',
    'approval_decision',
    'fully_approved',
    'cannibal_handoff',
    'cannibal_requestor_pending',
    'cannibal_requestor_confirmed',
    'cannibal_requestor_rejected',
    'plain_ping'
  ]

  return Promise.all(
    events.map(async event => {
      const { source } = await buildRealisticPreviewPayload(event)

      return { event, source }
    })
  )
}
