export const KANIBAL_TYPES = ['REMOVE', 'INSTALL'] as const



export type KanibalType = (typeof KANIBAL_TYPES)[number]



export const BA_STATUS = [

  'DRAFT',

  'PENDING_LOGISTICS',

  'SUBMITTED',

  'OPEN',

  'APPROVED',

  'REJECTED',

  'CLOSED',

  'CANCELLED'

] as const



export type BaStatus = (typeof BA_STATUS)[number]



import {
  CANNIBAL_BA_APPROVAL_CHAIN,
  getChainLevelOrder,
  type CannibalBaApprovalLevel
} from '@/lib/approval/registry'

/** Sequential cannibal approval levels — derived dari approval registry. */
export const BA_APPROVAL_LEVELS = getChainLevelOrder(CANNIBAL_BA_APPROVAL_CHAIN) as readonly CannibalBaApprovalLevel[]

export type BaApprovalLevel = CannibalBaApprovalLevel

/** Document type stored on ba_approval — PCR uses pcr_forecast_approval separately today. */
export const BA_APPROVAL_DOCUMENT_TYPES = ['CANNIBAL', 'FORECAST_PCR'] as const

export type BaApprovalDocumentType = (typeof BA_APPROVAL_DOCUMENT_TYPES)[number]

export const BA_APPROVAL_DOCUMENT_CANNIBAL: BaApprovalDocumentType = 'CANNIBAL'



/** Plant may edit header, failure, plant statement, component status, pairs. */

export const PLANT_EDITABLE_STATUSES: BaStatus[] = ['DRAFT', 'REJECTED']



/** Logistics may fill statement while BA waits for logistic confirm. */

export const LOGISTIC_EDITABLE_STATUSES: BaStatus[] = ['PENDING_LOGISTICS']



export const EDITABLE_BA_STATUSES: BaStatus[] = [...PLANT_EDITABLE_STATUSES]



/** Submit to approval after logistic confirmation. */

export const SUBMITTABLE_BA_STATUSES: BaStatus[] = ['PENDING_LOGISTICS']



/** Plant updates WO & documentation after full approval. */

export const EXECUTION_EDITABLE_STATUSES: BaStatus[] = ['APPROVED']



/** @deprecated Legacy L1/L2/L3 codes from old workflow. */

export const LEGACY_BA_APPROVAL_LEVELS = ['L1', 'L2', 'L3'] as const


