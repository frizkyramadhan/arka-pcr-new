/**
 * Izin simpan grid tanggal maintenance.
 * Tambah tanggal = allowCreate (`maintenance-plan.create`).
 * Ubah atau hapus tanggal yang sudah ada = allowModifyExisting (`maintenance-plan.update`).
 * allowDelete tetap dibaca supaya pemanggil lama yang hanya memblok hapus tetap aman.
 */
export function scheduleDatePermissionError(
  toCreate: number,
  toDelete: number,
  options: { allowCreate?: boolean; allowModifyExisting?: boolean; allowDelete?: boolean }
): string | null {
  const allowCreate = options.allowCreate ?? true
  const allowModifyExisting = options.allowModifyExisting ?? options.allowDelete ?? false
  if (toDelete > 0 && !allowModifyExisting) {
    return 'You do not have permission to change or remove existing plan dates'
  }
  if (toCreate > 0 && !allowCreate) {
    return 'You do not have permission to add plan dates'
  }

  return null
}
