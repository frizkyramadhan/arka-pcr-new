/**
 * Cannibal BA print — approval signature box matching paper form.
 * APPROVED BY (PS) | CONFIRMED BY (Logistic) | ACKNOWLEDGE BY (PM → PD).
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const PRINT_FONT = 'Arial, Helvetica, sans-serif'

const STAMP_STYLES = {
  APPROVED: {
    color: '#00c853',
    borderColor: '#00c853',
    textShadow: '1px 1px 0 #fff59d, -1px -1px 0 #fff59d',
    label: 'APPROVED'
  },
  REJECTED: {
    color: '#d32f2f',
    borderColor: '#d32f2f',
    textShadow: '1px 1px 0 #ffcc80, -1px -1px 0 #ffcc80',
    label: 'REJECTED'
  },
  WAITING: {
    color: '#e65100',
    borderColor: '#ffc107',
    textShadow: '1px 1px 0 #fff9c4, -1px -1px 0 #fff9c4',
    label: 'WAITING'
  },
  CONFIRMED: {
    color: '#00c853',
    borderColor: '#00c853',
    textShadow: '1px 1px 0 #fff59d, -1px -1px 0 #fff59d',
    label: 'CONFIRMED'
  }
}

/** Columns matching paper form signature row. */
const SIGNATURE_BLOCKS = [
  { key: 'PS', roleTitle: 'PLANT DEPT HEAD', group: 'approved', level: 'PS' },
  { key: 'LOGISTIC', roleTitle: 'LOGISTIC', group: 'confirmed' },
  { key: 'PM', roleTitle: 'PROJECT MANAGER', group: 'acknowledge', level: 'PM' },
  { key: 'OGM', roleTitle: 'GM OPERATION', group: 'acknowledge', level: 'OGM' },
  { key: 'PGM', roleTitle: 'GM PLANT', group: 'acknowledge', level: 'PGM' },
  { key: 'OD', roleTitle: 'OPERATIONAL DIRECTOR', group: 'acknowledge', level: 'OD' },
  { key: 'PD', roleTitle: 'PRESIDENT DIRECTOR', group: 'acknowledge', level: 'PD' }
]

const formatUser = user => user?.fullName || user?.username || ''

const getApprovalByLevel = (ba, level) => ba?.approvals?.find(item => item.level === level) ?? null

const resolveStampStatus = (ba, block) => {
  if (block.group === 'confirmed') {
    return ba?.statementConfirmedBy ? 'CONFIRMED' : 'WAITING'
  }

  const approval = getApprovalByLevel(ba, block.level)
  if (!approval || approval.status === 'PENDING') return 'WAITING'
  if (approval.status === 'APPROVED') return 'APPROVED'
  if (approval.status === 'NOT APPROVED' || approval.status === 'REJECTED') return 'REJECTED'

  return 'WAITING'
}

const resolveSignerName = (ba, block) => {
  if (block.group === 'confirmed') {
    return ba?.statementConfirmedBy ? formatUser(ba.statementConfirmer) : ''
  }

  const approval = getApprovalByLevel(ba, block.level)
  if (!approval) return ''
  if (approval.status === 'APPROVED' || approval.status === 'NOT APPROVED' || approval.status === 'REJECTED') {
    return formatUser(approval.user)
  }

  return ''
}

const ApprovalStamp = ({ status }) => {
  const config = STAMP_STYLES[status]

  return (
    <Box
      className='ba-kanibal-stamp'
      sx={{
        display: 'inline-block',
        border: `2px solid ${config.borderColor}`,
        color: config.color,
        px: 0.75,
        py: 0.4,
        fontWeight: 800,
        fontSize: status === 'WAITING' ? 6 : 7.5,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        textAlign: 'center',
        lineHeight: 1.15,
        fontFamily: PRINT_FONT,
        textShadow: config.textShadow,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        maxWidth: '100%'
      }}
    >
      {config.label}
    </Box>
  )
}

const groupHeaderColSpan = group => SIGNATURE_BLOCKS.filter(block => block.group === group).length

const CannibalPrintApprovalBox = ({ ba }) => (
  <Box sx={{ mb: 2 }}>
    <Box
      component='table'
      sx={{
        width: '100%',
        borderCollapse: 'collapse',
        border: '1px solid #000',
        tableLayout: 'fixed',
        fontFamily: PRINT_FONT
      }}
    >
      <thead>
        <tr>
          <Box
            component='th'
            colSpan={groupHeaderColSpan('approved')}
            sx={{
              border: '1px solid #000',
              p: '2px 3px',
              fontSize: 8,
              fontWeight: 700,
              textAlign: 'center',
              fontFamily: PRINT_FONT,
              textTransform: 'uppercase'
            }}
          >
            Approved By
          </Box>
          <Box
            component='th'
            colSpan={groupHeaderColSpan('confirmed')}
            sx={{
              border: '1px solid #000',
              p: '2px 3px',
              fontSize: 8,
              fontWeight: 700,
              textAlign: 'center',
              fontFamily: PRINT_FONT,
              textTransform: 'uppercase'
            }}
          >
            Confirmed By
          </Box>
          <Box
            component='th'
            colSpan={groupHeaderColSpan('acknowledge')}
            sx={{
              border: '1px solid #000',
              p: '2px 3px',
              fontSize: 8,
              fontWeight: 700,
              textAlign: 'center',
              fontFamily: PRINT_FONT,
              textTransform: 'uppercase'
            }}
          >
            Acknowledge By
          </Box>
        </tr>
      </thead>
      <tbody>
        <tr>
          {SIGNATURE_BLOCKS.map(block => {
            const status = resolveStampStatus(ba, block)
            const signerName = resolveSignerName(ba, block)

            return (
              <Box
                component='td'
                key={block.key}
                sx={{
                  border: '1px solid #000',
                  p: '3px 2px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  height: 48,
                  width: `${100 / SIGNATURE_BLOCKS.length}%`
                }}
              >
                <ApprovalStamp status={status} />
                <Typography
                  sx={{
                    fontFamily: PRINT_FONT,
                    fontSize: 7,
                    fontWeight: 700,
                    textDecoration: signerName ? 'underline' : 'none',
                    mt: 0.4,
                    minHeight: 9,
                    lineHeight: 1.15
                  }}
                >
                  {signerName || '\u00A0'}
                </Typography>
              </Box>
            )
          })}
        </tr>
        <tr>
          {SIGNATURE_BLOCKS.map(block => (
            <Box
              component='td'
              key={`${block.key}-role`}
              sx={{
                border: '1px solid #000',
                p: '3px 2px',
                fontSize: 6.5,
                fontWeight: 700,
                textAlign: 'center',
                textTransform: 'uppercase',
                fontFamily: PRINT_FONT,
                lineHeight: 1.2
              }}
            >
              ({block.roleTitle})
            </Box>
          ))}
        </tr>
      </tbody>
    </Box>
  </Box>
)

export default CannibalPrintApprovalBox
