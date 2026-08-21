/**
 * Shared compact print checkbox — small square with ✓ (paper-form style, not MUI Checkbox).
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const DEFAULT_FONT = '"Times New Roman", Times, serif'

/** 10×10 bordered square; shows ✓ when checked. */
export const PrintCheckbox = ({ checked, fontFamily = DEFAULT_FONT }) => (
  <Box
    sx={{
      width: 10,
      height: 10,
      flexShrink: 0,
      mt: '1px',
      border: '1px solid #000',
      bgcolor: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 8,
      lineHeight: 1,
      fontFamily,
      fontWeight: 700
    }}
  >
    {checked ? '✓' : null}
  </Box>
)

/** Checkbox + label row for print forms. */
export const PrintCheckItem = ({
  checked,
  label,
  fontFamily = DEFAULT_FONT,
  fontSize = 8.5
}) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.4, py: 0, minHeight: 13 }}>
    <PrintCheckbox checked={Boolean(checked)} fontFamily={fontFamily} />
    <Typography component='div' sx={{ fontFamily, fontSize, lineHeight: 1.2, flex: 1 }}>
      {label}
    </Typography>
  </Box>
)
