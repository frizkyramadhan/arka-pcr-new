/**
 * Plan lines for actual entry: one selectable row is one unit on one plan date.
 */

export function flattenPlanLines(plans) {
  const lines = []
  for (const plan of plans || []) {
    for (const detail of plan.details || []) {
      if (!detail?.id || !detail.planDate) continue
      lines.push({
        id: String(detail.id),
        maintenancePlanId: plan.id,
        projectId: plan.projectId ?? '',
        year: plan.year,
        month: plan.month,
        maintenanceTypeId: plan.maintenanceTypeId,
        maintenanceTypeName: plan.maintenanceTypeName || plan.maintenanceType?.name || '',
        fleetUnitId: detail.fleetUnitId,
        unitNo: detail.unitNo || '',
        unitModel: detail.unitModel || '',
        unitDescription: detail.unitDescription || '',
        planDate: detail.planDate,
        hasActual: Boolean(detail.hasActual)
      })
    }
  }

  return lines
}

export function filterPlanLines(lines, criteria = {}) {
  const projectId = criteria.projectId != null ? String(criteria.projectId).trim().toUpperCase() : ''
  const typeId = criteria.maintenanceTypeId != null ? String(criteria.maintenanceTypeId).trim() : ''
  const year = criteria.year === '' || criteria.year == null ? null : Number(criteria.year)
  const month = criteria.month === '' || criteria.month == null ? null : Number(criteria.month)

  const fleetUnitId =
    criteria.fleetUnitId === '' || criteria.fleetUnitId == null ? null : Number(criteria.fleetUnitId)

  return (lines || []).filter(line => {
    if (projectId && String(line.projectId).trim().toUpperCase() !== projectId) return false
    if (year != null && !Number.isNaN(year) && Number(line.year) !== year) return false
    if (month != null && !Number.isNaN(month) && Number(line.month) !== month) return false
    if (typeId && line.maintenanceTypeId !== typeId) return false
    if (fleetUnitId != null && !Number.isNaN(fleetUnitId) && Number(line.fleetUnitId) !== fleetUnitId) return false

    return true
  })
}
