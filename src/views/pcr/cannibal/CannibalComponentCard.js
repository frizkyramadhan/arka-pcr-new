/**
 * Cannibalized component — cozy summary card (detail / approval left column).
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import CustomAvatar from 'src/@core/components/mui/avatar'

import { isComponentStatusOther } from 'src/utils/cannibal-form-lookups'

const formatDate = value => (value ? String(value).slice(0, 10) : '—')

const CozyField = ({ label, value }) => (
  <Box
    sx={{
      px: 2,
      py: 1.5,
      borderRadius: 2,
      bgcolor: 'action.hover',
      border: theme => `1px solid ${theme.palette.divider}`
    }}
  >
    <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.35 }}>
      {label}
    </Typography>
    <Typography
      variant='body2'
      sx={{
        fontWeight: value ? 600 : 400,
        color: value ? 'text.primary' : 'text.disabled',
        lineHeight: 1.45,
        wordBreak: 'break-word'
      }}
    >
      {value || '—'}
    </Typography>
  </Box>
)

const CannibalComponentCard = ({ ba, transfer, componentTitle }) => {
  if (!ba) return null

  const statusLabel = ba.baComponentStatus?.status
  const statusOther = ba.statusOther?.trim()
  const statusIsOther = isComponentStatusOther(ba.baComponentStatus)
  const statusDisplay = statusIsOther && statusOther ? `${statusLabel} — ${statusOther}` : statusLabel

  return (
    <Card
      variant='outlined'
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: theme => `0 2px 12px ${alpha(theme.palette.common.black, 0.04)}`
      }}
    >
      <CardContent
        sx={{
          p: { xs: 3, sm: 4 },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          '&:last-of-type': { pb: { xs: 3, sm: 4 } }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
          <CustomAvatar skin='light' color='secondary' sx={{ width: 40, height: 40 }}>
            <Icon icon='tabler:puzzle' fontSize='1.25rem' />
          </CustomAvatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.4 }}>
              Cannibalized Component
            </Typography>
            <Typography variant='h6' sx={{ fontWeight: 700, lineHeight: 1.3, mt: 0.25 }}>
              {componentTitle || '—'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {transfer?.remove?.pn ? <Chip size='small' label={`P/N ${transfer.remove.pn}`} color='primary' variant='outlined' /> : null}
          {transfer?.remove?.sn ? <Chip size='small' label={`S/N ${transfer.remove.sn}`} variant='outlined' /> : null}
          {transfer?.remove?.pos ? <Chip size='small' label={`POS ${transfer.remove.pos}`} variant='outlined' /> : null}
        </Box>

        <Box sx={{ display: 'grid', gap: 1.5, mb: 3 }}>
          <CozyField label='Project' value={ba.projectCode} />
          <CozyField label='Posting Date' value={formatDate(ba.postingDate)} />
          <CozyField label='Component Status' value={statusDisplay} />
        </Box>

        <Box
          sx={{
            p: 2.5,
            borderRadius: 2,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            bgcolor: theme => alpha(theme.palette.warning.main, 0.08),
            border: theme => `1px solid ${alpha(theme.palette.warning.main, 0.22)}`
          }}
        >
          <Typography variant='caption' sx={{ color: 'warning.dark', fontWeight: 700, display: 'block', mb: 1, flexShrink: 0 }}>
            Failure Description
          </Typography>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto'
            }}
          >
            <Typography
              variant='body2'
              sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
                color: ba.failure ? 'text.primary' : 'text.disabled',
                fontStyle: ba.failure ? 'normal' : 'italic'
              }}
            >
              {ba.failure || 'No description provided.'}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default CannibalComponentCard
