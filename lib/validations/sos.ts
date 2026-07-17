import { z } from 'zod'

import { normalizeEvalCodeForStorage, SOS_EVAL_OPTIONS } from '@/lib/ratings'

const optionalNumber = z.coerce.number().optional().nullable()
const optionalString = z.string().trim().max(200).optional().nullable()

const sosLabFieldsSchema = z.object({
  labName: optionalString,
  labNo: z.string().trim().max(50).optional().nullable(),
  oilType: z.string().trim().max(100).optional().nullable(),
  hOil: z.coerce.number().int().optional().nullable(),
  hUnit: z.coerce.number().int().optional().nullable(),
  evalCode: z.preprocess(
    value => (typeof value === 'string' ? normalizeEvalCodeForStorage(value) : value),
    z.enum(SOS_EVAL_OPTIONS).optional().nullable()
  ),
  recommendation: z.string().trim().max(5000).optional().nullable(),
  oilChange: z.coerce.boolean().optional().nullable(),
  oilAdded: optionalNumber,
  fe: optionalNumber,
  cu: optionalNumber,
  cr: optionalNumber,
  si: optionalNumber,
  al: optionalNumber,
  ni: optionalNumber,
  sn: optionalNumber,
  pb: optionalNumber,
  pq: optionalNumber,
  soot: optionalNumber,
  oxid: optionalNumber,
  nitr: optionalNumber,
  sox: optionalNumber,
  p4um: optionalNumber,
  p6um: optionalNumber,
  p14um: optionalNumber,
  p15um: optionalNumber,
  iso4406: z.string().trim().max(20).optional().nullable(),
  iso14: z.string().trim().max(20).optional().nullable(),
  iso6: z.string().trim().max(20).optional().nullable(),
  ca: optionalNumber,
  zn: optionalNumber,
  mo: optionalNumber,
  bo: optionalNumber,
  p: optionalNumber,
  na: optionalNumber,
  k: optionalNumber,
  mg: optionalNumber,
  visc: optionalNumber,
  tbn: optionalNumber,
  tan: optionalNumber,
  gly: optionalNumber,
  water: optionalNumber,
  dilution: optionalNumber
})

const sosCreateSchemaBase = sosLabFieldsSchema.extend({
  fleetUnitId: z.coerce.number().int().positive().optional(),
  fleetEquipmentId: z.coerce.number().int().positive().optional(),
  idMod: z.coerce.number().int().positive(),
  sampleDate: z.coerce.date(),
  type: z.string().trim().max(10).default('SOS')
})

export const sosCreateSchema = sosCreateSchemaBase
  .transform(({ fleetUnitId, fleetEquipmentId, ...rest }) => ({
    ...rest,
    fleetUnitId: fleetUnitId ?? fleetEquipmentId!,
    oilAdded: rest.oilChange ? rest.oilAdded ?? null : null
  }))

export const sosUpdateSchema = sosCreateSchemaBase
  .partial()
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field is required' })

export type SosCreateInput = z.infer<typeof sosCreateSchema>

export type SosUpdateInput = z.infer<typeof sosUpdateSchema>
