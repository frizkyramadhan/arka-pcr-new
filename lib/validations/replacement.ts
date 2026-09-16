import { z } from 'zod'

import { OLDCORE_STATUSES, PREDICTION_OLDCORES } from '@/lib/replacement/close-requirements'

const emptyToNull = (val: unknown) => (val === '' ? null : val)

const oldcoreClassFields = {
  oldcoreStatus: z.preprocess(emptyToNull, z.enum(OLDCORE_STATUSES).optional().nullable()),
  predictionOldcore: z.preprocess(emptyToNull, z.enum(PREDICTION_OLDCORES).optional().nullable())
}

const replacementCreateSchemaBase = z.object({
  fleetUnitId: z.coerce.number().int().positive().optional(),
  fleetEquipmentId: z.coerce.number().int().positive().optional(),
  idMod: z.coerce.number().int().positive(),
  repDate: z.coerce.date(),
  hmRep: z.coerce.number().nonnegative(),
  lastHmRep: z.coerce.number().nonnegative().default(0),
  woNo: z.string().trim().max(30).optional().nullable(),
  woDate: z.coerce.date().optional().nullable(),
  woEndDate: z.coerce.date().optional().nullable(),
  mrNo: z.string().trim().max(30).optional().nullable(),
  prNo: z.string().trim().max(30).optional().nullable(),
  poNo: z.string().trim().max(30).optional().nullable(),
  returnOldcoreDate: z.coerce.date().optional().nullable(),
  spbBaReturnOldcore: z.string().trim().max(50).optional().nullable(),
  compHour: z.coerce.number().int().min(0).optional().nullable(),
  compCond: z.string().trim().max(1).default('A'),
  remarks: z.string().trim().max(5000).default('')
})

export const replacementCreateSchema = replacementCreateSchemaBase.transform(({ fleetUnitId, fleetEquipmentId, ...rest }) => ({
  ...rest,
  fleetUnitId: fleetUnitId ?? fleetEquipmentId!
}))

export const replacementUpdateSchema = replacementCreateSchemaBase
  .extend(oldcoreClassFields)
  .partial()
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field is required' })

export const replacementCloseSchema = z.object({
  closingHm: z.coerce.number().nonnegative(),
  woEndDate: z.coerce.date().optional(),
  mrNo: z.string().trim().max(30).optional().nullable(),
  prNo: z.string().trim().max(30).optional().nullable(),
  poNo: z.string().trim().max(30).optional().nullable(),
  returnOldcoreDate: z.coerce.date().optional().nullable(),
  spbBaReturnOldcore: z.string().trim().max(50).optional().nullable(),
  ...oldcoreClassFields
})

export type ReplacementCreateInput = z.infer<typeof replacementCreateSchema>

export type ReplacementUpdateInput = z.infer<typeof replacementUpdateSchema>

export type ReplacementCloseInput = z.infer<typeof replacementCloseSchema>
