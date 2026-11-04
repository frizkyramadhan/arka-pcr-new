/**
 * Additive RBAC sync for Breakdown + SAP Employees.
 *
 * Upserts permission rows and grants them onto existing roles without replacing
 * other grants. Safe for production custom roles (system_admin, auditor, …).
 * Prefer this over `rbac:seed` when only rolling out new feature permissions.
 *
 * Mapping:
 * - breakdown.read   → roles with maintenance-actual.read
 * - breakdown.create → roles with maintenance-actual.create
 * - breakdown.update → roles with maintenance-actual.update
 * - breakdown.cancel → roles with maintenance-actual.update (soft CANCEL; foreman included)
 * - breakdown.delete → roles with maintenance-actual.delete (hard delete; planner/PS/admin)
 * - sap-employees.*  → roles with users.update (administrator, system_admin, …)
 */
import { prisma } from '@/lib/prisma'

const BREAKDOWN_GRANTS = [
  {
    code: 'breakdown.read',
    description: 'View breakdowns and their activities',
    beside: 'maintenance-actual.read'
  },
  {
    code: 'breakdown.create',
    description: 'Create a breakdown',
    beside: 'maintenance-actual.create'
  },
  {
    code: 'breakdown.update',
    description: 'Add a breakdown activity or close the work order',
    beside: 'maintenance-actual.update'
  },
  {
    code: 'breakdown.cancel',
    description: 'Cancel an open breakdown (soft CANCEL status; SAP WO cancelled when linked)',
    beside: 'maintenance-actual.update'
  },
  {
    code: 'breakdown.delete',
    description: 'Permanently delete a breakdown record (and clean up linked SAP WO when still open)',
    beside: 'maintenance-actual.delete'
  }
] as const

const SAP_EMPLOYEE_CODES = [
  {
    code: 'sap-employees.read',
    description: 'View SAP employee master (EmployeesInfo)'
  },
  {
    code: 'sap-employees.create',
    description: 'Create SAP employees via Service Layer'
  },
  {
    code: 'sap-employees.update',
    description: 'Update SAP employees (NIK, status, branch, mechanic)'
  }
] as const

async function upsertPermission(code: string, description: string) {
  return prisma.permission.upsert({
    where: { code },
    create: { code, description, isActive: true },
    update: { description, isActive: true, deletedAt: null }
  })
}

/** Grant permission to every role that already holds `besideCode`. */
async function grantBeside(permissionId: number, besideCode: string, label: string) {
  const holders = await prisma.rolePermission.findMany({
    where: { permission: { code: besideCode, deletedAt: null, isActive: true } },
    select: { idRole: true, role: { select: { name: true } } }
  })

  if (holders.length === 0) {
    console.log(`${label}: no roles hold ${besideCode}`)
    return
  }

  await prisma.rolePermission.createMany({
    data: holders.map(row => ({ idRole: row.idRole, idPermission: permissionId })),
    skipDuplicates: true
  })

  const names = [...new Set(holders.map(row => row.role.name))].sort().join(', ')
  console.log(`${label}: granted on ${holders.length} role link(s) → ${names}`)
}

async function main() {
  console.log('Syncing Breakdown permissions…')
  for (const item of BREAKDOWN_GRANTS) {
    const permission = await upsertPermission(item.code, item.description)
    await grantBeside(permission.idPermission, item.beside, item.code)
  }

  // Legacy: cancel used to be breakdown.delete — ensure those roles get cancel too.
  const cancelPerm = await prisma.permission.findFirst({ where: { code: 'breakdown.cancel', deletedAt: null } })
  if (cancelPerm) {
    await grantBeside(cancelPerm.idPermission, 'breakdown.delete', 'breakdown.cancel (legacy delete holders)')
  }

  console.log('Syncing SAP Employees permissions…')
  for (const item of SAP_EMPLOYEE_CODES) {
    const permission = await upsertPermission(item.code, item.description)
    await grantBeside(permission.idPermission, 'users.update', item.code)
  }

  console.log('Feature permission sync complete')
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
