export type InspectionTypeCode = 'FC' | 'MPS' | 'VI' | 'TA2' | 'ED'

export type InspectionTypeMeta = {
  code: InspectionTypeCode
  label: string
  slug: string
}

export const INSPECTION_TYPES: InspectionTypeMeta[] = [
  { code: 'FC', label: 'Filter Cut', slug: 'filter-cut' },
  { code: 'MPS', label: 'Magnetic Plug', slug: 'magnetic' },
  { code: 'VI', label: 'Visual', slug: 'visual' },
  { code: 'TA2', label: 'TA2', slug: 'ta2' },
  { code: 'ED', label: 'Electronic Data', slug: 'electronic' }
]

const slugMap = new Map(INSPECTION_TYPES.map(item => [item.slug, item]))
const codeMap = new Map(INSPECTION_TYPES.map(item => [item.code, item]))

export function getInspectionTypeBySlug(slug: string): InspectionTypeMeta | null {
  return slugMap.get(slug) ?? null
}

export function getInspectionTypeByCode(code: string): InspectionTypeMeta | null {
  return codeMap.get(code as InspectionTypeCode) ?? null
}

export const INSPECTION_TYPE_CODES = INSPECTION_TYPES.map(item => item.code)
