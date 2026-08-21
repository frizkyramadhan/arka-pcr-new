/**
 * Link to linked PCR forecast from a replacement row.
 */
import NextLink from 'next/link'

import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from 'src/@core/components/mui/chip'

const ReplacementForecastLink = ({ linkedForecast, showStatus = true }) => {
  if (!linkedForecast) {
    return (
      <Typography variant='body2' sx={{ color: 'text.disabled' }}>
        —
      </Typography>
    )
  }

  const { idForecast, noBaPcr, baPcrStatus, baFullyApproved } = linkedForecast
  const label = noBaPcr ?? `Forecast #${idForecast}`

  const tooltip = baFullyApproved
    ? `BA PCR ${baPcrStatus} — open forecast detail`
    : `BA PCR ${baPcrStatus} — row actions unlock after full approval`

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, minWidth: 0 }}>
      <Tooltip title={tooltip}>
        <Link
          component={NextLink}
          href={`/forecasts/${idForecast}`}
          underline='hover'
          sx={{ fontWeight: 600, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {label}
        </Link>
      </Tooltip>
      {showStatus ? (
        <CustomChip
          rounded
          skin='light'
          size='small'
          label={baPcrStatus}
          color={baFullyApproved ? 'success' : baPcrStatus === 'REJECTED' ? 'error' : 'warning'}
        />
      ) : null}
    </Box>
  )
}

export default ReplacementForecastLink
