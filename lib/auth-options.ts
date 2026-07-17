import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

import { prisma } from '@/lib/prisma'
import { getUserRolesAndPermissions } from '@/lib/rbac/defaults'
import { ensureUserProjectsFromLegacy, getUserProjectCodes } from '@/lib/rbac/user-projects'

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const username = credentials?.username
        const password = credentials?.password

        if (!username || !password) return null

        const user = await prisma.user.findUnique({
          where: { username }
        })

        if (!user) return null

        // Login uses username + password only; inactive accounts must be activated by admin.
        if (!user.isActive) return null

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        await prisma.user.update({
          where: { idUser: user.idUser },
          data: { lastLogin: new Date() }
        })

        const { roleNames, permissions } = await getUserRolesAndPermissions(user.idUser)
        const projectCodes = await ensureUserProjectsFromLegacy(user.idUser)

        return {
          id: String(user.idUser),
          name: user.fullName ?? user.username,
          projectCodes,
          roles: roleNames,
          permissions
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (token.sub) {
        const idUser = Number(token.sub)
        if (!Number.isNaN(idUser)) {
          const projectCodes = await getUserProjectCodes(idUser)
          const { roleNames, permissions } = await getUserRolesAndPermissions(idUser)

          token.projectCodes = projectCodes
          token.roles = roleNames
          token.permissions = permissions
        }
      }

      if (user) {
        token.projectCodes = (user as { projectCodes?: string[] }).projectCodes ?? []
        token.roles = (user as { roles?: string[] }).roles ?? []
        token.permissions = (user as { permissions?: string[] }).permissions ?? []
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ''
        session.user.projectCodes = (token.projectCodes as string[]) ?? []
        session.user.roles = (token.roles as string[]) ?? []
        session.user.permissions = (token.permissions as string[]) ?? []
      }

      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt'
  }
}
