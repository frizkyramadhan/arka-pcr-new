import { normalizeUnitNo } from './normalize-unit-no'

/** Normalize model name / model_no for legacy ↔ Fleet matching. */
export function normalizeModelKey(value: string | null | undefined): string {
  return normalizeUnitNo(value).replace(/[^A-Z0-9]/g, '')
}

/** Composite key when manufacture helps disambiguate duplicate model names. */
export function normalizeModelManufactureKey(
  modelName: string | null | undefined,
  manufacture: string | null | undefined
): string {
  return `${normalizeModelKey(modelName)}|${normalizeModelKey(manufacture)}`
}
