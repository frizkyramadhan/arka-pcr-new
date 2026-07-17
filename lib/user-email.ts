import { prisma } from '@/lib/prisma'

/** Returns true if another user already uses this email (case-insensitive). */
export async function isEmailTaken(email: string, excludeUserId?: number): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return false

  const existing = await prisma.user.findFirst({
    where: {
      email: normalized,
      ...(excludeUserId != null ? { idUser: { not: excludeUserId } } : {})
    },
    select: { idUser: true }
  })

  return Boolean(existing)
}

export function normalizeEmailInput(email: string | null | undefined): string | null {
  if (email == null) return null
  const trimmed = email.trim()

  return trimmed === '' ? null : trimmed.toLowerCase()
}
