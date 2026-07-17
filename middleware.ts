import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

function isAclEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ACL_ENABLED ?? process.env.ACL_ENABLED

  if (raw === undefined || raw === '') {
    return true
  }

  const normalized = String(raw).trim().toLowerCase()

  return normalized !== 'false' && normalized !== '0' && normalized !== 'no'
}

const ARKA_ROUTE_PREFIXES = [
  '/units',
  '/hour-meters',
  '/forecasts',
  '/components',
  '/model-components',
  '/cannibals',
  '/approvals',
  '/reports',
  '/users',
  '/roles',
  '/permissions',
  '/permission',
  '/pcr'
]

function isArkaRoute(path: string) {
  return ARKA_ROUTE_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
}

export default withAuth(
  req => {
    const path = req.nextUrl.pathname

    if (!isArkaRoute(path)) {
      return NextResponse.next()
    }

    if (!isAclEnabled()) {
      return NextResponse.next()
    }

    const level = req.nextauth.token?.level as string | undefined
    const permissions = (req.nextauth.token?.permissions as string[] | undefined) ?? []
    const canAccess = (required: string) => level === 'ADMIN' || permissions.includes(required)

    if ((path === '/users' || path.startsWith('/users/')) && !canAccess('users.access')) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    if ((path === '/roles' || path.startsWith('/roles/')) && !canAccess('roles.access')) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    if (
      (path === '/permissions' ||
        path.startsWith('/permissions/') ||
        path === '/permission' ||
        path.startsWith('/permission/')) &&
      !canAccess('permissions.access')
    ) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    if ((path === '/units' || path.startsWith('/units/')) && !canAccess('units.access')) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname

        if (!isArkaRoute(path)) return true

        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    '/units/:path*',
    '/hour-meters/:path*',
    '/forecasts/:path*',
    '/components/:path*',
    '/model-components/:path*',
    '/cannibals/:path*',
    '/cannibals-approvals/:path*',
    '/approvals/:path*',
    '/reports/:path*',
    '/users/:path*',
    '/roles/:path*',
    '/permissions/:path*',
    '/permission/:path*',
    '/pcr/:path*'
  ]
}
