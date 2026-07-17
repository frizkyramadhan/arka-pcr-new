import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    projectCodes: string[]
    roles: string[]
    permissions: string[]
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      projectCodes: string[]
      roles: string[]
      permissions: string[]
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    projectCodes?: string[]
    roles?: string[]
    permissions?: string[]
  }
}
