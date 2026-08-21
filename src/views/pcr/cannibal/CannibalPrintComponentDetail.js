/**
 * Cannibal BA print — Component Detail Information (Remove From / Install To).
 * Matches paper form ARKA/PLT/IV/09.01 Rev 5 layout.
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { getSingleTransfer } from 'src/utils/cannibal-transfer-form'

const FORM_FONT = '"Times New Roman", Times, serif'
/** Shared label column so lined + boxed rows stay aligned across both sides. */
const LABEL_WIDTH = 78
const FIELD_ROW_MIN = 17
const BOX_ROW_MIN = 18

const formatDate = value => (value ? String(value).slice(0, 10) : '')

const resolveUnitLabel = side => {
  const unitNo = side?.unitNo ?? side?.unit?.unitNo
  if (unitNo != null && String(unitNo).trim() !== '') return String(unitNo).trim()

  const fleetUnitId = side?.fleetUnitId
  if (fleetUnitId != null && String(fleetUnitId).trim() !== '') return `Unit #${fleetUnitId}`

  return ''
}

const labelSx = {
  fontFamily: FORM_FONT,
  fontSize: 9,
  fontWeight: 700,
  lineHeight: 1.15,
  whiteSpace: 'nowrap',
  letterSpacing: 0.1
}

const valueSx = {
  fontFamily: FORM_FONT,
  fontSize: 9,
  lineHeight: 1.15
}

const LinedField = ({ label, value }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: `${LABEL_WIDTH}px 1fr`,
      columnGap: 0.75,
      alignItems: 'end',
      mb: 0.55,
      minHeight: FIELD_ROW_MIN
    }}
  >
    <Typography sx={labelSx}>
      {label} :
    </Typography>
    <Box
      sx={{
        borderBottom: '1px solid #000',
        minHeight: FIELD_ROW_MIN - 2,
        pb: 0.2,
        display: 'flex',
        alignItems: 'flex-end'
      }}
    >
      <Typography sx={valueSx}>{value || '\u00A0'}</Typography>
    </Box>
  </Box>
)

const BoxedField = ({ label, value, bgcolor, isLast }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: `${LABEL_WIDTH}px 1fr`,
      columnGap: 0.75,
      alignItems: 'center',
      border: '1px solid #000',
      borderBottom: isLast ? '1px solid #000' : 'none',
      bgcolor,
      px: 0.65,
      py: 0.4,
      minHeight: BOX_ROW_MIN,
      printColorAdjust: 'exact',
      WebkitPrintColorAdjust: 'exact'
    }}
  >
    <Typography sx={labelSx}>{label}</Typography>
    <Typography sx={valueSx}>{value || '\u00A0'}</Typography>
  </Box>
)

/** Stack of same-color boxed rows (WO pink / HM yellow) with shared left edge. */
const BoxedGroup = ({ children, sx }) => (
  <Box
    sx={{
      mt: 0.65,
      overflow: 'hidden',
      ...sx
    }}
  >
    {children}
  </Box>
)

const TransferSidePrint = ({ title, side }) => (
  <Box
    sx={{
      height: '100%',
      px: 1.25,
      pt: 0.85,
      pb: 1,
      borderRight: '1px solid #000',
      '&:last-of-type': { borderRight: 'none' },
      boxSizing: 'border-box'
    }}
  >
    <Typography
      sx={{
        fontFamily: FORM_FONT,
        fontSize: 9.5,
        fontWeight: 700,
        textAlign: 'center',
        textTransform: 'uppercase',
        mb: 0.9,
        lineHeight: 1.2,
        letterSpacing: 0.2
      }}
    >
      {title}
    </Typography>

    <Box sx={{ mb: 0.15 }}>
      <LinedField label='Unit No.' value={resolveUnitLabel(side)} />
      <LinedField label='Date' value={formatDate(side?.date)} />
      <LinedField label='P/N' value={side?.pn} />
      <LinedField label='S/N' value={side?.sn} />
      <LinedField label='POS.' value={side?.pos} />
    </Box>

    <BoxedGroup>
      <BoxedField label='WO :' value={side?.woNoKanibal} bgcolor='#f8bbd0' />
      <BoxedField label='WO Status :' value={side?.woStatusKanibal} bgcolor='#f8bbd0' isLast />
    </BoxedGroup>

    <BoxedGroup sx={{ mt: 0.55 }}>
      <BoxedField
        label='HM Comp'
        value={side?.hmComp != null && side?.hmComp !== '' ? side.hmComp : ''}
        bgcolor='#fff59d'
        isLast
      />
    </BoxedGroup>
  </Box>
)

const CannibalPrintComponentDetail = ({ ba }) => {
  const transfer = getSingleTransfer(ba)

  return (
    <Box
      sx={{
        border: '1px solid #000',
        mb: 2,
        fontFamily: FORM_FONT,
        color: '#000',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          bgcolor: '#ff9800',
          borderBottom: '1px solid #000',
          textAlign: 'center',
          py: 0.5,
          px: 1.25
        }}
      >
        <Typography
          sx={{
            fontFamily: FORM_FONT,
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.25,
            lineHeight: 1.25
          }}
        >
          Component Detail Information ( Rincian Informasi Komponen )
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'stretch' }}>
        <TransferSidePrint title='Remove From ( Diambil Dari )' side={transfer.remove} />
        <TransferSidePrint title='Install To ( Dipasang Ke )' side={transfer.install} />
      </Box>
    </Box>
  )
}

export default CannibalPrintComponentDetail
