/**
 * Breakdown orchestration with fake SAP and database. No live work order is created.
 */
import { describe, expect, it } from 'vitest'

import {
  addBreakdownActivity,
  closeBreakdown,
  createBreakdown,
  deleteBreakdown,
  deleteBreakdownActivity,
  downtimeHoursFor,
  statusUnitFor,
  updateBreakdown,
  updateBreakdownActivity,
  type BreakdownDeps,
  type CreateBreakdownInput
} from '@/lib/dmbd/breakdowns'

const allow = () => true

const input: CreateBreakdownInput = {
  fleetUnitId: 56,
  startedDate: '2026-10-19',
  startedTime: '08:05',
  problem: 'Engine leak',
  hourMeter: '34073',
  remark: '',
  jobCategory: 'B',
  jobCode: 'JC-02',
  location: 'Workshop',
  operatorCode: '13516',
  mechanicLeaderCode: '13516',
  componentCode: 'CC-05',
  subComponentCode: 'CC05-1',
  damageCode: 'D-09',
  failureCauseCode: 'C-08',
  preparedBy: 'SUHRAWARDI',
  assigneeCode: '1',
  activity: {
    code: 'B12',
    position: 'BD',
    startedDate: '2026-10-19',
    startedTime: '08:05',
    endedDate: '',
    endedTime: '',
    details: '',
    technicianName: '',
    technicianQty: '',
    handledBy: ''
  }
}

function deps(overrides: Partial<BreakdownDeps> = {}) {
  const calls: string[] = []

  const bodies: {
    service: Record<string, unknown> | null
    activity: Record<string, unknown> | null
    saved: {
      workOrder?: string | null
      sapServiceCallId?: number | null
      activities?: { create?: { handledBy?: number; sapActivityCode?: number | null } }
    } | null
  } = {
    service: null,
    activity: null,
    saved: null
  }

  const base: BreakdownDeps = {
    loadUnit: async () => ({ fleetUnitId: 56, unitNo: 'RD 056', projectCode: '023C', modelName: '773E' }),
    findOpenBdId: async () => null,
    activityMaster: async () => ({ code: 'B12', name: 'WAIT PART' }),
    componentName: async () => 'ENGINE',
    cardCode: () => 'CARAPIDR01',
    seriesFor: async () => 3830,
    woCatalog: async () => ({
      jobCategories: [{ code: 'B', name: 'Unschedule' }],
      jobCodes: [{ code: 'JC-02', name: 'Corrective Maintenance', category: 'B' }],
      locations: [{ code: 'Workshop', name: 'Workshop' }],
      employees: [{ code: '13516', name: 'SUHRAWARDI' }],
      users: [{ code: '1', name: 'manager' }],
      operators: [{ code: '13516', name: 'SUHRAWARDI' }],
      mechanics: [{ code: '13516', name: 'SUHRAWARDI' }],
      components: [{ code: 'CC-05', name: 'SUSPENSION' }],
      subComponents: [{ code: 'CC05-1', name: 'LINE' }],
      damages: [{ code: 'D-09', name: 'LEAK' }],
      causes: [{ code: 'C-08', name: 'WORN' }]
    }),
    unitSerial: async () => 'FKR1',
    issueServiceCall: async body => {
      calls.push('service')
      bodies.service = body

      return { serviceCallId: 501, docNum: '265171' }
    },
    issueActivity: async body => {
      calls.push('activity')
      bodies.activity = body

      return 9001
    },
    patchCall: async () => {
      calls.push('patch')
    },
    cancelCall: async () => {
      calls.push('cancel')
    },
    deactivate: async () => {
      calls.push('deactivate')
    },
    saveNew: async data => {
      calls.push('save')
      bodies.saved = data as typeof bodies.saved

      return { id: 'bd-1' }
    },
    nextRegisterNo: async (projectCode, startedAt) => {
      calls.push('register')
      const yy = String(startedAt.getUTCFullYear()).slice(2)
      const mm = String(startedAt.getUTCMonth() + 1).padStart(2, '0')

      return `BD-${projectCode}.${yy}${mm}-0001`
    },
    saveActivity: async () => {
      calls.push('save-activity')
    },
    updateActivity: async () => {
      calls.push('update-activity')
    },
    removeActivity: async () => {
      calls.push('remove-activity')
    },
    patchActivity: async () => {
      calls.push('patch-activity')
    },
    loadBreakdown: async () => null,
    markClosed: async () => {
      calls.push('closed')
    },
    saveHeader: async () => {
      calls.push('header')
    },
    markCancelled: async () => {
      calls.push('mark-cancelled')
    },
    removeBreakdown: async () => {
      calls.push('remove-breakdown')
    },
    ...overrides
  }

  return { ...base, calls, bodies }
}

