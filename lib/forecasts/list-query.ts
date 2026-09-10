/**
 * Parse GET /api/forecasts list filters — shared by the grid and Excel export.
 */
import type { ForecastListFilters } from '@/lib/forecasts/service'

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null
  const n = Number(value)

  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Number as shown on the forecast grid: id-ID thousands (18.000, 4.487) or decimal (24.9).
 */
export function parseForecastNumericFilter(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null
  const text = raw.replace('%', '').trim()
  if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    const grouped = Number(text.replace(/\./g, ''))

    return Number.isFinite(grouped) ? grouped : null
  }

  const plain = Number(text.replace(',', '.'))

  return Number.isFinite(plain) ? plain : null
}

function resolvePlanPeriod(searchParams: URLSearchParams): string | null {
  const planMonth = emptyToNull(searchParams.get('planMonth'))
  const planPeriod = emptyToNull(searchParams.get('planPeriod'))

  if (planMonth && /^\d{4}-\d{2}$/.test(planMonth)) {
    return `${planMonth}-01`
  }

  if (!planPeriod) return null

  return /^\d{4}-\d{2}$/.test(planPeriod) ? `${planPeriod}-01` : planPeriod
}

export function parseForecastListQuery(searchParams: URLSearchParams): ForecastListFilters {
  const status = emptyToNull(searchParams.get('status'))
  const isWarrantyRaw = emptyToNull(searchParams.get('isWarranty'))

  return {
    projectCode: emptyToNull(searchParams.get('projectCode')),
    quarter: emptyToNull(searchParams.get('quarter')),
    planPeriod: resolvePlanPeriod(searchParams),
    status: status === 'WARRANTY' ? null : status,
    baPcrStatus: emptyToNull(searchParams.get('baPcrStatus')),
    fleetUnitId: parsePositiveInt(searchParams.get('fleetUnitId') ?? searchParams.get('fleetEquipmentId')),
    idMod: parsePositiveInt(searchParams.get('idMod')),
    search: emptyToNull(searchParams.get('search') ?? searchParams.get('q')),
    modelName: emptyToNull(searchParams.get('modelName')),
    unitNo: emptyToNull(searchParams.get('unitNo')),
    compDesc: emptyToNull(searchParams.get('compDesc')),
    hmComponent: parseForecastNumericFilter(searchParams.get('hmComponent')),
    policy: parseForecastNumericFilter(searchParams.get('policy')),
    lifePercent: parseForecastNumericFilter(searchParams.get('lifePercent')),
    ratingSos: emptyToNull(searchParams.get('ratingSos')),
    ratingCbm: emptyToNull(searchParams.get('ratingCbm')),
    isWarranty: status === 'WARRANTY' ? true : isWarrantyRaw === '1' ? true : isWarrantyRaw === '0' ? false : null
  }
}
