/**
 * Upload / list / delete attachments for FMS entities (maintenance actual, inspection, …).
 * With allowPending: files can be staged before entityId exists; flush via ref.flushPending(entityId).
 */
import { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useRef } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'

import { useDropzone } from 'react-dropzone'

import Icon from 'src/@core/components/icon'
import DropzoneWrapper from 'src/@core/styles/libs/react-dropzone'
import { useAuth } from 'src/hooks/useAuth'
import arkaApi from 'src/utils/arka-api'
import { attachmentDownloadUrl } from 'src/utils/attachment-url'
import AuthenticatedAttachmentImage from 'src/views/fms/AuthenticatedAttachmentImage'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const CHUNK_SIZE = 100 * 1024
const CHUNKED_THRESHOLD = 400 * 1024

/** Prefix file name for category tags (e.g. CCR / CBM) without changing content. */
function applyFileNamePrefix(file, prefix) {
  const tag = String(prefix || '')
    .trim()
    .toUpperCase()
  if (!tag || !(file instanceof File)) return file

  const current = file.name || 'file'
  if (current.toUpperCase().startsWith(`${tag}_`)) return file

  return new File([file], `${tag}_${current}`, { type: file.type, lastModified: file.lastModified })
}

const readSliceAsBase64 = (file, start, end) =>
  new Promise((resolve, reject) => {
    const blob = file.slice(start, end)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const base64 = typeof dataUrl === 'string' && dataUrl.includes(',') ? dataUrl.split(',')[1] : ''
      resolve(base64)
    }
    reader.onerror = () => reject(new Error(`Failed to read chunk ${start}-${end}`))
    reader.readAsDataURL(blob)
  })

const readAsBase64 = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const base64 = typeof dataUrl === 'string' && dataUrl.includes(',') ? dataUrl.split(',')[1] : ''
      resolve(base64 ? { name: file.name, type: file.type || undefined, data: base64 } : null)
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsDataURL(file)
  })

