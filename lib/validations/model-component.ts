import { z } from 'zod'

export const modelComponentSchema = z.object({
  fleetModelId: z.coerce.number().int().positive(),
  idComp: z.coerce.number().int().positive(),
  policy: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().nonnegative().optional().nullable(),
  lifeType: z.enum(['Hour', 'Calendar']).optional().nullable()
})

export const modelComponentUpdateSchema = z.object({
  idComp: z.coerce.number().int().positive().optional(),
  policy: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().nonnegative().optional().nullable(),
  lifeType: z.enum(['Hour', 'Calendar']).optional().nullable()
})

export type ModelComponentInput = z.infer<typeof modelComponentSchema>
