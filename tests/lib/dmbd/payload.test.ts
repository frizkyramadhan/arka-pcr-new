/**
 * SAP payload shape for a breakdown work order and its activities.
 */
import { describe, expect, it } from 'vitest'

import {
  activityNotes,
  appendServiceCallActivity,
  buildActivityBody,
  buildCloseServiceCallBody,
  buildServiceCallBody,
  sapClock,
  serviceCallSeriesName
} from '@/lib/dmbd/payload'

const started = sapClock('2026-10-19', '08:05')!
const ended = sapClock('2026-10-19', '10:15:00')!

describe('breakdown payloads', () => {
  it('puts the position on the service call as a single U_ field', () => {
    const body = buildServiceCallBody({
      cardCode: 'CARAPIDR01',
      series: 3830,
      problem: 'Engine leak',
      projectCode: '023C',
      unitNo: 'RD 056',
      modelNo: '773E',
      hourMeter: 34073,
      serialNo: 'FKR1',
      woDate: '2026-10-21',
      jobCategory: 'B',
      jobCode: 'JC-02',
      location: 'Workshop',
      operatorCode: '13516',
      mechanicLeaderCode: '13516',
      componentCode: 'CC-11',
      subComponentCode: 'CC11-1',
      damageCode: 'D-09',
      failureCauseCode: 'C-08',
      preparedBy: 'ARIE',
      assignee: 93,
      position: 'BD',
      started
    })

    expect(body.U_MIS_StatPos).toBe('BD')
    expect(body.U_U_MIS_StatPos).toBeUndefined()
    expect(body.Status).toBe(-3)
    expect(body.Series).toBe(3830)
    expect(body.CustomerCode).toBe('CARAPIDR01')
    expect(body.U_MIS_MalStartDt).toBe('2026-10-19')
    expect(body.U_MIS_MalStartTm).toBe('08:05:00')
    expect(body.U_MIS_WODate).toBe('2026-10-21')
    expect(body.U_MIS_StartWkDt).toBe('2026-10-19')
    expect(body.U_MIS_StartWkTm).toBe('08:05:00')
    expect(body.U_MIS_JobCtg).toBe('B')
    expect(body.U_MIS_LastOpUse).toBe('13516')
    expect(body.U_MIS_Mech1).toBe('13516')
    expect(body.U_U_MIS_Prepared).toBe('ARIE')
    expect(body.AssigneeCode).toBe(93)
    expect(body.U_MIS_KiloMeter).toBeUndefined()
    expect(body.U_MIS_HmChange).toBeUndefined()
    expect(body.U_MIS_WONo).toBeUndefined()
  })

  it('names the service-call series from the year and the project site number', () => {
    expect(serviceCallSeriesName('023C', 2026)).toBe('2026-023')
    expect(serviceCallSeriesName('017C', 2024)).toBe('2024-017')
    expect(serviceCallSeriesName('8C', 2026)).toBe('2026-008')
    expect(serviceCallSeriesName('HEAD', 2026)).toBeNull()
  })

  it('writes the finish clock as the header end-work date and time', () => {
    const body = buildCloseServiceCallBody('hose replaced', ended)

    expect(body.U_MIS_EndWkDt).toBe('2026-10-19')
    expect(body.U_MIS_EndWkTm).toBe('10:15:00')
    expect(body.Status).toBe(-1)
  })

  it('puts the activity position on the double-prefixed field and composes notes', () => {
    const body = buildActivityBody({
      cardCode: 'CARAPIDR01',
      serviceCallId: 50907,
      workOrder: 265171648,
      activityCode: 'B12',
      activityName: 'WAIT PART',
      position: 'BD',
      details: 'waiting hose',
      started,
      ended,
      technicianName: 'Andi',
      technicianQty: 2,
      handledBy: 139
    })

    expect(body.U_U_MIS_StatPos).toBe('BD')
    expect(body.U_MIS_StatPos).toBeUndefined()
    expect(body.U_MIS_ActCat).toBe('WO')
    expect(body.ParentObjectType).toBe('191')
    expect(body.ParentObjectId).toBe(50907)
    expect(body.U_MIS_WoNo).toBe(265171648)
    expect(body.Notes).toBe(activityNotes({
      code: 'B12',
      name: 'WAIT PART',
      details: 'waiting hose',
      started,
      ended
    }))
    expect(body.Notes).toContain('19.10.2026 08:05- 19.10.2026 10:15')
    expect(body.EndTime).toBe('10:15:00')
  })

  it('omits the activity end when the user did not enter one', () => {
    const body = buildActivityBody({
      cardCode: 'CARAPIDR01',
      serviceCallId: 1,
      workOrder: 2,
      activityCode: 'B0',
      activityName: 'GENERAL',
      position: 'OP',
      details: 'running',
      started,
      ended: null,
      technicianName: null,
      technicianQty: null,
      handledBy: null
    })

    expect(body.EndTime).toBeUndefined()
    expect(body.EndDueDate).toBeUndefined()
  })

  it('closes the work order with the resolution text', () => {
    expect(buildCloseServiceCallBody('unit ready', started)).toMatchObject({
      Status: -1,
      Resolution: 'unit ready',
      ClosingDate: '2026-10-19'
    })
  })
})

describe('appendServiceCallActivity', () => {
  it('adds the activity as the next line on the service call', () => {
    expect(appendServiceCallActivity([{ LineNum: 0, ActivityCode: 10, U_MIS_TeknisiQty: 1 }], 20)).toEqual([
      { LineNum: 0, ActivityCode: 10, U_MIS_TeknisiQty: 1 },
      { LineNum: 1, ActivityCode: 20 }
    ])
  })

  it('does nothing when the activity is already listed', () => {
    expect(appendServiceCallActivity([{ LineNum: 0, ActivityCode: 20 }], 20)).toBeNull()
  })
})