const EntityAttachmentsSection = forwardRef(function EntityAttachmentsSection(
  {
    entityType,
    entityId,
    canUpload = false,
    canDelete = false,
    imagesOnly = false,
    allowPending = false,
    title = 'Attachments',
    onAttachmentsChange,

    /** Optional category tag prepended to uploaded/pending file names (e.g. CCR, CBM). */
    fileNamePrefix = '',

    /** Called when staged pending files change (create flows). */
    onPendingChange
  },
  ref
) {
  const { user } = useAuth()
  const [attachments, setAttachments] = useState([])
  const [pendingFiles, setPendingFiles] = useState([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [attachmentsError, setAttachmentsError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const pendingPreviewUrls = useRef(new Map())

  const entityIdStr = entityId != null && entityId !== '' ? String(entityId) : null

  const revokePendingPreviews = useCallback(files => {
    files.forEach(item => {
      const url = pendingPreviewUrls.current.get(item.key)
      if (url) {
        URL.revokeObjectURL(url)
        pendingPreviewUrls.current.delete(item.key)
      }
    })
  }, [])

  const clearPending = useCallback(() => {
    setPendingFiles(prev => {
      revokePendingPreviews(prev)

      return []
    })
  }, [revokePendingPreviews])

  useEffect(() => {
    if (!entityIdStr) {
      setAttachments([])

      return
    }
    setAttachmentsLoading(true)
    setAttachmentsError(null)
    arkaApi
      .get('/attachments', { params: { entityType, entityId: entityIdStr } })
      .then(res => setAttachments(res.data.attachments || []))
      .catch(err => setAttachmentsError(err?.response?.data?.error || 'Failed to load attachments'))
      .finally(() => setAttachmentsLoading(false))
  }, [entityType, entityIdStr])

  useEffect(() => {
    onAttachmentsChange?.(attachments)
  }, [attachments, onAttachmentsChange])

  useEffect(() => {
    onPendingChange?.(pendingFiles)
  }, [pendingFiles, onPendingChange])

  useEffect(() => {
    const urls = pendingPreviewUrls.current

    return () => {
      urls.forEach(url => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  const uploadFileList = useCallback(
    async (files, targetEntityId) => {
      if (!files?.length || !user?.id || !targetEntityId) {
        if (!user?.id) setAttachmentsError('User is not available for upload')

        return []
      }

      const prefixed = files.map(file => applyFileNamePrefix(file, fileNamePrefix))
      const tooBig = prefixed.filter(f => f.size > MAX_FILE_SIZE)
      if (tooBig.length) {
        setAttachmentsError(
          `File(s) too large: max ${MAX_FILE_SIZE / 1024 / 1024} MB per file. Skipped: ${tooBig.map(f => f.name).join(', ')}`
        )

        return []
      }

      const axiosOpt = { timeout: 60000 }
      const created = []

      setUploading(true)
      setAttachmentsError(null)

      try {
        for (const file of prefixed) {
          setUploadProgress({ fileName: file.name, percent: 0 })
          const useChunked = file.size > CHUNKED_THRESHOLD

          if (useChunked) {
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

            const startRes = await arkaApi.post(
              '/attachments/upload-start',
              {
                entityType,
                entityId: String(targetEntityId),
                uploadedById: user.id,
                fileName: file.name,
                fileType: file.type || undefined,
                totalSize: file.size,
                totalChunks
              },
              axiosOpt
            )
            const uploadId = startRes.data?.uploadId
            if (!uploadId) {
              setAttachmentsError('Failed to start upload')
              continue
            }
            for (let i = 0; i < totalChunks; i++) {
              const start = i * CHUNK_SIZE
              const end = Math.min(start + CHUNK_SIZE, file.size)
              const data = await readSliceAsBase64(file, start, end)

              const chunkRes = await arkaApi.post(
                '/attachments/upload-chunk',
                { uploadId, chunkIndex: i, totalChunks, data },
                axiosOpt
              )
              const percent = Math.round(((i + 1) / totalChunks) * 100)
              setUploadProgress({ fileName: file.name, percent })
              if (chunkRes.data?.attachments?.length) {
                created.push(...chunkRes.data.attachments)
              }
            }
          } else {
            setUploadProgress({ fileName: file.name, percent: 30 })
            const payload = await readAsBase64(file)
            if (!payload) continue
            setUploadProgress({ fileName: file.name, percent: 70 })

            const res = await arkaApi.post(
              '/attachments/upload',
              {
                entityType,
                entityId: String(targetEntityId),
                uploadedById: user.id,
                files: [payload]
              },
              { ...axiosOpt, maxContentLength: 5 * 1024 * 1024, maxBodyLength: 5 * 1024 * 1024 }
            )
            setUploadProgress({ fileName: file.name, percent: 100 })
            created.push(...(res.data?.attachments || []))
          }
        }
        if (created.length) {
          setAttachments(prev => [...created, ...prev])
        }

        return created
      } catch (err) {
        const apiMessage = err?.response?.data?.error
        setAttachmentsError(
          typeof apiMessage === 'string' && apiMessage.trim()
            ? apiMessage
            : 'Unexpected error while uploading. Please try again.'
        )
        throw err
      } finally {
        setUploading(false)
        setUploadProgress(null)
      }
    },
    [entityType, user?.id, fileNamePrefix]
  )

  const onDrop = useCallback(
    acceptedFiles => {
      if (!acceptedFiles?.length || !canUpload) return

      const prepared = acceptedFiles.map(file => applyFileNamePrefix(file, fileNamePrefix))
      const tooBig = prepared.filter(f => f.size > MAX_FILE_SIZE)
      if (tooBig.length) {
        setAttachmentsError(
          `File(s) too large: max ${MAX_FILE_SIZE / 1024 / 1024} MB per file. Skipped: ${tooBig.map(f => f.name).join(', ')}`
        )

        return
      }

      if (entityIdStr) {
        uploadFileList(prepared, entityIdStr).catch(() => {})

        return
      }

      if (!allowPending) {
        setAttachmentsError('Save the record first to upload files.')

        return
      }

      setAttachmentsError(null)
      setPendingFiles(prev => {
        const next = [...prev]
        prepared.forEach(file => {
          const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`
          pendingPreviewUrls.current.set(key, URL.createObjectURL(file))
          next.push({ key, file })
        })

        return next
      })
    },
    [allowPending, canUpload, entityIdStr, fileNamePrefix, uploadFileList]
  )

  useImperativeHandle(
    ref,
    () => ({
      hasPending: () => pendingFiles.length > 0,
      clearPending,
      flushPending: async targetEntityId => {
        if (!pendingFiles.length) return []
        const files = pendingFiles.map(item => item.file)
        const created = await uploadFileList(files, targetEntityId)
        clearPending()

        return created
      }
    }),
    [clearPending, pendingFiles, uploadFileList]
  )

  const handleDeleteAttachment = async id => {
    if (!canDelete || !id) return
    try {
      await arkaApi.delete(`/attachments/${id}`)
      setAttachments(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      setAttachmentsError(err?.response?.data?.error || 'Failed to delete attachment')
    }
  }

  const handleRemovePending = key => {
    setPendingFiles(prev => {
      const target = prev.find(item => item.key === key)
      if (target) revokePendingPreviews([target])

      return prev.filter(item => item.key !== key)
    })
  }

  const dropzoneAccept = imagesOnly ? { 'image/*': [] } : undefined
  const dropzoneEnabled = canUpload && !uploading && (Boolean(entityIdStr) || allowPending)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: !dropzoneEnabled,
    multiple: true,
    maxSize: MAX_FILE_SIZE,
    accept: dropzoneAccept,
    noClick: uploading,
    noDrag: uploading
  })

  const showEmpty =
    !attachmentsLoading && attachments.length === 0 && pendingFiles.length === 0 && Boolean(entityIdStr)

  return (
    <Box sx={{ mt: 2, mb: 4 }}>
      <Typography variant='subtitle2' sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {canUpload && dropzoneEnabled ? (
        <DropzoneWrapper>
          <Box
            {...getRootProps()}
            sx={{
              p: 4,
              mb: 3,
              borderRadius: 1,
              textAlign: 'center',
              cursor: uploading ? 'wait' : 'pointer',
              border: theme => `1px dashed ${theme.palette.divider}`,
              backgroundColor: isDragActive ? 'action.hover' : 'action.selected',
              opacity: uploading ? 0.7 : 1
            }}
          >
            <input {...getInputProps()} />
            <Box
              sx={{
                mb: 2,
                mx: 'auto',
                width: 40,
                height: 40,
                display: 'flex',
                borderRadius: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme => `rgba(${theme.palette.customColors?.main || '0,0,0'}, 0.08)`
              }}
            >
              <Icon icon='tabler:upload' fontSize='1.75rem' />
            </Box>
            <Typography variant='body2' sx={{ mb: 0.5 }}>
              {uploading
                ? 'Uploading...'
                : isDragActive
                  ? 'Drop files here'
                  : imagesOnly
                    ? 'Drop images here or click to upload'
                    : 'Drop files here or click to upload'}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Max {MAX_FILE_SIZE / 1024 / 1024} MB per file
              {!entityIdStr && allowPending ? ' · uploaded when you submit' : ''}
            </Typography>
          </Box>
        </DropzoneWrapper>
      ) : null}

      {uploadProgress ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant='body2' sx={{ fontWeight: 500, mb: 1 }}>
            {uploadProgress.fileName}
          </Typography>
          <LinearProgress variant='determinate' value={uploadProgress.percent} sx={{ height: 8, borderRadius: 1 }} />
        </Box>
      ) : null}

      {attachmentsError ? (
        <Typography variant='body2' color='error' sx={{ mb: 2 }}>
          {attachmentsError}
        </Typography>
      ) : null}

      {attachmentsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : null}

      {pendingFiles.length > 0 ? (
        <Box sx={{ borderRadius: 1, border: 1, borderColor: 'divider', overflow: 'hidden', mb: attachments.length ? 2 : 0 }}>
          {pendingFiles.map(item => {
            const previewUrl = pendingPreviewUrls.current.get(item.key)
            const isImage = item.file.type?.startsWith('image/') || imagesOnly

            return (
              <Box
                key={item.key}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-of-type': { borderBottom: 'none' }
                }}
              >
                {isImage && previewUrl ? (
                  <Box
                    component='img'
                    src={previewUrl}
                    alt={item.file.name}
                    sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }}
                  />
                ) : (
                  <Icon icon='tabler:paperclip' fontSize={18} style={{ opacity: 0.7 }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {item.file.name}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {(item.file.size / 1024).toFixed(1)} KB · pending
                  </Typography>
                </Box>
                <Tooltip title='Remove'>
                  <IconButton size='small' sx={{ color: 'error.main' }} onClick={() => handleRemovePending(item.key)}>
                    <Icon icon='tabler:trash' />
                  </IconButton>
                </Tooltip>
              </Box>
            )
          })}
        </Box>
      ) : null}

      {showEmpty ? (
        <Typography variant='body2' color='text.secondary' sx={{ py: 2, textAlign: 'center' }}>
          No attachments yet
        </Typography>
      ) : null}

      {attachments.length > 0 ? (
        <Box sx={{ borderRadius: 1, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          {attachments.map(att => {
            const uploadedAt = att.uploadedAt
              ? new Date(att.uploadedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
              : '—'

            const isImage =
              att.fileType?.startsWith('image/') ||
              /\.(jpe?g|png|gif|webp|bmp)$/i.test(att.fileName || '')

            return (
              <Box
                key={att.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-of-type': { borderBottom: 'none' }
                }}
              >
                {isImage && att.id ? (
                  <Box
                    component='a'
                    href={attachmentDownloadUrl(att.id)}
                    target='_blank'
                    rel='noopener noreferrer'
                    sx={{ flexShrink: 0 }}
                  >
                    <AuthenticatedAttachmentImage
                      attachmentId={att.id}
                      alt={att.fileName}
                      sx={{
                        width: 48,
                        height: 48,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: 1,
                        borderColor: 'divider'
                      }}
                      fallbackSx={{ width: 48, height: 48 }}
                    />
                  </Box>
                ) : (
                  <Icon icon='tabler:paperclip' fontSize={18} style={{ opacity: 0.7 }} />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    component={att.id ? 'a' : 'span'}
                    href={att.id ? attachmentDownloadUrl(att.id) : undefined}
                    target={att.id ? '_blank' : undefined}
                    rel={att.id ? 'noopener noreferrer' : undefined}
                  >
                    {att.fileName}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ''}
                    {att.uploadedByUsername ? ` · ${att.uploadedByUsername}` : ''}
                    {` · ${uploadedAt}`}
                  </Typography>
                </Box>
                {canDelete ? (
                  <Tooltip title='Delete'>
                    <IconButton size='small' sx={{ color: 'error.main' }} onClick={() => handleDeleteAttachment(att.id)}>
                      <Icon icon='tabler:trash' />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Box>
            )
          })}
        </Box>
      ) : null}
    </Box>
  )
})

export default EntityAttachmentsSection