describe('daily report columns', () => {
  it('shows RFU only after finish and otherwise the latest position', () => {
    expect(statusUnitFor(null, 'BD')).toBe('BD')
    expect(statusUnitFor(null, 'OP')).toBe('OP')
    expect(statusUnitFor(new Date('2026-10-20T10:00:00'), 'BD')).toBe('RFU')
    expect(statusUnitFor(null, null)).toBe('BD')
    expect(statusUnitFor(null, 'BD', new Date('2026-11-02T10:00:00'))).toBe('CANCEL')
  })

  it('counts downtime to finish, or to now while open', () => {
    const start = new Date('2026-10-19T08:00:00')

    expect(downtimeHoursFor(start, new Date('2026-10-19T10:30:00'))).toBe(2.5)
    expect(downtimeHoursFor(start, null, new Date('2026-10-20T08:00:00'))).toBe(24)
    expect(downtimeHoursFor(start, null, new Date('2026-10-19T07:00:00'))).toBe(0)
  })
})

describe('createBreakdown', () => {
  it('saves a breakdown when the SAP work-order fields are empty', async () => {
    const fake = deps({
      woCatalog: async () => {
        throw new Error('catalog should not be loaded')
      }
    })

    const result = await createBreakdown(
      {
        ...input,
        jobCategory: '',
        jobCode: '',
        location: '',
        operatorCode: '',
        mechanicLeaderCode: '',
        componentCode: '',
        subComponentCode: '',
        damageCode: '',
        failureCauseCode: '',
        preparedBy: ''
      },
      7,
      allow,
      fake
    )

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['register', 'save'])
    expect(fake.bodies.saved?.registerNo).toMatch(/^BD-023C\.\d{4}-0001$/)
    expect(fake.bodies.saved?.sapServiceCallId).toBeNull()
  })

  it('still requires the SAP header when a work order is created', async () => {
    const fake = deps()
    const result = await createBreakdown({ ...input, issueWorkOrder: true, jobCategory: '' }, 7, allow, fake)

    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(fake.calls).toEqual([])
  })

  it('saves locally without issuing a SAP work order or activity', async () => {
    const fake = deps()
    const result = await createBreakdown(input, 7, allow, fake)

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['register', 'save'])
    expect(fake.bodies.service).toBeNull()
    expect(fake.bodies.activity).toBeNull()
    expect(fake.bodies.saved?.registerNo).toMatch(/^BD-023C\.\d{4}-0001$/)
    expect(fake.bodies.saved?.workOrder).toBeNull()
    expect(fake.bodies.saved?.sapServiceCallId).toBeNull()
    expect(fake.bodies.saved?.activities?.create?.sapActivityCode).toBeNull()
    expect(fake.bodies.saved?.activities?.create?.handledBy).toBe(7)
  })

  it('stores a typed work order number without calling SAP', async () => {
    const fake = deps()
    const result = await createBreakdown({ ...input, workOrder: 'WO 265171001' }, 7, allow, fake)

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['register', 'save'])
    expect(fake.bodies.saved?.workOrder).toBe('265171001')
  })

  it('does not cancel or deactivate anything when the local save fails', async () => {
    const fake = deps({
      saveNew: async () => {
        throw new Error('db down')
      }
    })
    const result = await createBreakdown(input, 7, allow, fake)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('db down')
    expect(fake.calls).toEqual(['register'])
  })

  it('refuses a second open BD-position breakdown for the same unit', async () => {
    const fake = deps({ findOpenBdId: async () => 'already-open-bd' })
    const result = await createBreakdown(input, 7, allow, fake)

    expect(result).toMatchObject({ ok: false, status: 409 })
    expect(fake.calls).toEqual([])
  })

  it('allows an open AJ episode while another BD-position breakdown is open', async () => {
    const fake = deps({ findOpenBdId: async () => 'already-open-bd' })
    const result = await createBreakdown(
      { ...input, activity: { ...input.activity, position: 'AJ' } },
      7,
      allow,
      fake
    )

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.bodies.saved?.activities?.create).toMatchObject({ positionStatus: 'AJ' })
  })

  it('creates a SAP work order and the first activity when asked', async () => {
    const fake = deps()
    const result = await createBreakdown({ ...input, issueWorkOrder: true }, 7, allow, fake)

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['service', 'activity', 'register', 'save'])
    expect(fake.bodies.service?.U_MIS_LastOpUse).toBe('13516')
    expect(fake.bodies.service?.U_MIS_Mech1).toBe('13516')
    expect(fake.bodies.service?.AssigneeCode).toBe(1)
    expect(fake.bodies.saved?.registerNo).toMatch(/^BD-023C\.\d{4}-0001$/)
    expect(fake.bodies.saved?.workOrder).toBe('265171')
    expect(fake.bodies.saved?.sapServiceCallId).toBe(501)
    expect(fake.bodies.saved?.activities?.create?.sapActivityCode).toBe(9001)
  })

  it('rejects an activity that ends before it starts', async () => {
    const fake = deps()

    const result = await createBreakdown(
      {
        ...input,
        activity: { ...input.activity, endedDate: '2026-10-18', endedTime: '07:00' }
      },
      7,
      allow,
      fake
    )

    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(fake.calls).toEqual([])
  })
})

