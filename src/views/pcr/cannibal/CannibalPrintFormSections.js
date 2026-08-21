/**
 * Cannibal BA print — failure block, statement / request by / component status (Rev 5 form layout).
 */
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import { PrintCheckItem } from 'src/views/pcr/cannibal/CannibalPrintCheckbox'
import {
  isComponentStatusOther,
  isComponentStatusResealOnly,
  logisticStatementFromFlags,
  normalizeComponentStatusLabel,
  plantStatementFromFlags
} from 'src/utils/cannibal-form-lookups'
import { getSingleTransfer } from 'src/utils/cannibal-transfer-form'
import { formatRequestorUser } from 'src/utils/cannibal-requestor'

const FORM_FONT = '"Times New Roman", Times, serif'

const formatDate = value => (value ? String(value).slice(0, 10) : '—')

const HEADER_LABEL_WIDTH = 88

const PrintHeaderFieldRow = ({ label, value }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: `${HEADER_LABEL_WIDTH}px 1fr`,
      columnGap: 0.75,
      alignItems: 'end',
      mb: 0.85
    }}
  >
    <Typography
      sx={{
        fontFamily: FORM_FONT,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        lineHeight: 1.2
      }}
    >
      {label} :
    </Typography>
    <Box sx={{ width: '100%', borderBottom: '1px solid #000', minHeight: 16, pb: 0.25 }}>
      <Typography sx={{ fontFamily: FORM_FONT, fontSize: 11, lineHeight: 1.25 }}>{value || '\u00A0'}</Typography>
    </Box>
  </Box>
)

