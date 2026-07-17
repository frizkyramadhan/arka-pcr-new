import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { isEmailTaken, normalizeEmailInput } from '@/lib/user-email'
import { userRegisterSchema } from '@/lib/validations/auth-register'

/**
 * Public registration — creates inactive user; login remains username + password after activation.
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = userRegisterSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { fullName, username, password } = parsed.data
  const email = normalizeEmailInput(parsed.data.email)

  const existingUsername = await prisma.user.findUnique({
    where: { username }
  })

  if (existingUsername) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 })
  }

  if (email && (await isEmailTaken(email))) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: passwordHash,
      fullName,
      isActive: false
    },
    select: {
      idUser: true,
      username: true,
      email: true,
      fullName: true,
      isActive: true,
      createdAt: true
    }
  })

  return NextResponse.json(
    {
      message: 'Registration successful. Your account is inactive until activated by an administrator.',
      user
    },
    { status: 201 }
  )
}
