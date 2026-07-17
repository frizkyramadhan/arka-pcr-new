/**
 * Detail field — label + value for cannibal read-only views.
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const CannibalDetailField = ({ label, value, multiline = false, boxed = false, highlight = false }) => {
  const content = (
    <>
      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 600, letterSpacing: 0.2 }}>
        {label}
      </Typography>
      <Typography
        variant={multiline ? 'body2' : 'body1'}
        sx={{
          whiteSpace: multiline ? 'pre-wrap' : 'normal',
          fontWeight: multiline ? 400 : 500,
          lineHeight: multiline ? 1.6 : 1.4,
          color: value ? 'text.primary' : 'text.disabled'
        }}
      >
        {value || '—'}
      </Typography>
    </>
  )

  if (!boxed) {
    return <Box sx={{ mb: multiline ? 0 : 2 }}>{content}</Box>
  }

  return (
    <Box
      sx={{
        p: 3,
        height: '100%',
        borderRadius: 2,
        border: theme => `1px solid ${theme.palette.divider}`,
        bgcolor: highlight ? 'action.hover' : 'background.paper'
      }}
    >
      {content}
    </Box>
  )
}

export default CannibalDetailField
