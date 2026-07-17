import { z } from 'zod'

/** Self-service change password — requires current password; new password min 6 (same as register/users). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmNewPassword: z.string().min(1, 'Confirm password is required')
  })
  .refine(data => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords must match',
    path: ['confirmNewPassword']
  })
  .refine(data => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword']
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
