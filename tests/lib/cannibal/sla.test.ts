import { describe, expect, it } from 'vitest'

import {
  buildCannibalSlaSnapshot,
  buildExpiredReopenPatch,
  CANNIBAL_SLA_MS,
  formatCannibalRemaining,
  formatDurationMs,
  isCannibalOverallExpired,
  resolveCannibalWaitingOn
} from '@/lib/cannibal/sla'

const t0 = new Date('2026-09-15T00:00:00.000Z')

describe('cannibal SLA snapshot', () => {
  it('does not track draft before plant submit', () => {
    const sla = buildCannibalSlaSnapshot({ statusBa: 'DRAFT', plantSubmittedAt: null }, t0)

    expect(sla.tracked).toBe(false)
    expect(sla.expired).toBe(false)
    expect(sla.overallDeadline).toBeNull()
  })

  it('starts the 5-day clock at plant submit and 1-day requestor stage', () => {
    const sla = buildCannibalSlaSnapshot(
      {
        statusBa: 'PENDING_REQUESTOR',
        plantSubmittedAt: t0,
        cannibalRequestRole: 'PJO',
        requestor: { fullName: 'Budi' }
      },
      t0
    )

    expect(sla.tracked).toBe(true)
    expect(sla.expired).toBe(false)
    expect(sla.stageKey).toBe('requestor')
    expect(sla.waitingOn).toBe('Request By (PJO — Budi)')
    expect(new Date(sla.stageDeadline).getTime() - t0.getTime()).toBe(CANNIBAL_SLA_MS.PENDING_REQUESTOR)
    expect(new Date(sla.overallDeadline).getTime() - t0.getTime()).toBe(CANNIBAL_SLA_MS.TOTAL)
  })

  it('uses logistic confirm time for documentation stage', () => {
    const confirmed = new Date(t0.getTime() + CANNIBAL_SLA_MS.PENDING_REQUESTOR)
    const sla = buildCannibalSlaSnapshot(
      {
        statusBa: 'PENDING_DOCUMENT',
        plantSubmittedAt: t0,
        requestedConfirmedAt: confirmed,
        statementConfirmedAt: confirmed
      },
      confirmed
    )

    expect(sla.stageKey).toBe('documentation')
    expect(sla.waitingOn).toBe('Plant (Record & Documentation)')
    expect(new Date(sla.stageDeadline).getTime() - confirmed.getTime()).toBe(CANNIBAL_SLA_MS.PENDING_DOCUMENT)
  })

  it('gives approval 2 days from approval submit', () => {
    const submitted = new Date(t0.getTime() + 2 * CANNIBAL_SLA_MS.PENDING_REQUESTOR)
    const sla = buildCannibalSlaSnapshot(
      {
        statusBa: 'OPEN',
        plantSubmittedAt: t0,
        approvalSubmittedAt: submitted,
        approvals: [{ level: 'PS', status: 'PENDING' }]
      },
      submitted
    )

    expect(sla.stageKey).toBe('approval')
    expect(sla.waitingOn).toBe('Approval (Plant Superintendent / Dept Head)')
    expect(new Date(sla.stageDeadline).getTime() - submitted.getTime()).toBe(CANNIBAL_SLA_MS.APPROVAL)
  })

  it('expires after 5×24h from plant submit', () => {
    const now = new Date(t0.getTime() + CANNIBAL_SLA_MS.TOTAL)
    const ba = {
      statusBa: 'PENDING_LOGISTICS',
      plantSubmittedAt: t0,
      requestedConfirmedAt: t0
    }

    expect(isCannibalOverallExpired(ba, now)).toBe(true)
    expect(buildCannibalSlaSnapshot(ba, now).expired).toBe(true)
  })

  it('keeps waiting-on from expiredFromStatus', () => {
    expect(
      resolveCannibalWaitingOn({
        statusBa: 'EXPIRED',
        expiredFromStatus: 'PENDING_LOGISTICS'
      })
    ).toBe('Logistic')
  })

  it('reopen patch restores stage and restarts the 5-day clock', () => {
    const patch = buildExpiredReopenPatch('PENDING_DOCUMENT', t0)
    expect(patch.statusBa).toBe('PENDING_DOCUMENT')
    expect(patch.plantSubmittedAt).toEqual(t0)
    expect(patch.statementConfirmedAt).toEqual(t0)
    expect(patch.expiredAt).toBeNull()
    expect(patch.expiredFromStatus).toBeNull()
  })

  it('rejects reopen without a tracked original stage', () => {
    expect(() => buildExpiredReopenPatch('CLOSED', t0)).toThrow(/original workflow stage/)
  })
})

describe('cannibal remaining format', () => {
  it('formats remaining and overdue windows', () => {
    expect(formatDurationMs(2 * CANNIBAL_SLA_MS.PENDING_REQUESTOR + 4 * 60 * 60 * 1000)).toBe('2 hari 4 jam')
    expect(formatCannibalRemaining(new Date(t0.getTime() + 18 * 60 * 60 * 1000).toISOString(), t0).text).toBe(
      'Sisa 18 jam'
    )
    expect(formatCannibalRemaining(new Date(t0.getTime() - 90 * 60 * 1000).toISOString(), t0)).toMatchObject({
      text: 'Lewat 1 jam 30 menit',
      overdue: true
    })
  })
})
