import { z } from 'zod'

const optionalEmailSchema = z.preprocess(
  value => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.union([z.string().trim().email('Invalid email address').max(255), z.null()]).optional()
)

/** Public self-registration — account created inactive until admin activates. */
export const userRegisterSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(50),
  email: optionalEmailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export type UserRegisterInput = z.infer<typeof userRegisterSchema>