describe('updateBreakdown', () => {
  it('saves header changes locally without patching SAP', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          finishedAt: null,
          sapServiceCallId: null,
          workOrder: null,
          activities: []
        }) as never
    })

    const result = await updateBreakdown(
      'bd-1',
      {
        problem: 'Engine leak updated',
        hourMeter: '34080',
        remark: '',
        jobCategory: 'B',
        jobCode: 'JC-02',
        location: 'Workshop',
        operatorCode: '13516',
        mechanicLeaderCode: '13516',
        componentCode: 'CC-05',
        subComponentCode: 'CC05-1',
        damageCode: 'D-09',
        failureCauseCode: 'C-08',
        preparedBy: 'SUHRAWARDI'
      },
      allow,
      fake
    )

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['header'])
  })

  it('patches the existing SAP work order when asked', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          fleetUnitId: 56,
          finishedAt: null,
          sapServiceCallId: 501,
          workOrder: '265171',
          activities: []
        }) as never
    })

    const result = await updateBreakdown(
      'bd-1',
      {
        problem: 'Engine leak updated',
        hourMeter: '34080',
        remark: '',
        issueWorkOrder: true,
        jobCategory: 'B',
        jobCode: 'JC-02',
        location: 'Workshop',
        operatorCode: '13516',
        mechanicLeaderCode: '13516',
        assigneeCode: '1',
        componentCode: 'CC-05',
        subComponentCode: 'CC05-1',
        damageCode: 'D-09',
        failureCauseCode: 'C-08',
        preparedBy: 'SUHRAWARDI'
      },
      allow,
      fake
    )

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['patch', 'header'])
  })

  it('issues a SAP work order for a local breakdown when asked', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          fleetUnitId: 56,
          startedAt: new Date('2026-10-19T08:05:00'),
          finishedAt: null,
          sapServiceCallId: null,
          workOrder: null,
          activities: [
            {
              id: 'act-1',
              breakdownCode: 'B12',
              breakdownCodeName: 'WAIT PART',
              positionStatus: 'BD',
              startedAt: new Date('2026-10-19T08:05:00'),
              endedAt: null,
              details: 'Engine leak',
              technicianName: null,
              technicianQty: null
            }
          ]
        }) as never
    })

    const result = await updateBreakdown(
      'bd-1',
      {
        problem: 'Engine leak updated',
        hourMeter: '34080',
        remark: '',
        issueWorkOrder: true,
        jobCategory: 'B',
        jobCode: 'JC-02',
        location: 'Workshop',
        operatorCode: '13516',
        mechanicLeaderCode: '13516',
        assigneeCode: '1',
        componentCode: 'CC-05',
        subComponentCode: 'CC05-1',
        damageCode: 'D-09',
        failureCauseCode: 'C-08',
        preparedBy: 'SUHRAWARDI'
      },
      allow,
      fake
    )

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['service', 'activity', 'header', 'update-activity'])
    expect(fake.bodies.service?.U_MIS_LastOpUse).toBe('13516')
    expect(fake.bodies.service?.U_MIS_Mech1).toBe('13516')
    expect(fake.bodies.service?.AssigneeCode).toBe(1)
  })
})

