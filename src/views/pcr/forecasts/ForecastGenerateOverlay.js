/**
 * Light overlay shown while auto-generating PCR forecasts.
 */
import Backdrop from '@mui/material/Backdrop'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

const overlaySx = {
  position: 'absolute',
  zIndex: theme => theme.zIndex.drawer + 1,
  color: 'primary.main',
  borderRadius: 1,
  bgcolor: 'rgba(255, 255, 255, 0.82)',
  backdropFilter: 'blur(1px)'
}

const ForecastGenerateOverlay = ({
  open,
  title = 'Auto-generating forecasts...',
  subtitle = 'Scanning units and life % thresholds'
}) => (
  <Backdrop open={open} sx={overlaySx}>
    <Box sx={{ textAlign: 'center', px: 4 }}>
      <CircularProgress color='inherit' size={40} />
      <Typography sx={{ mt: 3, fontWeight: 600, color: 'text.primary' }}>{title}</Typography>
      {subtitle ? (
        <Typography variant='body2' sx={{ mt: 1, color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  </Backdrop>
)

export default ForecastGenerateOverlay
