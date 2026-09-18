/**
 * Maintenance Actual View (Detail) — ARKA MMS
 *
 * Detail page for a single maintenance actual. Data from GET /api/maintenance-actuals/[id].
 * Displays: plan, unit (link to unit view), date, time, hour meter, remarks, mechanics,
 * created by, created at. Layout: header with summary, overview card, notes card, record info.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import DropzoneWrapper from 'src/@core/styles/libs/react-dropzone'
import { useAuth } from 'src/hooks/useAuth'
import { useDropzone } from 'react-dropzone'
import arkaApi from 'src/utils/arka-api'
import { apiPath } from 'src/utils/base-path'

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const unitStatusColor = {
  ACTIVE: 'success',
  'IN-ACTIVE': 'secondary',
  SOLD: 'info',
  SCRAP: 'error'
}

// Match Unit View layout for Unit Detail card. Optional href: render value as link to unit detail.
const UnitInfoRow = ({ label, value, chip, href }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, gap: 2 }}>
    <Typography variant='body2' color='text.secondary'>
      {label}
    </Typography>
    {chip ? (
      <CustomChip
        size='small'
        label={value || '—'}
        color={unitStatusColor[value] || 'secondary'}
        rounded
        skin='light'
      />
    ) : href ? (
      <Typography
        component={Link}
        href={href}
        variant='body2'
        sx={{
          fontWeight: 500,
          textAlign: 'right',
          color: 'primary.main',
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' }
        }}
      >
        {value || '—'}
      </Typography>
    ) : (
      <Typography variant='body2' sx={{ fontWeight: 500, textAlign: 'right' }}>
        {value || '—'}
      </Typography>
    )}
  </Box>
)

// Generic info row for right-side Maintenance Actual card
const InfoRow = ({ label, value, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', py: 1.5, gap: 2 }}>
    <Typography variant='body2' color='text.secondary' sx={{ flexShrink: 0, minWidth: 140 }}>
      {label}
    </Typography>
    {children !== undefined ? (
      <Box sx={{ textAlign: 'right', minWidth: 0, flex: 1 }}>{children}</Box>
    ) : (
      <Typography variant='body2' sx={{ fontWeight: 500, textAlign: 'right' }}>
        {value ?? '—'}
      </Typography>
    )}
  </Box>
)

const SectionTitle = ({ icon, title }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
    <Icon icon={icon} fontSize={20} style={{ opacity: 0.8 }} />
    <Typography variant='subtitle2' color='text.secondary' sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {title}
    </Typography>
  </Box>
)

const MaintenanceActualView = () => {
  const router = useRouter()
  const { id } = router.query
  const { user } = useAuth()
  const [actual, setActual] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [attachmentsError, setAttachmentsError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // { fileName, percent } or null

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    arkaApi
      .get(`/maintenance-actuals/${id}`)
      .then(res => setActual(res.data))
      .catch(err => {
        setError(err?.response?.data?.error || 'Failed to load maintenance actual')
      })
      .finally(() => setLoading(false))
  }, [id])

  // Load attachments for this maintenance actual
  useEffect(() => {
    if (!actual?.id) return
    setAttachmentsLoading(true)
    setAttachmentsError(null)
    arkaApi
      .get('/attachments', {
        params: { entityType: 'MAINTENANCE_ACTUAL', entityId: actual.id }
      })
      .then(res => {
        setAttachments(res.data.attachments || [])
      })
      .catch(err => {
        setAttachmentsError(err?.response?.data?.error || 'Failed to load attachments')
      })
      .finally(() => setAttachmentsLoading(false))
  }, [actual?.id])

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB max (chunked upload for large files)
  const CHUNK_SIZE = 100 * 1024 // 100 KB per chunk (keeps each request small)
  const CHUNKED_THRESHOLD = 400 * 1024 // Use chunked upload for files > 400 KB (avoids ERR_CONNECTION_RESET)

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

  const uploadFiles = useCallback(
    async acceptedFiles => {
      if (!acceptedFiles?.length || !user?.id || !actual?.id) {
        if (!user?.id) setAttachmentsError('User is not available for upload')
        
return
      }
      const tooBig = acceptedFiles.filter(f => f.size > MAX_FILE_SIZE)
      if (tooBig.length) {
        setAttachmentsError(
          `File(s) too large: max ${MAX_FILE_SIZE / 1024 / 1024} MB per file. Skipped: ${tooBig
            .map(f => f.name)
            .join(', ')}`
        )
        
return
      }

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

      const axiosOpt = { timeout: 60000 }

      try {
        setUploading(true)
        setAttachmentsError(null)
        const created = []
        for (const file of acceptedFiles) {
          setUploadProgress({ fileName: file.name, percent: 0 })
          const useChunked = file.size > CHUNKED_THRESHOLD

          if (useChunked) {
            const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

            const startRes = await arkaApi.post(
              '/attachments/upload-start',
              {
                entityType: 'MAINTENANCE_ACTUAL',
                entityId: actual.id,
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
                entityType: 'MAINTENANCE_ACTUAL',
                entityId: actual.id,
                uploadedById: user.id,
                files: [payload]
              },
              { ...axiosOpt, maxContentLength: 5 * 1024 * 1024, maxBodyLength: 5 * 1024 * 1024 }
            )
            setUploadProgress({ fileName: file.name, percent: 100 })
            const list = res.data?.attachments || []
            created.push(...list)
          }
        }
        if (created.length) {
          setAttachments(prev => [...created, ...prev])
        }
      } catch (err) {
        const apiMessage = err?.response?.data?.error
        const status = err?.response?.status
        const errCode = err?.code
        const errMessage = err?.message
        if (typeof window !== 'undefined') {
          console.error('[upload] error', {
            message: errMessage,
            code: errCode,
            status,
            hasResponse: !!err?.response,
            responseData: err?.response?.data
          })
        }
        let message = ''

        if (typeof apiMessage === 'string' && apiMessage.trim()) {
          message = apiMessage
        } else if (status === 400) {
          message = 'Upload failed. Please check file size (max 10 MB per file) and try again.'
        } else if (status === 413) {
          message = apiMessage || 'Request body too large. Try a smaller file.'
        } else if (errCode === 'ECONNABORTED' || errMessage?.includes('timeout')) {
          message = 'Upload timed out. Try a smaller file or check your connection.'
        } else if (!err?.response) {
          message = `Network error (${errCode || 'connection aborted'}). Check your connection or try a smaller file.`
        } else {
          message = 'Unexpected error while uploading. Please try again or contact the administrator.'
        }

        setAttachmentsError(message)
      } finally {
        setUploading(false)
        setUploadProgress(null)
      }
    },
    [actual?.id, user?.id]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: uploadFiles,
    disabled: uploading || !actual?.id,
    multiple: true,
    maxSize: MAX_FILE_SIZE,
    noClick: uploading,
    noDrag: uploading
  })

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !actual) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Card sx={{ p: 4 }}>
            <Typography color='error' sx={{ mb: 3 }}>
              {error || 'Maintenance actual not found'}
            </Typography>
            <Button
              component={Link}
              href='/maintenance-actuals/list'
              variant='contained'
              startIcon={<Icon icon='tabler:arrow-left' />}
            >
              Back to List
            </Button>
          </Card>
        </Grid>
      </Grid>
    )
  }

  const planPeriod = actual.planYear
    ? `${actual.planYear} ${MONTH_NAMES[actual.planMonth] || actual.planMonth || ''}`.trim()
    : '—'
  const planType = actual.planTypeName || '—'
  const planLabel = planPeriod

  const dateFormatted = actual.maintenanceDate
    ? new Date(actual.maintenanceDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : '—'

  const createdAtFormatted = actual.createdAt
    ? new Date(actual.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    : '—'

  const summaryLine = [actual.unitCode, actual.planTypeName, dateFormatted].filter(Boolean).join(' · ') || '—'

  const handleDeleteAttachment = async attachmentId => {
    if (!attachmentId) return

    // Simple confirm; can be improved with custom dialog if needed
    // eslint-disable-next-line no-restricted-globals
    const ok = confirm('Delete this attachment?')
    if (!ok) return
    try {
      await arkaApi.delete(`/attachments/${attachmentId}`)
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (err) {
      setAttachmentsError(err?.response?.data?.error || 'Failed to delete attachment')
    }
  }

  return (
    <Grid container spacing={6}>
      {/* Header: Back + title + one-line summary */}
      <Grid item xs={12}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 3
          }}
        >
          <Button
            component={Link}
            href={`/maintenance-actuals/edit/${actual.id}`}
            variant='contained'
            color='secondary'
            startIcon={<Icon icon='tabler:edit' />}
          >
            Edit
          </Button>
          <Button
            component={Link}
            href='/maintenance-actuals/list'
            variant='contained'
            startIcon={<Icon icon='tabler:arrow-left' />}
          >
            Back
          </Button>
        </Box>
      </Grid>

      <Grid item xs={12} md={5} lg={4}>
        {/* Unit Detail card (left) — same layout as Unit View */}
        <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <CardHeader
            title='Unit Detail'
            titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
            avatar={
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText'
                }}
              >
                <Icon icon='tabler:truck' fontSize={26} />
              </Box>
            }
          />
          <Divider sx={{ m: 0 }} />
          <CardContent sx={{ pt: 2, fontSize: '1.75rem' }}>
            <UnitInfoRow
              label='Unit No'
              value={actual.unitCode}
              href={actual.unitId ? `/units/${actual.unitId}` : undefined}
            />
            <Divider sx={{ my: 1.5 }} />
            <UnitInfoRow label='Project' value={actual.unitProjectName} />
            <Divider sx={{ my: 1.5 }} />
            <UnitInfoRow label='Model' value={actual.unitModel} />
            <Divider sx={{ my: 1.5 }} />
            <UnitInfoRow label='Description' value={actual.unitDescription} />
            <Divider sx={{ my: 1.5 }} />
            <UnitInfoRow label='Manufacture' value={actual.unitManufacture} />
            <Divider sx={{ my: 1.5 }} />
            <UnitInfoRow label='Plant group' value={actual.unitPlantGroup} />
            <Divider sx={{ my: 1.5 }} />
            <UnitInfoRow label='Plant type' value={actual.unitPlantType} />
            <Divider sx={{ my: 1.5 }} />
            <UnitInfoRow label='Status' value={actual.unitStatus} chip />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={7} lg={8}>
        {/* Maintenance Actual card (right) */}
        <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <CardHeader
            title='Maintenance Actual'
            titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
            avatar={
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.hover',
                  color: 'text.secondary'
                }}
              >
                <Icon icon='tabler:tool' fontSize={26} />
              </Box>
            }
          />
          <Divider sx={{ mx: 0 }} />
          <CardContent sx={{ pt: 2, pb: 3, fontSize: '1.75rem' }}>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6}>
                <InfoRow label='Maintenance type' value={planType} />
                <Divider sx={{ my: 1.5 }} />
                <InfoRow label='Maintenance plan' value={planLabel} />
                <Divider sx={{ my: 1.5 }} />
                <InfoRow label='Maintenance date' value={dateFormatted} />
                <Divider sx={{ my: 1.5 }} />
                <InfoRow label='Time' value={actual.maintenanceTime} />
                <Divider sx={{ my: 1.5 }} />
                <InfoRow label='Hour meter' value={actual.hourMeter != null ? String(actual.hourMeter) : '—'} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <InfoRow label='Mechanics' value={actual.mechanics} />
                <Divider sx={{ my: 1.5 }} />
                <InfoRow label='Created by' value={actual.createdByUsername} />
                <Divider sx={{ my: 1.5 }} />
                <InfoRow label='Created at' value={createdAtFormatted} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3 }}>
              <SectionTitle icon='tabler:message' title='Remarks' />
            </Box>
            <Paper variant='outlined' sx={{ p: 2, bgcolor: 'action.hover', borderColor: 'divider' }}>
              <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                {actual.remarks || '—'}
              </Typography>
            </Paper>
          </CardContent>
        </Card>

        {/* Attachments card (below Maintenance Actual, right column) */}
        <Card elevation={0} sx={{ mt: 4, border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <CardHeader
            title='Attachments'
            titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
            subheader='Drop files here or click to upload — max 10 MB (large files sent in chunks)'
          />
          <Divider sx={{ mx: 0 }} />
          <CardContent sx={{ pt: 3, pb: 3 }}>
            <DropzoneWrapper
              {...getRootProps({ className: 'dropzone' })}
              sx={{
                minHeight: '160px !important',
                padding: 2,
                opacity: uploading ? 0.7 : 1,
                pointerEvents: uploading ? 'none' : 'auto'
              }}
            >
              <input {...getInputProps()} />
              <Box sx={{ display: 'flex', textAlign: 'center', alignItems: 'center', flexDirection: 'column' }}>
                <Box
                  sx={{
                    mb: 2,
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
                    ? 'Drop the files here'
                    : 'Drop files here or click to upload'}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Multiple files supported
                </Typography>
              </Box>
            </DropzoneWrapper>

            {uploadProgress && (
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant='body2' sx={{ fontWeight: 500, mb: 1.5 }}>
                  {uploadProgress.fileName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '100%', mr: 2 }}>
                    <LinearProgress
                      color='primary'
                      variant='determinate'
                      value={uploadProgress.percent}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                  <Typography variant='body2' color='text.secondary' sx={{ minWidth: 40 }}>
                    {Math.round(uploadProgress.percent)}%
                  </Typography>
                </Box>
              </Box>
            )}

            {attachmentsError && (
              <Typography variant='body2' color='error' sx={{ mb: 2 }}>
                {attachmentsError}
              </Typography>
            )}

            {attachmentsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : attachments.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Icon icon='tabler:folder-off' fontSize={32} style={{ opacity: 0.4 }} />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  No attachments yet
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  overflow: 'hidden'
                }}
              >
                {attachments.map(att => {
                  const uploadedAt = att.uploadedAt
                    ? new Date(att.uploadedAt).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })
                    : '—'

                  return (
                    <Box
                      key={att.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        px: 3,
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-of-type': { borderBottom: 'none' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                        <Icon icon='tabler:paperclip' fontSize={18} style={{ opacity: 0.7 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant='body2'
                            sx={{
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden'
                            }}
                            component={att.id ? 'a' : 'span'}
                            href={att.id ? apiPath(`/attachments/${att.id}/download`) : undefined}
                            target={att.id ? '_blank' : undefined}
                            rel={att.id ? 'noopener noreferrer' : undefined}
                          >
                            {att.fileName}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {att.fileSize ? ` • ${(att.fileSize / 1024).toFixed(1)} KB` : ''}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ minWidth: 140, textAlign: 'right' }}>
                        <Typography variant='caption' color='text.secondary'>
                          {att.uploadedByUsername || '—'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary' display='block'>
                          {uploadedAt}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                        <Tooltip title='Delete'>
                          <IconButton
                            size='small'
                            sx={{ color: 'error.main' }}
                            onClick={() => handleDeleteAttachment(att.id)}
                          >
                            <Icon icon='tabler:trash' />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

MaintenanceActualView.acl = {
  subject: 'maintenance-actual',
  action: 'read'
}

export default MaintenanceActualView
