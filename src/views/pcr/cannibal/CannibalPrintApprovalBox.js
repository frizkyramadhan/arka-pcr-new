/**
 * Cannibal BA print — approval signature box (APPROVED BY / ACKNOWLEDGE BY).
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
    label: 'WAITING APPROVAL'
  }
}

const APPROVAL_BLOCKS = [
  { level: 'PS', roleTitle: 'PLANT DEPT HEAD', group: 'approved' },
  { level: 'PM', roleTitle: 'PROJECT MANAGER', group: 'acknowledge' },
  { level: 'PLM', roleTitle: 'PLANT MANAGER', group: 'acknowledge' },
  { level: 'OGM', roleTitle: 'GM OPERATIONAL', group: 'acknowledge' },
  { level: 'OD', roleTitle: 'OPERATIONAL DIRECTOR', group: 'acknowledge' }
]

const APPROVED_BY_COUNT = APPROVAL_BLOCKS.filter(block => block.group === 'approved').length
const ACKNOWLEDGE_BY_COUNT = APPROVAL_BLOCKS.filter(block => block.group === 'acknowledge').length

const headerCellSx = {
  border: '0px solid #000',
  borderTop: 'none',
  p: '4px 6px',
  fontSize: 10,
  fontWeight: 700,
  textAlign: 'center',
  fontFamily: PRINT_FONT,
  textTransform: 'uppercase',
  verticalAlign: 'middle'
}

const bodyCellSx = {
  border: '0px solid #000',
  borderTop: 'none',
  p: '6px 4px',
  textAlign: 'center',
  verticalAlign: 'middle',
  fontFamily: PRINT_FONT,
  width: '20%'
}

const signatureCellSx = {
  ...bodyCellSx,
  height: 44,
  verticalAlign: 'middle'
}

const roleCellSx = {
  ...bodyCellSx,
  fontSize: 8.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  py: 1
}

const formatUser = user => user?.fullName || user?.username || ''

const getApprovalByLevel = (ba, level) => ba?.approvals?.find(item => item.level === level) ?? null

const resolveStampStatus = (ba, level) => {
  const approval = getApprovalByLevel(ba, level)
  if (!approval || approval.status === 'PENDING') return 'WAITING'
  if (approval.status === 'APPROVED') return 'APPROVED'
  if (approval.status === 'NOT APPROVED' || approval.status === 'REJECTED') return 'REJECTED'

  return 'WAITING'
}

const resolveSignerName = (ba, level) => {
  const approval = getApprovalByLevel(ba, level)
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
        border: `3px solid ${config.borderColor}`,
        color: config.color,
        px: 1.25,
        py: 0.75,
        fontWeight: 800,
        fontSize: status === 'WAITING' ? 8 : 10,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        textAlign: 'center',
        lineHeight: 1.2,
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
          <Box component='th' colSpan={APPROVED_BY_COUNT} sx={{ ...headerCellSx, borderLeft: 'none' }}>
            APPROVED BY
          </Box>
          <Box component='th' colSpan={ACKNOWLEDGE_BY_COUNT} sx={{ ...headerCellSx, borderRight: 'none' }}>
            ACKNOWLEDGE BY
          </Box>
        </tr>
      </thead>
      <tbody>
        <tr>
          {APPROVAL_BLOCKS.map(block => {
            const status = resolveStampStatus(ba, block.level)
            const signerName = resolveSignerName(ba, block.level)

            return (
              <Box component='td' key={block.level} sx={signatureCellSx}>
                <ApprovalStamp status={status} />
                <Typography
                  sx={{
                    fontFamily: PRINT_FONT,
                    fontSize: 9,
                    fontWeight: 700,
                    textDecoration: signerName ? 'underline' : 'none',
                    mt: 0.75,
                    minHeight: 12,
                    lineHeight: 1.2
                  }}
                >
                  {signerName || '\u00A0'}
                </Typography>
              </Box>
            )
          })}
        </tr>
        <tr>
          {APPROVAL_BLOCKS.map(block => (
            <Box component='td' key={`${block.level}-role`} sx={roleCellSx}>
              ({block.roleTitle})
            </Box>
          ))}
        </tr>
      </tbody>
    </Box>
  </Box>
)

export default CannibalPrintApprovalBox
