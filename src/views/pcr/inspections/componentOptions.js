/**
 * Format model-component untuk select filter / form inspection.
 */
export const extractModelComponents = data => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.rows)) return data.rows
  if (Array.isArray(data?.data)) return data.data

  return []
}

export const formatComponentOptionLabel = item => {
  const desc = item.comp?.compDesc ?? `Component #${item.idMod}`
  const type = item.comp?.compType ?? item.lifeType

  return type ? `${desc} (${type})` : desc
}

export const toComponentSelectOptions = items =>
  [...items]
    .sort((a, b) => (a.comp?.compDesc ?? '').localeCompare(b.comp?.compDesc ?? '', 'id'))
    .map(item => ({
      idMod: item.idMod,
      label: formatComponentOptionLabel(item)
    }))
