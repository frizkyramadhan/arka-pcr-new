import fs from 'fs'
import path from 'path'

import {
  REPLACEMENT_REPORT_EXTENSIONS,
  REPLACEMENT_REPORT_MAX_BYTES,
  REPLACEMENT_REPORT_MAX_SIZE_MB
} from '@/lib/constants/replacement-report-upload'

function assertPdfReport(file: File): void {
  const name = file.name.toLowerCase()
  const isPdf = REPLACEMENT_REPORT_EXTENSIONS.some(ext => name.endsWith(ext))

  if (!isPdf) {
    throw new Error('Report must be a PDF file')
  }
}

export function validateReplacementReportFile(file: File): { ok: true } | { ok: false; message: string } {
  try {
    assertPdfReport(file)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Invalid file type'
    }
  }

  if (file.size > REPLACEMENT_REPORT_MAX_BYTES) {
    return {
      ok: false,
      message: `File exceeds the ${REPLACEMENT_REPORT_MAX_SIZE_MB} MB limit (${formatFileSize(file.size)}).`
    }
  }

  if (file.size === 0) {
    return { ok: false, message: 'File is empty.' }
  }

  return { ok: true }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getUploadRoot(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')
}

export async function saveReplacementReport(idRep: number, file: File): Promise<string> {
  const validation = validateReplacementReportFile(file)
  if (!validation.ok) {
    throw new Error(validation.message)
  }

  const root = getUploadRoot()
  const dir = path.join(root, 'replacements', String(idRep))
  fs.mkdirSync(dir, { recursive: true })

  const filename = `report-${Date.now()}.pdf`
  const absolutePath = path.join(dir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(absolutePath, buffer)

  return path.relative(root, absolutePath).replace(/\\/g, '/')
}

export function deleteStoredFile(relativePath: string): void {
  const absolutePath = path.join(getUploadRoot(), relativePath)

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath)
  }
}

export function resolveStoredFilePath(relativePath: string): string {
  return path.join(getUploadRoot(), relativePath)
}
