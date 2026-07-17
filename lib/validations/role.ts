import { z } from 'zod'

export const roleCreateSchema = z.object({
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
  permissionIds: z.array(z.coerce.number().int().positive()).default([])
})

export const roleUpdateSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  description: z.string().trim().max(255).optional().nullable(),
  isActive: z.boolean().optional(),
  permissionIds: z.array(z.coerce.number().int().positive()).optional()
})

export type RoleCreateInput = z.infer<typeof roleCreateSchema>

export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>
