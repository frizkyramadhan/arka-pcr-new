import { z } from 'zod'

import { INSPECTION_TYPE_CODES } from '@/lib/inspection/types'

const ratingSchema = z.enum(['A', 'B', 'C', 'X'])

/** Accept null/empty/decimals; store as int (rounded). No min/max range. */
const optionalInsHmSchema = z.preprocess(value => {
  if (value === '' || value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return value

  return Math.round(n)
}, z.number().int().nullable().optional())

const inspectionCreateSchemaBase = z.object({
  fleetUnitId: z.coerce.number().int().positive().optional(),
  fleetEquipmentId: z.coerce.number().int().positive().optional(),
  idMod: z.coerce.number().int().positive(),
  type: z.enum(INSPECTION_TYPE_CODES as [string, ...string[]]),
  insDate: z.coerce.date(),
  insHm: optionalInsHmSchema,
  rating: ratingSchema
})

export const inspectionCreateSchema = inspectionCreateSchemaBase
  .transform(({ fleetUnitId, fleetEquipmentId, ...rest }) => ({
    ...rest,
    fleetUnitId: fleetUnitId ?? fleetEquipmentId!
  }))
  .superRefine((data, ctx) => {
    if (!Number.isFinite(data.fleetUnitId) || data.fleetUnitId <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fleetUnitId is required',
        path: ['fleetUnitId']
      })
    }
  })

export const inspectionUpdateSchema = inspectionCreateSchemaBase
  .partial()
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field is required' })

export type InspectionCreateInput = z.infer<typeof inspectionCreateSchema>

export type InspectionUpdateInput = z.infer<typeof inspectionUpdateSchema>
