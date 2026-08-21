/**
 * Achievement PCR tahunan — tabel Projek × Kategori × Jan–Dec + Grand Total Ach.
 * Layout mengikuti spreadsheet Achievement PCR (Total / Close / Open / Ach).
 */

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import CustomChip from 'src/@core/components/mui/chip'

import AchievementDot from './AchievementDot'

const DEFAULT_CATEGORY_ROWS = [
  { key: 'total', label: 'Total Kebutuhan PCR', field: 'total' },
  { key: 'close', label: 'Close', field: 'close' },
  { key: 'open', label: 'Open', field: 'open' },
  { key: 'ach', label: 'Ach', field: 'ach', isAch: true }
]

const stickySx = (theme, left, zIndex = 2) => ({
  position: 'sticky',
  left,
  zIndex,
  bgcolor: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`
})

/**
 * @param {{
 *   year: number
 *   months?: string[]
 *   projects?: Array<{ projectCode: string, months: Record<string, object> }>
 *   grandTotal?: Record<string, object>
 *   title?: string
 *   subheader?: string
 *   emptyMessage?: string
 *   footerLabel?: string
 *   categoryRows?: Array<{ key: string, label: string, field: string, isAch?: boolean }>
 * }} props
 */
const AchievementPcrTable = ({
  year,
  months = [],
  projects = [],
  grandTotal = {},
  title,
  subheader = 'Total, Close, Open, and Ach% by project × month',
  emptyMessage,
  footerLabel = 'Grand Total Ach PCR',
  categoryRows = DEFAULT_CATEGORY_ROWS
}) => {
  const theme = useTheme()

  const monthKeys = months.length
    ? months
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const tableTitle = title ?? `Achievement PCR ${year}`
  const noDataMessage = emptyMessage ?? `No PCR forecast data for ${year}.`

  const cellAlign = 'center'
  const headerBg = alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.08 : 0.16)

  return (
    <Card>
      <CardHeader
        title={tableTitle}
        subheader={subheader}
        titleTypographyProps={{ variant: 'h6' }}
        subheaderTypographyProps={{ variant: 'body2' }}
        action={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', pr: 2 }}>
            <CustomChip rounded skin='light' size='small' color='success' label='≥ 80%' />
            <CustomChip rounded skin='light' size='small' color='warning' label='50–79%' />
            <CustomChip rounded skin='light' size='small' color='error' label='< 50%' />
          </Box>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {projects.length === 0 ? (
          <Typography variant='body2' sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
            {noDataMessage}
          </Typography>
        ) : (
          <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
            <Table size='small' sx={{ minWidth: 960, borderCollapse: 'separate', borderSpacing: 0 }}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      ...stickySx(theme, 0, 3),
                      bgcolor: headerBg,
                      fontWeight: 700,
                      minWidth: 88
                    }}
                  >
                    Project
                  </TableCell>
                  <TableCell
                    sx={{
                      ...stickySx(theme, 88, 3),
                      bgcolor: headerBg,
                      fontWeight: 700,
                      minWidth: 168
                    }}
                  >
                    Category
                  </TableCell>
                  {monthKeys.map(month => (
                    <TableCell
                      key={month}
                      align={cellAlign}
                      sx={{ bgcolor: headerBg, fontWeight: 700, minWidth: 64 }}
                    >
                      {month}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {projects.map(project =>
                  categoryRows.map((category, catIndex) => (
                    <TableRow
                      key={`${project.projectCode}-${category.key}`}
                      hover
                      sx={{
                        bgcolor:
                          category.isAch && theme.palette.mode === 'light'
                            ? alpha(theme.palette.action.hover, 0.4)
                            : undefined
                      }}
                    >
                      {catIndex === 0 ? (
                        <TableCell
                          rowSpan={categoryRows.length}
                          sx={{
                            ...stickySx(theme, 0),
                            fontWeight: 700,
                            verticalAlign: 'middle',
                            borderBottom: `1px solid ${theme.palette.divider}`
                          }}
                        >
                          {project.projectCode}
                        </TableCell>
                      ) : null}
                      <TableCell
                        sx={{
                          ...stickySx(theme, 88),
                          fontWeight: category.isAch ? 600 : 400,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {category.label}
                      </TableCell>
                      {monthKeys.map(month => {
                        const cell = project.months?.[month]
                        const value = cell?.[category.field]

                        if (category.isAch) {
                          return (
                            <TableCell key={month} align={cellAlign}>
                              <AchievementDot ach={value} />
                            </TableCell>
                          )
                        }

                        return (
                          <TableCell key={month} align={cellAlign}>
                            {value ?? 0}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))
                )}

                <TableRow
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.06 : 0.14)
                  }}
                >
                  <TableCell
                    colSpan={2}
                    sx={{
                      ...stickySx(theme, 0, 2),
                      fontWeight: 700,
                      bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.06 : 0.14)
                    }}
                  >
                    {footerLabel}
                  </TableCell>
                  {monthKeys.map(month => (
                    <TableCell key={month} align={cellAlign} sx={{ fontWeight: 700 }}>
                      <AchievementDot ach={grandTotal[month]?.ach} />
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default AchievementPcrTable
