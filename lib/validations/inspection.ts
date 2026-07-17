import { z } from 'zod'

import { INSPECTION_TYPE_CODES } from '@/lib/inspection/types'

const ratingSchema = z.enum(['A', 'B', 'C', 'X'])

const inspectionCreateSchemaBase = z.object({
  fleetUnitId: z.coerce.number().int().positive().optional(),
  fleetEquipmentId: z.coerce.number().int().positive().optional(),
  idMod: z.coerce.number().int().positive(),
  type: z.enum(INSPECTION_TYPE_CODES as [string, ...string[]]),
  insDate: z.coerce.date(),
  insHm: z.coerce.number().int().nonnegative().optional().nullable(),
  rating: ratingSchema
})

export const inspectionCreateSchema = inspectionCreateSchemaBase.transform(({ fleetUnitId, fleetEquipmentId, ...rest }) => ({
  ...rest,
  fleetUnitId: fleetUnitId ?? fleetEquipmentId!
}))

export const inspectionUpdateSchema = inspectionCreateSchemaBase
  .partial()
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field is required' })

export type InspectionCreateInput = z.infer<typeof inspectionCreateSchema>

export type InspectionUpdateInput = z.infer<typeof inspectionUpdateSchema>
