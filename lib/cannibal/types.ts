export const KANIBAL_TYPES = ['REMOVE', 'INSTALL'] as const



export type KanibalType = (typeof KANIBAL_TYPES)[number]



export const BA_STATUS = [

  'DRAFT',

  'PENDING_REQUESTOR',

  'PENDING_LOGISTICS',

  'PENDING_DOCUMENT',

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



/** Submit to approval after record & documentation (MR/PR + WO) is complete. */

export const SUBMITTABLE_BA_STATUSES: BaStatus[] = ['PENDING_DOCUMENT']



/** Plant fills WO & documentation after logistics, before approval. */

export const EXECUTION_EDITABLE_STATUSES: BaStatus[] = ['PENDING_DOCUMENT']



/** Close BA after full approval (execution data usually already complete). */

export const CLOSEABLE_BA_STATUSES: BaStatus[] = ['APPROVED']



/** @deprecated Legacy L1/L2/L3 codes from old workflow. */

export const LEGACY_BA_APPROVAL_LEVELS = ['L1', 'L2', 'L3'] as const


