import { AbilityBuilder, Ability } from '@casl/ability'

import { isAclEnabled } from 'src/configs/acl-env'
import {
  CANNIBAL_APPROVE_PERMISSIONS,
  FORECAST_APPROVE_PERMISSIONS
} from 'src/utils/approval-registry'

export const AppAbility = Ability

const FORECAST_APPROVE_PERMISSIONS_LIST = FORECAST_APPROVE_PERMISSIONS
const CANNIBAL_APPROVE_PERMISSIONS_LIST = CANNIBAL_APPROVE_PERMISSIONS

function hasAnyCode(permissions, codes) {
  return codes.some(code => permissions.includes(code))
}

/** Build CASL ability from session permission codes (nav + legacy Can components). */
export const buildAbilityFromPermissions = (permissions = []) => {
  const { can, rules } = new AbilityBuilder(AppAbility)
  const perms = Array.isArray(permissions) ? permissions : []

  if (!isAclEnabled() || perms.includes('system.admin')) {
    can('manage', 'all')
  } else {
    const grant = (code, action, subject) => {
      if (perms.includes(code)) can(action, subject)
    }

    grant('users.access', 'read', 'users')
    grant('roles.access', 'read', 'roles')
    grant('permissions.access', 'read', 'permissions')
    grant('units.access', 'read', 'units')
    grant('components.access', 'read', 'components')
    grant('hour-meters.access', 'read', 'hour-meters')
    grant('forecasts.access', 'read', 'forecasts')
    grant('cannibals.access', 'read', 'cannibals')
    grant('reports.access', 'read', 'reports')

    if (hasAnyCode(perms, FORECAST_APPROVE_PERMISSIONS_LIST)) {
      can('read', 'forecast-approvals')
    }

    if (hasAnyCode(perms, CANNIBAL_APPROVE_PERMISSIONS_LIST)) {
      can('read', 'cannibals-approvals')
    }

    const operationalCodes = [
      'forecasts.create',
      'forecasts.update',
      'replacements.create',
      'replacements.update',
      'replacements.edit.close',
      'cannibals.create',
      'cannibals.update',
      'components.update',
      'hour-meters.create'
    ]
    if (hasAnyCode(perms, operationalCodes)) {
      can(['create', 'update'], 'all')
    }
  }

  return new AppAbility(rules, {
    // https://casl.js.org/v5/en/guide/subject-type-detection
    // @ts-ignore
    detectSubjectType: object => object.type
  })
}

export function userHasPermission(permissions, permissionCode) {
  if (!isAclEnabled()) return true

  const perms = Array.isArray(permissions) ? permissions : []
  if (perms.includes('system.admin')) return true

  return perms.includes(permissionCode)
}

export function userHasAnyPermission(permissions, permissionCodes) {
  if (!isAclEnabled()) return true

  const perms = Array.isArray(permissions) ? permissions : []
  if (perms.includes('system.admin')) return true

  return permissionCodes.some(code => perms.includes(code))
}

/** Page-level access when ACL is enabled. */
export function canAccessPage(permissions, aclAbilities, routeAccess) {
  if (!isAclEnabled()) return true

  const perms = Array.isArray(permissions) ? permissions : []

  if (aclAbilities?.permission) {
    return userHasPermission(perms, aclAbilities.permission)
  }

  if (routeAccess?.permission) {
    return userHasPermission(perms, routeAccess.permission)
  }

  if (routeAccess?.anyOf?.length) {
    return userHasAnyPermission(perms, routeAccess.anyOf)
  }

  if (aclAbilities?.action === 'manage' && aclAbilities?.subject === 'all') {
    return perms.length > 0
  }

  const ability = buildAbilityFromPermissions(perms)

  return ability.can(aclAbilities.action, aclAbilities.subject)
}

/** @deprecated Use buildAbilityFromPermissions */
export const buildAbilityFor = (role, subject) => {
  if (role === 'admin' || role === 'ADMIN' || role === 'SUPER USER') {
    return buildAbilityFromPermissions(['system.admin'])
  }

  const { can, rules } = new AbilityBuilder(AppAbility)
  can(['read', 'create', 'update', 'delete'], subject)

  return new AppAbility(rules, {
    // @ts-ignore
    detectSubjectType: object => object.type
  })
}

export const defaultACLObj = {
  action: 'manage',
  subject: 'all'
}

export default buildAbilityFromPermissions
