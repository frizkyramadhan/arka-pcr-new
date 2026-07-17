/**
 * Label + field row — layout seperti form kertas BA (label kiri, input kanan).
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const CannibalFormRow = ({ label, children, highlight = null, compact = false, cozy = false, print = false, hideLabel = false }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      minHeight: print ? 24 : cozy ? 42 : compact ? 36 : 44,
      px: print ? 1 : cozy ? 3 : compact ? 1.5 : 2,
      py: print ? 0.25 : cozy ? 0.75 : compact ? 0.25 : 0.5,
      borderBottom: theme => `1px solid ${theme.palette.divider}`,
      ...(highlight === 'wo' ? { bgcolor: 'rgba(244, 67, 54, 0.08)' } : {}),
      ...(highlight === 'hm' ? { bgcolor: 'rgba(255, 193, 7, 0.15)' } : {})
    }}
  >
    {hideLabel ? null : (
      <Typography
        variant='body2'
        sx={{
          width: print ? 72 : cozy ? 96 : compact ? 92 : 108,
          flexShrink: 0,
          color: 'text.secondary',
          fontWeight: 500,
          fontSize: print ? '9px' : compact ? '0.8125rem' : undefined
        }}
      >
        {label}:
      </Typography>
    )}
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        '& .MuiAutocomplete-root .MuiFormControl-root': { mt: 0, mb: 0 },
        '& .MuiFormHelperText-root': { m: 0 }
      }}
    >
      {children}
    </Box>
  </Box>
)

export default CannibalFormRow
