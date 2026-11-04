/**
 * SAP B1 env helpers used when a breakdown issues a work order.
 */
import { afterEach, describe, expect, it } from 'vitest'

import { getSapB1ServiceCallSeriesYear } from '@/lib/sap-b1/config'

describe('getSapB1ServiceCallSeriesYear', () => {
  const previous = process.env.SAP_B1_SERVICE_CALL_SERIES_YEAR

  afterEach(() => {
    if (previous === undefined) delete process.env.SAP_B1_SERVICE_CALL_SERIES_YEAR
    else process.env.SAP_B1_SERVICE_CALL_SERIES_YEAR = previous
  })

  it('uses the configured year while the old company database is connected', () => {
    process.env.SAP_B1_SERVICE_CALL_SERIES_YEAR = '2024'

    expect(getSapB1ServiceCallSeriesYear(2026)).toBe(2024)
  })

  it('follows the document year when the override is empty', () => {
    process.env.SAP_B1_SERVICE_CALL_SERIES_YEAR = ''

    expect(getSapB1ServiceCallSeriesYear(2026)).toBe(2026)
  })
})
