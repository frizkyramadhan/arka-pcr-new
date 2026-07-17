/**
 * Backfill user_project pivot only (legacy user.project_code removed).
 */
import { prisma } from '@/lib/prisma'

export function normalizeProjectCodes(codes: string[]): string[] {
  return [...new Set(codes.map(code => code.trim()).filter(Boolean))]
}

export async function getUserProjectCodes(idUser: number): Promise<string[]> {
  const rows = await prisma.userProject.findMany({
    where: { idUser },
    select: { projectCode: true },
    orderBy: { projectCode: 'asc' }
  })

  return rows.map(row => row.projectCode)
}

/** No-op — kept for auth login flow compatibility. */
export async function ensureUserProjectsFromLegacy(idUser: number): Promise<string[]> {
  return getUserProjectCodes(idUser)
}

export async function syncUserProjects(idUser: number, projectCodes: string[]): Promise<string[]> {
  const normalized = normalizeProjectCodes(projectCodes)

  await prisma.userProject.deleteMany({ where: { idUser } })

  if (normalized.length > 0) {
    await prisma.userProject.createMany({
      data: normalized.map(projectCode => ({ idUser, projectCode })),
      skipDuplicates: true
    })
  }

  return normalized
}
