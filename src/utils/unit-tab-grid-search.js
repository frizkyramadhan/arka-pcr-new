/**
 * Client-side search for unit detail tab grids (summary rows from unit PCR summary).
 */
export function filterUnitSummaryRows(rows, query) {
  const q = query?.trim().toLowerCase()
  if (!q || !Array.isArray(rows)) return rows ?? []

  return rows.filter(row => {
    const values = [
      row.compDesc,
      row.compType,
      row.sosRating,
      row.lastSosDate,
      row.lastInspectionDate,
      row.condition,
      row.fcRating,
      row.mpsRating,
      row.viRating,
      row.ta2Rating,
      row.edRating,
      row.sosCount,
      row.inspectionCount
    ]

    return values.some(value => {
      if (value == null || value === '') return false

      return String(value).toLowerCase().includes(q)
    })
  })
}
