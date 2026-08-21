import { z } from 'zod'

import { CANNIBAL_REQUEST_ROLES } from '@/lib/cannibal/requestor-roles'
import { hasLogisticStatement, hasPlantStatement } from '@/lib/cannibal/pair-helpers'

const kanibalSideSchemaBase = z.object({
  fleetUnitId: z.coerce.number().int().positive().optional(),
  fleetEquipmentId: z.coerce.number().int().positive().optional(),
  date: z.coerce.date(),
  compDesc: z.string().trim().min(1).max(100),
  pn: z.string().trim().max(100).default(''),
  sn: z.string().trim().max(100).default(''),
  pos: z.string().trim().max(100).default(''),
  hmComp: z.coerce.number().int().min(0).default(0),
  idRep: z.coerce.number().int().positive().optional().nullable(),
  woNoKanibal: z.string().trim().max(30).optional().nullable(),
  woStatusKanibal: z.string().trim().max(100).default('OPEN')
})

export const kanibalSideSchema = kanibalSideSchemaBase.transform(({ fleetUnitId, fleetEquipmentId, ...rest }) => ({
  ...rest,
  fleetUnitId: fleetUnitId ?? fleetEquipmentId!
}))

export const kanibalPairSchema = z.object({
  remove: kanibalSideSchema,
  install: kanibalSideSchema
})

const kanibalLineSchemaBase = kanibalSideSchemaBase.extend({
  type: z.enum(['REMOVE', 'INSTALL'] as const),
  pairIndex: z.coerce.number().int().min(0).optional()
})

export const kanibalLineSchema = kanibalLineSchemaBase.transform(({ fleetUnitId, fleetEquipmentId, ...rest }) => ({
  ...rest,
  fleetUnitId: fleetUnitId ?? fleetEquipmentId!
}))

const plantJustificationFields = {
  plantP1UnitRfu: z.boolean().default(false),
  plantProductionReq: z.boolean().default(false),
  plantOther: z.boolean().default(false),
  plantOtherText: z.string().trim().max(200).default('')
}

const logisticJustificationFields = {
  logisticNoStock: z.boolean().default(false),
  logisticLeadTime: z.boolean().default(false),
  logisticLeadTimeDays: z.coerce.number().int().positive().optional().nullable(),
  logisticOther: z.boolean().default(false),
  logisticOtherText: z.string().trim().max(200).default('')
}

function refinePlantJustification<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const d = data as Record<string, unknown>
    if (!hasPlantStatement(d as Parameters<typeof hasPlantStatement>[0])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one Plant statement must be selected', path: ['plantP1UnitRfu'] })
    }
    if (d.plantOther && !String(d.plantOtherText ?? '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Plant Other text is required', path: ['plantOtherText'] })
    }
  })
}

function refineLogisticJustification<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const d = data as Record<string, unknown>
    if (!hasLogisticStatement(d as Parameters<typeof hasLogisticStatement>[0])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one Logistic statement must be selected', path: ['logisticNoStock'] })
    }
    if (d.logisticOther && !String(d.logisticOtherText ?? '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Logistic Other text is required', path: ['logisticOtherText'] })
    }
    if (d.logisticLeadTime && (!d.logisticLeadTimeDays || Number(d.logisticLeadTimeDays) <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lead time days is required when Lead Time Part is selected',
        path: ['logisticLeadTimeDays']
      })
    }
  })
}

const plantHeaderFields = {
  projectCode: z.string().trim().min(1).max(10),
  postingDate: z.coerce.date(),
  symptom: z.string().trim().optional().default(''),
  failure: z.string().trim().min(1),
  idCaused: z.preprocess(
    value => (value === '' || value == null ? null : value),
    z.coerce.number().int().positive().nullable().optional()
  ),
  causedOther: z.string().trim().max(100).default(''),
  idStatus: z.coerce.number().int().positive(),
  statusOther: z.string().trim().max(100).default(''),
  cannibalRequestRole: z.enum(CANNIBAL_REQUEST_ROLES),
  requestedBy: z.coerce.number().int().positive(),
  ...plantJustificationFields,
  pairs: z.array(kanibalPairSchema).length(1, 'One BA allows one component transfer only'),
  lines: z.array(kanibalLineSchema).min(1).optional()
}

