// ** MUI Imports
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

const LifeProgressBar = ({ percent, showLabel = true }) => {
  const value = Math.min(Number(percent ?? 0), 120)
  let color = 'success'

  if (value >= 100) color = 'error'
  else if (value >= 85) color = 'warning'

  return (
    <Box sx={{ width: '100%', minWidth: 100 }}>
      {showLabel ? (
        <Typography variant='caption' sx={{ mb: 0.5, display: 'block' }}>
          {Number(percent ?? 0).toFixed(1)}%
        </Typography>
      ) : null}
      <LinearProgress
        variant='determinate'
        value={Math.min(value, 100)}
        color={color}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  )
}

export default LifeProgressBar
