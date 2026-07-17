// ** Utils
export async function downloadExport(path, params = {}, filename = 'export.xlsx') {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') query.set(key, String(value))
  })

  const response = await fetch(`/api/exports/${path}/?${query.toString()}`)
  if (!response.ok) throw new Error('Export failed')

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}
