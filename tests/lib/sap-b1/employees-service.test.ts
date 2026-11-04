/** Unit tests for EmployeesInfo mapping and OData filter builders. */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/sap-b1/session', () => ({
  sapB1AuthorizedJson: vi.fn(),
  sapB1AuthorizedFetch: vi.fn()
}))

import {
  buildEmployeeListFilter,
  createEmployee,
  hasEmployeeListFilter,
  listEmployees,
  mapEmployeeRow,
  updateEmployee
} from '@/lib/sap-b1/employees-service'
import { sapB1AuthorizedFetch, sapB1AuthorizedJson } from '@/lib/sap-b1/session'

describe('mapEmployeeRow', () => {
  it('maps NIK, mechanic, and record status fields', () => {
    expect(
      mapEmployeeRow({
        EmployeeID: 42,
        FirstName: 'HERI',
        LastName: 'HERI',
        JobTitle: 'Operator',
        Position: 41,
        Branch: 6,
        Department: 13,
        U_MIS_NIK: '13516',
        U_MIS_IsMechanic: 'N',
        U_MIS_RecordSt: 'A',
        U_MIS_EmpCategory: 'ST'
      })
    ).toEqual({
      employeeId: 42,
      firstName: 'HERI',
      middleName: '',
      lastName: 'HERI',
      displayName: 'HERI',
      nik: '13516',
      branch: 6,
      department: 13,
      position: 41,
      empCategory: 'ST',
      isMechanic: 'N',
      recordStatus: 'A',
      jobTitle: 'Operator'
    })
  })

  it('returns null without a valid EmployeeID', () => {
    expect(mapEmployeeRow({ FirstName: 'X' })).toBeNull()
  })
})

describe('buildEmployeeListFilter', () => {
  it('builds search + branch + position + status clauses', () => {
    expect(
      buildEmployeeListFilter({
        q: "O'Neil",
        branch: 6,
        position: 41,
        empCategory: 'HO',
        isMechanic: 'Y',
        recordStatus: 'A'
      })
    ).toBe(
      "(contains(FirstName,'O''Neil') or contains(MiddleName,'O''Neil') or contains(LastName,'O''Neil') or contains(U_MIS_NIK,'O''Neil')) and Branch eq 6 and Position eq 41 and U_MIS_EmpCategory eq 'HO' and U_MIS_IsMechanic eq 'Y' and U_MIS_RecordSt eq 'A'"
    )
  })

  it('returns empty string when no filters', () => {
    expect(buildEmployeeListFilter({})).toBe('')
  })
})

describe('hasEmployeeListFilter', () => {
  it('is false when empty and true with position or status', () => {
    expect(hasEmployeeListFilter({})).toBe(false)
    expect(hasEmployeeListFilter({ position: 41 })).toBe(true)
    expect(hasEmployeeListFilter({ recordStatus: 'D' })).toBe(true)
  })
})

describe('listEmployees', () => {
  beforeEach(() => {
    vi.mocked(sapB1AuthorizedFetch).mockReset()
  })

  it('maps page rows and reserves another page when SAP omits count', async () => {
    vi.mocked(sapB1AuthorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: '200',
      headers: {},
      _body: '',
      json: async () => ({
        value: [
          {
            EmployeeID: 1,
            FirstName: 'A',
            LastName: 'B',
            U_MIS_NIK: '1',
            U_MIS_IsMechanic: 'Y',
            U_MIS_RecordSt: 'A',
            Branch: 1,
            Department: 4
          }
        ]
      }),
      clone: () => null as never
    })

    const result = await listEmployees({ page: 0, pageSize: 1 })

    expect(result.data).toHaveLength(1)
    expect(result.data[0].nik).toBe('1')
    // Full page without @odata.count → allow Next (skip + len + pageSize), not skip+len+1
    expect(result.total).toBe(2)
    expect(sapB1AuthorizedFetch).toHaveBeenCalledOnce()
  })

  it('uses odata-count header when body count is missing', async () => {
    vi.mocked(sapB1AuthorizedFetch).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: '200',
      headers: { 'odata-count': '120' },
      _body: '',
      json: async () => ({
        value: [
          {
            EmployeeID: 1,
            FirstName: 'A',
            LastName: 'B',
            U_MIS_NIK: '1',
            U_MIS_IsMechanic: 'N',
            U_MIS_RecordSt: 'D',
            Branch: 1,
            Department: 4
          }
        ]
      }),
      clone: () => null as never
    })

    const result = await listEmployees({ page: 0, pageSize: 25 })

    expect(result.total).toBe(120)
    expect(result.data[0].recordStatus).toBe('D')
  })
})

describe('createEmployee / updateEmployee validation', () => {
  beforeEach(() => {
    vi.mocked(sapB1AuthorizedJson).mockReset()
  })

  it('rejects create without NIK', async () => {
    await expect(
      createEmployee({
        firstName: 'Test',
        nik: '',
        branch: 1,
        department: 4,
        isMechanic: 'N',
        recordStatus: 'A'
      })
    ).rejects.toThrow('NIK is required')
  })

  it('patches EmployeesInfo on update after NIK check', async () => {
    vi.mocked(sapB1AuthorizedJson)
      .mockResolvedValueOnce({ value: [{ EmployeeID: 7, U_MIS_NIK: '999' }] })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        EmployeeID: 7,
        FirstName: 'Updated',
        LastName: 'Name',
        U_MIS_NIK: '999',
        U_MIS_IsMechanic: 'Y',
        U_MIS_RecordSt: 'A',
        Branch: 6,
        Department: 4,
        JobTitle: ''
      })

    const row = await updateEmployee(7, {
      firstName: 'Updated',
      lastName: 'Name',
      nik: '999',
      branch: 6,
      department: 4,
      isMechanic: 'Y',
      recordStatus: 'A'
    })

    expect(row.employeeId).toBe(7)
    expect(row.firstName).toBe('Updated')
    expect(vi.mocked(sapB1AuthorizedJson).mock.calls[1][0]).toBe('/EmployeesInfo(7)')
    expect(vi.mocked(sapB1AuthorizedJson).mock.calls[1][1]).toMatchObject({ method: 'PATCH' })
  })
})
