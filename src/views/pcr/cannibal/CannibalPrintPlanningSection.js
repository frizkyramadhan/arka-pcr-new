/**
 * Cannibal BA print — Record & Documentation / Action by Planning section.
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { PrintCheckItem } from 'src/views/pcr/cannibal/CannibalPrintCheckbox'
import { isPlanningActionSelected, PLANNING_ACTION_OPTIONS } from 'src/utils/cannibal-form-lookups'

const PRINT_FONT = 'Arial, Helvetica, sans-serif'

const LEFT_ACTIONS = [
  PLANNING_ACTION_OPTIONS[0].label,
  PLANNING_ACTION_OPTIONS[2].label,
  PLANNING_ACTION_OPTIONS[3].label
]

const MIDDLE_ACTION = PLANNING_ACTION_OPTIONS[1].label

const DOC_COLUMNS = ['Update Component Schedule', 'Closing Work Order', 'Filling Document']

const CheckItem = ({ checked, label }) => (
  <PrintCheckItem checked={checked} label={label} fontFamily={PRINT_FONT} fontSize={9} />
)

const RefField = ({ label, value }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 16 }}>
    <Typography sx={{ fontFamily: PRINT_FONT, fontSize: 9, fontWeight: 700, minWidth: 28 }}>{label}</Typography>
    <Box
      sx={{
        flex: 1,
        minHeight: 16,
        border: '1px solid #000',
        bgcolor: '#fff',
        px: 0.75,
        display: 'flex',
        alignItems: 'center'
      }}
    >
      <Typography sx={{ fontFamily: PRINT_FONT, fontSize: 9, lineHeight: 1.2 }}>{value || '\u00A0'}</Typography>
    </Box>
  </Box>
)

const CannibalPrintPlanningSection = ({ ba }) => {
  const refRows = [
    { label: 'MR#', value: ba?.mrNo },
    { label: 'PR#', value: ba?.prNo },
    { label: 'PO#', value: ba?.poNo }
  ]

  return (
    <Box
      sx={{
        border: '1px solid #000',
        bgcolor: '#fff9c4',
        mb: 0,
        fontFamily: PRINT_FONT,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact'
      }}
    >
      <Box
        sx={{
          bgcolor: '#000',
          color: '#fff',
          textAlign: 'center',
          py: 0.5,
          px: 1,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.5
        }}
      >
        ***** RECORD AND DOCUMENTATION *****
      </Box>

      <Box sx={{ p: 1.5, borderBottom: '1px solid #000' }}>
        <Typography
          sx={{
            fontFamily: PRINT_FONT,
            fontSize: 10,
            fontWeight: 700,
            fontStyle: 'italic',
            mb: 1
          }}
        >
          ACTION BY PLANING SECTION
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.95fr 0.75fr',
            columnGap: 2,
            rowGap: 0.5,
            alignItems: 'start'
          }}
        >
          <CheckItem checked={isPlanningActionSelected(ba, LEFT_ACTIONS[0])} label={LEFT_ACTIONS[0]} />
          <CheckItem checked={isPlanningActionSelected(ba, MIDDLE_ACTION)} label={MIDDLE_ACTION} />
          <RefField label={refRows[0].label} value={refRows[0].value} />

          <CheckItem checked={isPlanningActionSelected(ba, LEFT_ACTIONS[1])} label={LEFT_ACTIONS[1]} />
          <Box />
          <RefField label={refRows[1].label} value={refRows[1].value} />

          <CheckItem checked={isPlanningActionSelected(ba, LEFT_ACTIONS[2])} label={LEFT_ACTIONS[2]} />
          <Box />
          <RefField label={refRows[2].label} value={refRows[2].value} />
        </Box>
      </Box>

      <Box
        component='table'
        sx={{
          width: '100%',
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          fontFamily: PRINT_FONT
        }}
      >
        <thead>
          <tr>
            {DOC_COLUMNS.map(title => (
              <Box
                component='th'
                key={title}
                sx={{
                  borderRight: '1px solid #000',
                  borderBottom: '1px solid #000',
                  p: '4px 6px',
                  fontSize: 9,
                  fontWeight: 700,
                  textAlign: 'center',
                  width: '33.33%',
                  '&:last-of-type': { borderRight: 'none' }
                }}
              >
                {title}
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {DOC_COLUMNS.map(title => (
              <Box
                component='td'
                key={`${title}-sign`}
                sx={{
                  borderRight: '1px solid #000',
                  height: 72,
                  verticalAlign: 'bottom',
                  p: '8px 10px 10px',
                  width: '33.33%',
                  '&:last-of-type': { borderRight: 'none' }
                }}
              >
                <Typography sx={{ fontFamily: PRINT_FONT, fontSize: 9, textAlign: 'center', mb: 1 }}>
                  (...........................)
                </Typography>
                <Typography sx={{ fontFamily: PRINT_FONT, fontSize: 9 }}>
                  Date: _______________
                </Typography>
              </Box>
            ))}
          </tr>
        </tbody>
      </Box>
    </Box>
  )
}

export default CannibalPrintPlanningSection
