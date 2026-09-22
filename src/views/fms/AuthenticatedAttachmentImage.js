/**
 * Load attachment image via authenticated API (blob) — works under /arka-pcr Docker.
 * Plain <img src="/api/..."> can fail when session/cookies + trailingSlash/nginx interact poorly.
 */
import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

import Icon from 'src/@core/components/icon'
import arkaApi from 'src/utils/arka-api'

const AuthenticatedAttachmentImage = ({
  attachmentId,
  alt = '',
  sx,
  fallbackSx,
  component = 'img',
  ...rest
}) => {
  const [src, setSrc] = useState(null)
  const [loading, setLoading] = useState(Boolean(attachmentId))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!attachmentId) {
      setSrc(null)
      setLoading(false)
      setFailed(false)

      return undefined
    }

    let objectUrl = null
    let cancelled = false

    setLoading(true)
    setFailed(false)
    setSrc(null)

    arkaApi
      .get(`/attachments/${attachmentId}/download`, {
        responseType: 'blob',
        skipGlobalErrorToast: true,
        headers: { Accept: '*/*' }
      })
      .then(res => {
        if (cancelled) return
        const blob = res.data
        if (!(blob instanceof Blob) || blob.size === 0) {
          setFailed(true)

          return
        }

        // If API returned JSON error as blob, treat as failure
        if (blob.type && blob.type.includes('application/json')) {
          setFailed(true)

          return
        }

        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachmentId])

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
          ...fallbackSx,
          ...sx
        }}
      >
        <CircularProgress size={20} />
      </Box>
    )
  }

  if (failed || !src) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
          opacity: 0.5,
          ...fallbackSx,
          ...sx
        }}
      >
        <Icon icon='tabler:photo-off' fontSize={22} />
      </Box>
    )
  }

  return <Box component={component} src={src} alt={alt} sx={sx} {...rest} />
}

export default AuthenticatedAttachmentImage
