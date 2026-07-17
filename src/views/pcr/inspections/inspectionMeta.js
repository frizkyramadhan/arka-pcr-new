/**
 * Metadata inspection — mirror lib/inspection/types untuk halaman & drawer (JS).
 */

export const INSPECTION_TYPE_OPTIONS = [
  { code: 'FC', label: 'Filter Cut', slug: 'filter-cut', shortLabel: 'FC' },
  { code: 'MPS', label: 'Magnetic Plug', slug: 'magnetic', shortLabel: 'MPS' },
  { code: 'VI', label: 'Visual', slug: 'visual', shortLabel: 'VI' },
  { code: 'TA2', label: 'TA2', slug: 'ta2', shortLabel: 'TA2' },
  { code: 'ED', label: 'Electronic Data', slug: 'electronic', shortLabel: 'ED' }
]

export const INSPECTION_TYPE_LABELS = Object.fromEntries(
  INSPECTION_TYPE_OPTIONS.map(item => [item.code, item.label])
)

export const INSPECTION_TYPE_CODES = INSPECTION_TYPE_OPTIONS.map(item => item.code)

const slugMap = new Map(INSPECTION_TYPE_OPTIONS.map(item => [item.slug, item]))
const codeMap = new Map(INSPECTION_TYPE_OPTIONS.map(item => [item.code, item]))

export const getInspectionTypeBySlug = slug => slugMap.get(slug) ?? null

export const getInspectionTypeByCode = code => codeMap.get(code) ?? null

export const ALL_INSPECTIONS_SLUG = 'all'

export const isAllInspectionsSlug = slug => slug === ALL_INSPECTIONS_SLUG