describe('closeBreakdown', () => {
  const openRow = {
    id: 'bd-1',
    projectCode: '023C',
    startedAt: new Date('2026-10-19T08:05:00'),
    finishedAt: null,
    sapServiceCallId: null,
    workOrder: null,
    activities: []
  }

  it('requires a resolution', async () => {
    const fake = deps({ loadBreakdown: async () => ({ ...openRow, workOrder: '260001' }) as never })
    const result = await closeBreakdown('bd-1', '   ', '2026-10-19', '12:00', allow, fake)

    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(fake.calls).toEqual([])
  })

  it('rejects a close when the breakdown has no work order', async () => {
    const fake = deps({ loadBreakdown: async () => openRow as never })
    const result = await closeBreakdown('bd-1', 'hose replaced, unit RFU', '2026-10-19', '12:00', allow, fake)

    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(fake.calls).toEqual([])
  })

  it('rejects close when an activity has no end date/time', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          ...openRow,
          workOrder: '260001',
          activities: [
            {
              id: 'act-1',
              endedAt: null,
              startedAt: new Date('2026-10-19T08:05:00'),
              createdAt: new Date('2026-10-19T08:05:00')
            }
          ]
        }) as never
    })
    const result = await closeBreakdown('bd-1', 'hose replaced, unit RFU', '2026-10-19', '12:00', allow, fake)

    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(String((result as { error?: string }).error || '')).toMatch(/Finish every activity/i)
    expect(fake.calls).toEqual([])
  })

  it('saves the resolution locally and marks the row closed', async () => {
    const patches: Record<string, unknown>[] = []

    const fake = deps({
      loadBreakdown: async () =>
        ({
          ...openRow,
          workOrder: '260001',
          activities: [
            {
              id: 'act-1',
              endedAt: new Date('2026-10-19T11:00:00'),
              startedAt: new Date('2026-10-19T08:05:00'),
              createdAt: new Date('2026-10-19T08:05:00')
            }
          ]
        }) as never,
      patchCall: async (_id, body) => {
        patches.push(body)
      }
    })
    const result = await closeBreakdown('bd-1', 'hose replaced, unit RFU', '2026-10-19', '12:00', allow, fake)

    expect(result.ok).toBe(true)
    expect(patches).toEqual([])
    expect(fake.calls).toEqual(['closed'])
  })

  it('writes finish date, time, and resolution to the linked service call', async () => {
    const patches: Record<string, unknown>[] = []

    const fake = deps({
      loadBreakdown: async () =>
        ({
          ...openRow,
          workOrder: '245182038',
          sapServiceCallId: 194618,
          activities: [
            {
              id: 'act-1',
              endedAt: new Date('2026-10-19T11:00:00'),
              startedAt: new Date('2026-10-19T08:05:00'),
              createdAt: new Date('2026-10-19T08:05:00')
            }
          ]
        }) as never,
      patchCall: async (_id, body) => {
        patches.push(body)
      }
    })
    const result = await closeBreakdown('bd-1', 'hose replaced, unit RFU', '2026-10-19', '12:00', allow, fake)

    expect(result.ok).toBe(true)
    expect(patches[0]).toMatchObject({
      Status: -1,
      Resolution: 'hose replaced, unit RFU',
      U_MIS_EndWkDt: '2026-10-19',
      U_MIS_EndWkTm: '12:00:00'
    })
    expect(patches).toHaveLength(1)
    expect(fake.calls).toEqual(['closed'])
  })
})

