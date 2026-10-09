import type { Session } from 'next-auth'
import { describe, expect, it } from 'vitest'

import { resolveProjectIdFilter } from '@/lib/utils/project-scope'

function session(projectCodes: string[], permissions: string[] = []): Session {
  return { user: { projectCodes, permissions } } as Session
}

describe('resolveProjectIdFilter', () => {
  it('limits a site user to assigned projects', () => {
    expect(resolveProjectIdFilter(session(['021C', '025C']), null)).toEqual({
      projectId: { in: ['021C', '025C'] }
    })
  })

  it('keeps one assigned project when the list asks for it', () => {
    expect(resolveProjectIdFilter(session(['021C', '025C']), '025C')).toEqual({ projectId: '025C' })
  })

  it('returns no rows when the requested project is outside the user scope', () => {
    expect(resolveProjectIdFilter(session(['021C']), '025C')).toEqual({ projectId: '__NONE__' })
  })

  it('returns no rows when the user has no project', () => {
    expect(resolveProjectIdFilter(session([]), null)).toEqual({ projectId: '__NONE__' })
  })

  it('lets head office see every project, or one project they pick', () => {
    expect(resolveProjectIdFilter(session(['000H']), null)).toEqual({})
    expect(resolveProjectIdFilter(session(['000H']), '021C')).toEqual({ projectId: '021C' })
  })
})
