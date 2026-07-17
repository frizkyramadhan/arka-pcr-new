import { z } from 'zod'

export const permissionCreateSchema = z.object({
  code: z.string().trim().min(3).max(100),
  description: z.string().trim().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
  roleIds: z.array(z.coerce.number().int().positive()).default([])
})

export const permissionUpdateSchema = z.object({
  code: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(255).optional().nullable(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.coerce.number().int().positive()).optional()
})

export type PermissionCreateInput = z.infer<typeof permissionCreateSchema>

export type PermissionUpdateInput = z.infer<typeof permissionUpdateSchema>
