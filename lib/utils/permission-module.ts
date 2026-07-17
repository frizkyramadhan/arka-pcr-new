/** Segment modul dari kode permission (mis. component.create → component). */
export function getPermissionModuleKey(code: string | null | undefined): string {
  if (!code) return 'other'
  const dotIndex = code.indexOf('.')

  return dotIndex > 0 ? code.slice(0, dotIndex) : 'other'
}
