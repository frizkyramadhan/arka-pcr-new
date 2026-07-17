/**
 * Self-service change password for the logged-in user.
 * Verifies current password, then updates hash on User.password (bcrypt cost 10).
 */
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/utils/api-auth'
import { changePasswordSchema } from '@/lib/validations/auth-change-password'

export async function POST(request: NextRequest) {
  const session = await requireSession(request)
  if (session instanceof NextResponse) return session

  const idUser = Number(session.user.id)
  if (!idUser || Number.isNaN(idUser)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = changePasswordSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({
    where: { idUser },
    select: { idUser: true, password: true, isActive: true }
  })

  if (!user || !user.isActive) {
    return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { idUser },
    data: { password: passwordHash }
  })

  return NextResponse.json({ message: 'Password changed successfully' })
}
