/** Service call fields copied back onto a breakdown. */
import { describe, expect, it } from 'vitest'

import { mapServiceCallInbound } from '@/lib/dmbd/sap-inbound'

const call = {
  Status: -3,
  Subject: 'short',
  Description: 'Engine low power',
  AssigneeCode: 147,
  U_MIS_HoursMeter: 8420,
  U_MIS_JobCtg: 'B',
  U_MIS_JobCode: 'JC-02',
  U_MIS_Location: 'Workshop',
  U_MIS_LastOpUse: '14967',
  U_MIS_Mech1: '16262',
  U_MIS_ComponentNo: 'CC-01',
  U_MIS_SubCompNo: 'CC01-02',
  U_MIS_Damage: 'D-10',
  U_MIS_FailCause: 'C-03',
  U_U_MIS_Prepared: 'Administrator',
  U_MIS_SerialNo: 'CNN008311',
  U_MIS_MalStartDt: '2026-10-21T00:00:00Z',
  U_MIS_MalStartTm: '22:30:00',
  Resolution: 'should stay off while open'
}

describe('mapServiceCallInbound', () => {
  it('copies the open service call and leaves finish empty', () => {
    const mapped = mapServiceCallInbound(call, [], {
      operatorName: 'HERI',
      mechanicLeaderName: 'WITO',
      failureCauseName: 'Worn'
    })

    expect(mapped.header.problem).toBe('Engine low power')
    expect(mapped.header.failureCauseCode).toBe('C-03')
    expect(mapped.header.failureCauseName).toBe('Worn')
    expect(mapped.header.operatorName).toBe('HERI')
    expect(mapped.header.assigneeUserId).toBe(147)
    expect(mapped.header.workOrderStatus).toBe('OPEN')
    expect(mapped.header.finishedAt).toBeNull()
    expect(mapped.header.resolution).toBeNull()
    expect(mapped.header.hourMeter).toBe(8420)
  })

  it('closes the breakdown from the SAP finish clock and resolution', () => {
    const mapped = mapServiceCallInbound(
      {
        ...call,
        Status: -1,
        Resolution: 'hose replaced',
        U_MIS_EndWkDt: '2026-10-22T00:00:00Z',
        U_MIS_EndWkTm: '06:55:00'
      },
      [
        {
          ActivityCode: 186032,
          Details: 'Cek kompresi',
          StartDate: '2026-10-22T00:00:00Z',
          StartTime: '06:40:00',
          EndDueDate: '2026-10-22T00:00:00Z',
          EndTime: '06:55:00',
          U_MIS_ActCode: 'B0',
          U_U_MIS_StatPos: 'BD',
          U_MIS_Technician: 'HERI HERI'
        }
      ],
      { activityNames: { B0: 'BREAKDOWN PROGRESS' } }
    )

    expect(mapped.header.workOrderStatus).toBe('CLOSE')
    expect(mapped.header.resolution).toBe('hose replaced')
    expect(mapped.header.finishedAt).toEqual(new Date('2026-10-22T06:55:00'))
    expect(mapped.activities[0]).toMatchObject({
      sapActivityCode: 186032,
      breakdownCodeName: 'BREAKDOWN PROGRESS',
      endedAt: new Date('2026-10-22T06:55:00'),
      technicianName: 'HERI'
    })
  })
})