describe('addBreakdownActivity', () => {
  it('saves a local activity without posting it to SAP', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          finishedAt: null,
          sapServiceCallId: null,
          workOrder: null,
          activities: []
        }) as never
    })

    const result = await addBreakdownActivity(
      'bd-1',
      { ...input.activity, details: 'inspect hose' },
      7,
      allow,
      fake
    )

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['save-activity'])
    expect(fake.bodies.activity).toBeNull()
  })

  it('posts the activity to SAP when the breakdown has a service call', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          finishedAt: null,
          sapServiceCallId: 501,
          workOrder: '265171',
          activities: []
        }) as never
    })

    const result = await addBreakdownActivity(
      'bd-1',
      { ...input.activity, details: 'inspect hose' },
      7,
      allow,
      fake
    )

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['activity', 'patch', 'save-activity'])
    expect(fake.bodies.activity).toMatchObject({ U_MIS_ActCode: 'B12', Details: 'inspect hose' })
  })

  it('rejects an end time before the start', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          finishedAt: null,
          sapServiceCallId: 501,
          workOrder: '265171',
          activities: []
        }) as never
    })

    const result = await addBreakdownActivity(
      'bd-1',
      {
        ...input.activity,
        details: 'check',
        endedDate: '2026-10-18',
        endedTime: '01:00'
      },
      7,
      allow,
      fake
    )

    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(fake.calls).toEqual([])
  })
})

describe('updateBreakdownActivity', () => {
  const openRow = {
    id: 'bd-1',
    projectCode: '023C',
    finishedAt: null,
    sapServiceCallId: null,
    workOrder: null,
    activities: [
      {
        id: 'act-1',
        sapActivityCode: null,
        positionStatus: 'BD',
        startedAt: new Date('2026-10-19T08:05:00'),
        createdAt: new Date('2026-10-19T08:05:00')
      }
    ]
  }

  it('updates a local activity without patching SAP', async () => {
    const fake = deps({ loadBreakdown: async () => openRow as never })

    const result = await updateBreakdownActivity(
      'bd-1',
      'act-1',
      { ...input.activity, details: 'hose replaced' },
      allow,
      fake
    )

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['update-activity'])
  })

  it('patches the linked SAP activity', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          ...openRow,
          sapServiceCallId: 501,
          workOrder: '265171',
          activities: [{ ...openRow.activities[0], sapActivityCode: 9001 }]
        }) as never
    })

    const result = await updateBreakdownActivity(
      'bd-1',
      'act-1',
      { ...input.activity, details: 'hose replaced' },
      allow,
      fake
    )

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['patch-activity', 'patch', 'update-activity'])
  })

  it('rejects an unknown activity', async () => {
    const fake = deps({ loadBreakdown: async () => openRow as never })
    const result = await updateBreakdownActivity('bd-1', 'missing', input.activity, allow, fake)

    expect(result).toMatchObject({ ok: false, status: 404 })
    expect(fake.calls).toEqual([])
  })
})

