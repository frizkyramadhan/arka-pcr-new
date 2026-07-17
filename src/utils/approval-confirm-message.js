/**
 * Teks konfirmasi approve/reject — dipakai dialog sebelum eksekusi approval.
 */
export function buildLevelConfirmMessage({ action, note, actionMode }) {
  const verb =
    action === 'approve'
      ? actionMode === 'revise'
        ? 'memperbarui persetujuan'
        : 'menyetujui'
      : action === 'revoke'
        ? 'membatalkan persetujuan'
        : 'menolak'
  const trimmedNote = typeof note === 'string' ? note.trim() : ''

  let message = `Apakah Anda yakin ingin ${verb}?`

  if (actionMode === 'revise' && action === 'approve') {
    message += '\n\nTahap berikutnya belum memproses — keputusan Anda masih dapat diubah.'
  }

  if (trimmedNote) {
    message += `\n\nNote:\n${trimmedNote}`
  }

  return message
}