/** Failure block — REPORT DATE / JOB SITE / COMPONENT + ruled failure lines (matches paper form). */
export const CannibalPrintFailureSection = ({ ba }) => {
  const transfer = getSingleTransfer(ba)
  const componentLabel = transfer?.remove?.compDesc?.trim() || transfer?.install?.compDesc?.trim() || ''
  const failureText = ba?.failure?.trim() || ''
  const ruledLineHeight = 18
  const ruledLineCount = 3

  return (
    <Box
      sx={{
        border: '1px solid #000',
        mb: 1.25,
        fontFamily: FORM_FONT,
        color: '#000'
      }}
    >
      <Box sx={{ px: 1.25, py: 1, borderBottom: '1px solid #000' }}>
        <PrintHeaderFieldRow label='Report Date' value={formatDate(ba?.postingDate)} />
        <PrintHeaderFieldRow label='Job Site' value={ba?.projectCode ?? ''} />
        <PrintHeaderFieldRow label='Component' value={componentLabel} />
      </Box>

      <Box sx={{ px: 1.25, py: 1 }}>
        <Typography
          sx={{
            fontFamily: FORM_FONT,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            lineHeight: 1.2
          }}
        >
          FAILURE / KERUSAKAN :
        </Typography>
        <Typography
          sx={{
            fontFamily: FORM_FONT,
            fontSize: 10,
            fontStyle: 'italic',
            lineHeight: 1.2,
            mt: 0.25,
            mb: 0.75
          }}
        >
          (diisi oleh Plant Department)
        </Typography>

        <Box
          sx={{
            minHeight: ruledLineHeight * ruledLineCount,
            // Hairline ruled lines (lighter + thinner than body border)
            backgroundImage: `repeating-linear-gradient(
              transparent,
              transparent ${ruledLineHeight - 0.5}px,
              #bdbdbd ${ruledLineHeight - 0.5}px,
              #bdbdbd ${ruledLineHeight}px
            )`,
            backgroundSize: `100% ${ruledLineHeight}px`,
            pt: '2px'
          }}
        >
          <Typography
            sx={{
              fontFamily: FORM_FONT,
              fontSize: 11,
              lineHeight: `${ruledLineHeight}px`,
              whiteSpace: 'pre-wrap',
              minHeight: ruledLineHeight * ruledLineCount
            }}
          >
            {failureText || '\u00A0'}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

const PrintSectionTitle = ({ children }) => (
  <Typography sx={{ fontFamily: FORM_FONT, fontSize: 9, fontWeight: 700, mb: 0.15, textTransform: 'uppercase' }}>
    {children}
  </Typography>
)

const DOTS = '........................................................'

const PrintOtherLine = ({ checked, text, prefix = 'Other' }) => {
  const filled = checked && text?.trim() ? text.trim() : ''

  return (
    <PrintCheckItem
      checked={checked}
      label={
        <Box component='span' sx={{ display: 'inline' }}>
          {prefix}{' '}
          <Box
            component='span'
            sx={{
              display: 'inline-block',
              minWidth: 100,
              borderBottom: filled ? 'none' : '1px dotted #000',
              fontFamily: FORM_FONT,
              fontSize: 8.5,
              lineHeight: 1.1,
              verticalAlign: 'bottom'
            }}
          >
            {filled || '\u00A0'}
          </Box>
        </Box>
      }
    />
  )
}

/** Print labels for Request By roles (match paper form wording). */
const PRINT_REQUEST_ROLE_OPTIONS = [
  { value: 'SUPT_PRODUCTION', label: 'Supt. Production' },
  { value: 'PJO', label: 'PJO' },
  { value: 'GM_OPERATION', label: 'General Manager Operation' },
  { value: 'GM_PLANT', label: 'General Manager Plant' }
]

/**
 * Paper form 2×2 order (Rev 5):
 *   Brand New        | As Is Repair
 *   PEX / Reman      | Other ........
 * RESEAL ONLY (legacy) is appended after the standard four.
 */
const PRINT_COMPONENT_STATUS_ORDER = ['BRAND NEW', 'AS IS REPAIR', 'PEX REMAN', 'OTHER', 'RESEAL ONLY']

const PRINT_COMPONENT_STATUS_LABELS = {
  'BRAND NEW': 'Brand New',
  'AS IS REPAIR': 'As Is Repair',
  'PEX REMAN': 'PEX / Reman',
  OTHER: 'Other',
  'RESEAL ONLY': 'Reseal Only'
}

const printComponentStatusLabel = statusItem => {
  const key = normalizeComponentStatusLabel(statusItem?.status)

  return PRINT_COMPONENT_STATUS_LABELS[key] || statusItem?.status || ''
}

const sortStatusesForPrintGrid = statuses =>
  [...statuses].sort((a, b) => {
    const ia = PRINT_COMPONENT_STATUS_ORDER.indexOf(normalizeComponentStatusLabel(a.status))
    const ib = PRINT_COMPONENT_STATUS_ORDER.indexOf(normalizeComponentStatusLabel(b.status))
    const rankA = ia === -1 ? 998 : ia
    const rankB = ib === -1 ? 998 : ib

    if (rankA !== rankB) return rankA - rankB

    return (a.idStatus ?? 0) - (b.idStatus ?? 0)
  })

export const CannibalPrintComponentStatusSection = ({ ba, statuses = [] }) => {
  const selectedId = Number(ba?.idStatus)
  const visibleStatuses = sortStatusesForPrintGrid(
    statuses.filter(
      statusItem => !isComponentStatusResealOnly(statusItem) || Number(statusItem.idStatus) === selectedId
    )
  )

  const selectedStatus = visibleStatuses.find(item => Number(item.idStatus) === selectedId)
  const statusIsOther = isComponentStatusOther(selectedStatus)

  return (
    <Box
      sx={{
        border: '1px solid #000',
        mb: 1.25,
        fontFamily: FORM_FONT,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact'
      }}
    >
      <Box
        sx={{
          bgcolor: '#ffe0b2',
          borderBottom: '1px solid #000',
          textAlign: 'center',
          py: 0.25,
          px: 1
        }}
      >
        <Typography sx={{ fontFamily: FORM_FONT, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
          Cannibalized Component Status (Status Komponen Yang Dikanibal)
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 1,
          rowGap: 0.35,
          alignItems: 'flex-start',
          px: 1,
          py: 0.45
        }}
      >
        {visibleStatuses.map(statusItem => {
          const isSelected = Number(statusItem.idStatus) === selectedId
          const isOther = isComponentStatusOther(statusItem)
          const otherText = isOther && statusIsOther ? ba?.statusOther?.trim() : ''
          const label = printComponentStatusLabel(statusItem)

          return (
            <Box key={statusItem.idStatus} sx={{ minWidth: 0 }}>
              {isOther ? (
                <PrintOtherLine checked={isSelected} text={otherText} prefix={label} />
              ) : (
                <PrintCheckItem checked={isSelected} label={label} />
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

/**
 * Plant + Logistic + Request By block — matches paper form ARKA/PLT/IV/09.01 Rev 5.
 * Layout: Plant | Logistic (top); Request By roles + TTD sit under Plant (left half only).
 */
export const CannibalPrintStatementsSection = ({ ba }) => {
  const plantSelected = plantStatementFromFlags(ba)
  const logisticSelected = logisticStatementFromFlags(ba)
  const selectedRole = ba?.cannibalRequestRole ?? ''
  const requestorName = ba?.requestedConfirmedAt ? formatRequestorUser(ba?.requestor) : ''
  const leadTimeDays =
    logisticSelected === 'lead_time' && ba?.logisticLeadTimeDays ? String(ba.logisticLeadTimeDays) : ''

  return (
    <Box
      sx={{
        border: '1px solid #000',
        mb: 1.25,
        fontFamily: FORM_FONT,
        color: '#000',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact'
      }}
    >
      <Box
        sx={{
          bgcolor: '#ffeb3b',
          borderBottom: '1px solid #000',
          textAlign: 'center',
          py: 0.25,
          px: 1
        }}
      >
        <Typography sx={{ fontFamily: FORM_FONT, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>
          Please Complete The Section Below (Wajib Mengisi Kolom Di Bawah Ini)
        </Typography>
      </Box>

      <Box sx={{ px: 1, py: 0.5 }}>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <PrintSectionTitle>Plant Statement*</PrintSectionTitle>
            <PrintCheckItem checked={plantSelected === 'p1'} label='P1 Unit RFU' />
            <PrintCheckItem checked={plantSelected === 'production'} label='Production Requirements' />
            <PrintOtherLine checked={plantSelected === 'other'} text={ba?.plantOtherText} />
            <Typography sx={{ fontFamily: FORM_FONT, fontSize: 7.5, mt: 0.25, mb: 0.75, lineHeight: 1.15 }}>
              *at least 2 columns must be checked
            </Typography>

            {/* Left half only: roles + TTD beside them (matches paper form under Plant). */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'stretch',
                justifyContent: 'space-between',
                gap: 2,
                width: '100%'
              }}
            >
              <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                <PrintSectionTitle>Cannibal Request By :</PrintSectionTitle>
                {PRINT_REQUEST_ROLE_OPTIONS.map(option => (
                  <PrintCheckItem
                    key={option.value}
                    checked={selectedRole === option.value}
                    label={option.label}
                  />
                ))}
              </Box>

              <Box
                sx={{
                  flex: '0 0 42%',
                  maxWidth: 150,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  pt: 0.15,
                  pb: 0.1
                }}
              >
                <Typography
                  sx={{
                    fontFamily: FORM_FONT,
                    fontSize: 8,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    width: '100%'
                  }}
                >
                  Request By
                </Typography>
                <Box sx={{ width: '100%', textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontFamily: FORM_FONT,
                      fontSize: 8.5,
                      textAlign: 'center',
                      width: '100%',
                      borderBottom: requestorName ? '1px solid #000' : 'none',
                      pb: 0.1
                    }}
                  >
                    {requestorName ? `( ${requestorName} )` : `(${DOTS})`}
                  </Typography>
                  {ba?.requestedConfirmedAt ? (
                    <Typography sx={{ fontFamily: FORM_FONT, fontSize: 7, color: '#555', textAlign: 'center' }}>
                      {formatDate(ba.requestedConfirmedAt)}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <PrintSectionTitle>Logistic Statement*</PrintSectionTitle>
            <PrintCheckItem checked={logisticSelected === 'no_stock'} label='No Stock' />
            <PrintCheckItem
              checked={logisticSelected === 'lead_time'}
              label={
                <Box component='span'>
                  Lead Time Part (Est{' '}
                  <Box
                    component='span'
                    sx={{
                      display: 'inline-block',
                      minWidth: 48,
                      borderBottom: leadTimeDays ? 'none' : '1px dotted #000',
                      textAlign: 'center',
                      verticalAlign: 'bottom'
                    }}
                  >
                    {leadTimeDays || '\u00A0'}
                  </Box>
                  {leadTimeDays ? ' days' : ''} )
                </Box>
              }
            />
            <PrintOtherLine checked={logisticSelected === 'other'} text={ba?.logisticOtherText} />
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default CannibalPrintStatementsSection