const plantHeaderFieldsWithPlanning = {
  ...plantHeaderFields,
  idAction: z.coerce.number().int().positive(),
  mrNo: z.string().trim().max(30).optional().nullable(),
  prNo: z.string().trim().max(30).optional().nullable(),
  poNo: z.string().trim().max(30).optional().nullable()
}

const cannibalPlantCreateSchemaBase = z.object(plantHeaderFields).transform(data => {
  if (data.pairs?.length) return { ...data, lines: undefined }
  if (data.lines?.length) return data

  return data
})

export const cannibalPlantCreateSchema = refinePlantJustification(cannibalPlantCreateSchemaBase)
export const cannibalCreateSchema = cannibalPlantCreateSchema

export const cannibalPlantUpdateSchema = z
  .object(plantHeaderFieldsWithPlanning)
  .partial()
  .extend({
    pairs: z.array(kanibalPairSchema).length(1).optional(),
    lines: z.array(kanibalLineSchema).min(1).optional()
  })
  .superRefine((data, ctx) => {
    const d = data as Record<string, unknown>
    const plantKeys = Object.keys(plantJustificationFields)
    if (!plantKeys.some(key => d[key] !== undefined)) return

    if (!hasPlantStatement(d as Parameters<typeof hasPlantStatement>[0])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one Plant statement must be selected', path: ['plantP1UnitRfu'] })
    }
    if (d.plantOther && !String(d.plantOtherText ?? '').trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Plant Other text is required', path: ['plantOtherText'] })
    }
  })

export const cannibalLogisticUpdateSchema = refineLogisticJustification(z.object(logisticJustificationFields))

export const cannibalPlantStatementSchema = refinePlantJustification(z.object(plantJustificationFields))

/** Combined Record & Documentation before approval: planning action + MR/PR + WO + notes. */
export const cannibalExecutionUpdateSchema = z.object({
  idAction: z.coerce.number().int().positive(),
  mrNo: z.string().trim().max(30).optional().nullable(),
  prNo: z.string().trim().max(30).optional().nullable(),
  poNo: z.string().trim().max(30).optional().nullable(),
  executionNotes: z.preprocess(
    value => {
      if (value == null) return null
      const trimmed = String(value).trim()
      return trimmed || null
    },
    z.union([z.string().max(5000), z.null()])
  ),
  documentationComplete: z.boolean().optional().default(false),
  pairs: z.array(kanibalPairSchema).length(1, 'Satu BA hanya untuk satu komponen')
})

export const cannibalUpdateSchema = cannibalPlantUpdateSchema

export const cannibalPlanningUpdateSchema = z.object({
  idAction: z.coerce.number().int().positive(),
  mrNo: z.string().trim().max(30).optional().nullable(),
  prNo: z.string().trim().max(30).optional().nullable(),
  poNo: z.string().trim().max(30).optional().nullable()
})

export const baApprovalActionSchema = z.object({
  remark: z.string().trim().max(2000).optional().nullable()
})

export const cannibalRequestorRejectSchema = z.object({
  remark: z.string().trim().min(1, 'Reject remark is required').max(2000)
})

export type CannibalPlanningUpdateInput = z.infer<typeof cannibalPlanningUpdateSchema>
export type CannibalPlantCreateInput = z.infer<typeof cannibalPlantCreateSchema>
export type CannibalCreateInput = CannibalPlantCreateInput
export type CannibalPlantUpdateInput = z.infer<typeof cannibalPlantUpdateSchema>
export type CannibalUpdateInput = CannibalPlantUpdateInput
export type CannibalLogisticUpdateInput = z.infer<typeof cannibalLogisticUpdateSchema>
export type CannibalPlantStatementInput = z.infer<typeof cannibalPlantStatementSchema>
export type CannibalExecutionUpdateInput = z.infer<typeof cannibalExecutionUpdateSchema>
export type CannibalRequestorRejectInput = z.infer<typeof cannibalRequestorRejectSchema>
export type KanibalLineInput = z.infer<typeof kanibalLineSchema>
export type KanibalSideInput = z.infer<typeof kanibalSideSchema>
export type KanibalPairInput = z.infer<typeof kanibalPairSchema>
