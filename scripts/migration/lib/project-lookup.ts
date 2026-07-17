/** Legacy project.id_project → Fleet project_code (kode_project). */
const LEGACY_PROJECT_CODE: Record<number, string> = {
  1: '000H',
  2: '001H',
  3: '011C',
  4: '015C',
  5: '016C',
  7: '017C',
  8: '018C',
  9: '004W',
  11: '008C',
  12: '005P',
  13: 'APS',
  14: '019C',
  15: '021C',
  16: '022C',
  17: '023C',
  18: '025C',
  19: '026C'
}

export function legacyProjectIdToCode(idProject: number | string | null | undefined): string {
  const id = Number(idProject)
  if (!Number.isFinite(id) || id <= 0) return '000H'

  return LEGACY_PROJECT_CODE[id] ?? '000H'
}