describe('deleteBreakdownActivity', () => {
  it('deletes a local activity without calling SAP', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          finishedAt: null,
          sapServiceCallId: null,
          workOrder: null,
          activities: [
            {
              id: 'act-1',
              sapActivityCode: null,
              positionStatus: 'BD',
              startedAt: new Date('2026-10-19T08:05:00'),
              createdAt: new Date('2026-10-19T08:05:00')
            }
          ]
        }) as never
    })
    const result = await deleteBreakdownActivity('bd-1', 'act-1', allow, fake)

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['remove-activity'])
  })

  it('deactivates the linked SAP activity', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          finishedAt: null,
          sapServiceCallId: 501,
          workOrder: '265171',
          activities: [
            {
              id: 'act-1',
              sapActivityCode: 9001,
              positionStatus: 'BD',
              startedAt: new Date('2026-10-19T08:05:00'),
              createdAt: new Date('2026-10-19T08:05:00')
            }
          ]
        }) as never
    })
    const result = await deleteBreakdownActivity('bd-1', 'act-1', allow, fake)

    expect(result).toEqual({ ok: true, data: { id: 'bd-1' } })
    expect(fake.calls).toEqual(['deactivate', 'remove-activity'])
  })

  it('rejects a closed breakdown', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          finishedAt: new Date('2026-10-19T12:00:00'),
          sapServiceCallId: null,
          workOrder: null,
          activities: [{ id: 'act-1', sapActivityCode: null, positionStatus: 'BD', startedAt: new Date(), createdAt: new Date() }]
        }) as never
    })
    const result = await deleteBreakdownActivity('bd-1', 'act-1', allow, fake)

    expect(result).toMatchObject({ ok: false, status: 409 })
    expect(fake.calls).toEqual([])
  })
})

describe('deleteBreakdown', () => {
  it('deletes a local open breakdown without SAP calls', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          finishedAt: null,
          cancelledAt: null,
          sapServiceCallId: null,
          workOrder: null,
          activities: []
        }) as never
    })
    const result = await deleteBreakdown('bd-1', allow, fake)

    expect(result).toEqual({ ok: true, data: { id: 'bd-1', cancelledSap: false } })
    expect(fake.calls).toEqual(['remove-breakdown'])
  })

  it('cancels linked SAP then deletes an open breakdown', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          finishedAt: null,
          cancelledAt: null,
          sapServiceCallId: 501,
          workOrder: '265171',
          activities: [
            {
              id: 'act-1',
              sapActivityCode: 9001,
              positionStatus: 'BD',
              startedAt: new Date('2026-10-19T08:05:00'),
              createdAt: new Date('2026-10-19T08:05:00')
            }
          ]
        }) as never
    })
    const result = await deleteBreakdown('bd-1', allow, fake)

    expect(result).toEqual({ ok: true, data: { id: 'bd-1', cancelledSap: true } })
    expect(fake.calls).toEqual(['deactivate', 'cancel', 'remove-breakdown'])
  })

  it('deletes a finished breakdown locally without SAP cleanup', async () => {
    const fake = deps({
      loadBreakdown: async () =>
        ({
          id: 'bd-1',
          projectCode: '023C',
          finishedAt: new Date('2026-10-19T12:00:00'),
          cancelledAt: null,
          sapServiceCallId: 501,
          workOrder: '265171',
          activities: [{ id: 'act-1', sapActivityCode: 9001, positionStatus: 'BD', startedAt: new Date(), createdAt: new Date() }]
        }) as never
    })
    const result = await deleteBreakdown('bd-1', allow, fake)

    expect(result).toEqual({ ok: true, data: { id: 'bd-1', cancelledSap: false } })
    expect(fake.calls).toEqual(['remove-breakdown'])
  })
})
