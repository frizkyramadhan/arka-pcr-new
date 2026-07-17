import { z } from 'zod'

const optionalEmailSchema = z.preprocess(
  value => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.union([z.string().trim().email('Invalid email address').max(255), z.null()]).optional()
)

export const userCreateSchema = z.object({
  username: z.string().trim().min(3).max(50),
  email: optionalEmailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().trim().max(100).optional().nullable(),
  projectCodes: z.array(z.string().trim().min(1).max(10)).default([]),
  isActive: z.boolean().default(true),
  roleIds: z.array(z.coerce.number().int().positive()).default([])
})

const optionalPasswordSchema = z.preprocess(
  value => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(6, 'Password must be at least 6 characters').optional()
)

export const userUpdateSchema = z.object({
  username: z.string().trim().min(3).max(50).optional(),
  email: optionalEmailSchema,
  password: optionalPasswordSchema,
  fullName: z.string().trim().max(100).optional().nullable(),
  projectCodes: z.array(z.string().trim().min(1).max(10)).optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.coerce.number().int().positive()).optional()
})

export type UserCreateInput = z.infer<typeof userCreateSchema>

export type UserUpdateInput = z.infer<typeof userUpdateSchema>
