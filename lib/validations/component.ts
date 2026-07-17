import { z } from 'zod'

export const componentSchema = z.object({
  compDesc: z.string().trim().min(1, 'Component description is required').max(50),
  compType: z.string().trim().max(50).optional().nullable(),
  status: z.enum(['Active', 'Inactive']).default('Active')
})

export const componentUpdateSchema = componentSchema.partial().refine(data => Object.keys(data).length > 0, {
  message: 'At least one field is required'
})

export type ComponentInput = z.infer<typeof componentSchema>
