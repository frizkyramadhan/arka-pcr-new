/** Installation report upload — selaras legacy edit_rep.php (PDF, max ~50 MB). */
export const REPLACEMENT_REPORT_MAX_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB) || 50

export const REPLACEMENT_REPORT_MAX_BYTES = REPLACEMENT_REPORT_MAX_SIZE_MB * 1024 * 1024

export const REPLACEMENT_REPORT_ACCEPT = '.pdf,application/pdf'

export const REPLACEMENT_REPORT_EXTENSIONS = ['.pdf'] as const
