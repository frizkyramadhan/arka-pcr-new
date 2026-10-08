/**
 * Local-disk paths for FMS attachment files.
 * DB storagePath stays `/uploads/attachments/...` for UI parity; files live under UPLOAD_DIR.
 */
import fs from 'fs'
import path from 'path'

import { getUploadRoot } from '@/lib/utils/file-storage'

/** URL-style prefix stored in Attachment.storagePath (FMS contract). */
export const ATTACHMENT_STORAGE_URL_PREFIX = '/uploads/attachments/'

export function getAttachmentsDir(): string {
  return path.join(getUploadRoot(), 'attachments')
}

export function getAttachmentTmpDir(): string {
  return path.join(getUploadRoot(), 'tmp')
}

/** Legacy FMS deploy path (migrated files may still be here). */
function legacyPublicAttachmentsDir(): string {
  return path.join(process.cwd(), 'public', 'uploads', 'attachments')
}

/**
 * File name inside the attachments directory.
 * Accepts the stored key (`/uploads/attachments/file.jpg`), a full URL, or a bare file name.
 * Rejects anything that could leave that directory.
 */
function fileNameFromStoragePath(storagePath: string): string | null {
  const normalized = storagePath.replace(/\\/g, '/')
  const markerAt = normalized.lastIndexOf(ATTACHMENT_STORAGE_URL_PREFIX)
  const raw = markerAt >= 0 ? normalized.slice(markerAt + ATTACHMENT_STORAGE_URL_PREFIX.length) : path.posix.basename(normalized)
  const fileName = raw.split(/[?#]/)[0]

  if (!fileName || fileName === '.' || fileName === '..' || fileName.includes('/') || fileName.includes('..')) return null

  return fileName
}

/** Map DB storagePath to absolute filesystem path (primary store, then legacy public). */
export function resolveAttachmentFilePath(storagePath: string | null | undefined): string | null {
  if (!storagePath || typeof storagePath !== 'string') return null

  const fileName = fileNameFromStoragePath(storagePath)
  if (!fileName || fileName.includes('..')) return null

  const primary = path.join(getAttachmentsDir(), fileName)
  if (fs.existsSync(primary)) return primary

  const legacy = path.join(legacyPublicAttachmentsDir(), fileName)
  if (fs.existsSync(legacy)) return legacy

  return primary
}

/** Remove file from disk when deleting attachment metadata (both primary and legacy). */
export function deleteAttachmentFileFromDisk(storagePath: string | null | undefined): void {
  if (!storagePath || typeof storagePath !== 'string') return

  const fileName = fileNameFromStoragePath(storagePath)
  if (!fileName || fileName.includes('..')) return

  for (const dir of [getAttachmentsDir(), legacyPublicAttachmentsDir()]) {
    const filePath = path.join(dir, fileName)
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
      } catch (err) {
        console.warn('Could not delete attachment file:', filePath, err)
      }
    }
  }
}

export function ensureAttachmentsDir(): void {
  fs.mkdirSync(getAttachmentsDir(), { recursive: true })
}

export function ensureAttachmentTmpDir(): void {
  fs.mkdirSync(getAttachmentTmpDir(), { recursive: true })
}

export function buildAttachmentStoragePath(uniqueFileName: string): string {
  return `${ATTACHMENT_STORAGE_URL_PREFIX}${uniqueFileName}`
}
