/**
 * Vuexy-style customized Dialog to preview inspection photo attachments.
 * Images load via authenticated blob (Docker /arka-pcr safe).
 */
import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import arkaApi from 'src/utils/arka-api'
import { attachmentDownloadUrl } from 'src/utils/attachment-url'
import AuthenticatedAttachmentImage from 'src/views/fms/AuthenticatedAttachmentImage'

const CustomCloseButton = styled(IconButton)(({ theme }) => ({
  top: 0,
  right: 0,
  color: 'grey.500',
  position: 'absolute',
  boxShadow: theme.shadows[2],
  transform: 'translate(10px, -10px)',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: `${theme.palette.background.paper} !important`,
  transition: 'transform 0.25s ease-in-out, box-shadow 0.25s ease-in-out',
  '&:hover': {
    transform: 'translate(7px, -5px)'
  }
}))

const isImageAttachment = att =>
  att?.fileType?.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp)$/i.test(att?.fileName || '')

const InspectionPhotosDialog = ({ open, onClose, inspectionId, initialAttachments = null, title = 'Inspection photos' }) => {
  const [attachments, setAttachments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [active, setActive] = useState(null)

  useEffect(() => {
    if (!open) {
      setActive(null)
      setError(null)

      return
    }

    if (Array.isArray(initialAttachments)) {
      const images = initialAttachments.filter(isImageAttachment)
      setAttachments(images)
      setActive(images[0] || null)
      setLoading(false)

      return
    }

    if (!inspectionId) {
      setAttachments([])

      return
    }

    setLoading(true)
    setError(null)
    arkaApi
      .get('/attachments', { params: { entityType: 'INSPECTION', entityId: String(inspectionId) } })
      .then(res => {
        const images = (res.data.attachments || []).filter(isImageAttachment)
        setAttachments(images)
        setActive(images[0] || null)
      })
      .catch(err => setError(err?.response?.data?.error || 'Failed to load photos'))
      .finally(() => setLoading(false))
  }, [open, inspectionId, initialAttachments])

  const handleClose = () => {
    setActive(null)
    onClose?.()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='xl'
      fullWidth
      aria-labelledby='inspection-photos-dialog-title'
      sx={{
        '& .MuiDialog-paper': {
          overflow: 'visible',
          width: '92vw',
          maxWidth: '1200px',
          m: 2
        }
      }}
    >
      <DialogTitle id='inspection-photos-dialog-title' sx={{ p: 4 }}>
        <Typography variant='h6' component='span'>
          {title}
        </Typography>
        <CustomCloseButton aria-label='close' onClick={handleClose}>
          <Icon icon='tabler:x' fontSize='1.25rem' />
        </CustomCloseButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: theme => `${theme.spacing(4)} !important` }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={28} />
          </Box>
        ) : error ? (
          <Typography color='error'>{error}</Typography>
        ) : attachments.length === 0 ? (
          <Typography color='text.secondary' sx={{ py: 4, textAlign: 'center' }}>
            No photos for this inspection
          </Typography>
        ) : (
          <Box>
            {active ? (
              <Box
                sx={{
                  mb: 4,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  overflow: 'hidden',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: { xs: 280, md: 480 },
                  maxHeight: '72vh'
                }}
              >
                <AuthenticatedAttachmentImage
                  attachmentId={active.id}
                  alt={active.fileName}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                  fallbackSx={{ width: '100%', minHeight: 280 }}
                />
              </Box>
            ) : null}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {attachments.map(att => {
                const selected = active?.id === att.id

                return (
                  <Box
                    key={att.id}
                    component='button'
                    type='button'
                    onClick={() => setActive(att)}
                    sx={{
                      p: 0,
                      border: 2,
                      borderColor: selected ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      bgcolor: 'transparent',
                      width: 72,
                      height: 72
                    }}
                  >
                    <AuthenticatedAttachmentImage
                      attachmentId={att.id}
                      alt={att.fileName}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      fallbackSx={{ width: 72, height: 72 }}
                    />
                  </Box>
                )
              })}
            </Box>

            {active ? (
              <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant='body2' color='text.secondary' noWrap>
                  {active.fileName}
                </Typography>
                <Button
                  size='small'
                  variant='tonal'
                  component='a'
                  href={attachmentDownloadUrl(active.id)}
                  target='_blank'
                  rel='noopener noreferrer'
                  startIcon={<Icon icon='tabler:external-link' />}
                >
                  Open
                </Button>
              </Box>
            ) : null}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default InspectionPhotosDialog
