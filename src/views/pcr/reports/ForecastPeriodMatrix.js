/**
 * Pivot table — forecast count by Model → Component × Plan Periode.
 * Single sticky left column (tree) so freeze stays opaque while period columns scroll.
 */
import { useCallback, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'

/** Narrow sticky tree column — Model group + indented Component. */
const STICKY_WIDTH = 220
const PERIOD_COL_WIDTH = 72
const PRICE_PERIOD_COL_WIDTH = 96
const TOTAL_COL_WIDTH = 60
const PRICE_TOTAL_COL_WIDTH = 110

const stickyEdgeShadow = theme =>
  `4px 0 10px -4px ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.55)'}`

/** Fully opaque surfaces — translucent fills make scrolled cells bleed through sticky. */
function surface(theme, tone = 'paper') {
  if (tone === 'header') {
    return theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[900]
  }
  if (tone === 'group') {
    return theme.palette.mode === 'light' ? theme.palette.grey[50] : theme.palette.grey[900]
  }
  if (tone === 'hover') {
    return theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[800]
  }
  if (tone === 'total') {
    return theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800]
  }

  return theme.palette.background.paper
}

function CountCell({ value, emphasize = false, metric = 'count' }) {
  if (!value) {
    return (
      <Box
        component='span'
        sx={{
          display: 'inline-flex',
          minWidth: 22,
          justifyContent: 'center',
          color: 'text.disabled',
          fontSize: '0.75rem'
        }}
      >
        ·
      </Box>
    )
  }

  const display =
    metric === 'price'
      ? Number(value).toLocaleString('id-ID', { maximumFractionDigits: 0 })
      : value

  return (
    <Box
      component='span'
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: metric === 'price' ? 52 : 26,
        height: 22,
        px: 0.75,
        borderRadius: 1,
        fontSize: metric === 'price' ? '0.6875rem' : '0.75rem',
        fontWeight: 700,
        lineHeight: 1,
        color: emphasize ? 'primary.main' : 'text.primary',
        bgcolor: theme =>
          emphasize
            ? theme.palette.mode === 'light'
              ? theme.palette.primary.main + '1F'
              : theme.palette.primary.main + '38'
            : theme.palette.mode === 'light'
              ? theme.palette.grey[100]
              : theme.palette.grey[800]
      }}
    >
      {display}
    </Box>
  )
}

const stickyCellSx = (tone = 'paper') => ({
  position: 'sticky',
  left: 0,
  zIndex: 3,
  width: STICKY_WIDTH,
  minWidth: STICKY_WIDTH,
  maxWidth: STICKY_WIDTH,
  backgroundColor: theme => `${surface(theme, tone)} !important`,
  backgroundImage: 'none !important',
  boxShadow: stickyEdgeShadow,
  overflow: 'hidden'
})

const ForecastPeriodMatrix = ({ data, loading }) => {
  const periods = data?.periods ?? []
  const groups = data?.groups ?? []
  const grandTotals = data?.grandTotals ?? {}
  const grandTotal = data?.grandTotal ?? 0
  const metric = data?.metric === 'price' ? 'price' : 'count'
  const periodColWidth = metric === 'price' ? PRICE_PERIOD_COL_WIDTH : PERIOD_COL_WIDTH
  const totalColWidth = metric === 'price' ? PRICE_TOTAL_COL_WIDTH : TOTAL_COL_WIDTH

  const [collapsed, setCollapsed] = useState({})

  /** Default collapsed — expanding every model at once freezes the page on large matrices. */
  const isGroupCollapsed = useCallback(
    modelName => collapsed[modelName] !== false,
    [collapsed]
  )

  const toggleModel = useCallback(modelName => {
    setCollapsed(prev => {
      const currentlyCollapsed = prev[modelName] !== false

      return { ...prev, [modelName]: !currentlyCollapsed }
    })
  }, [])

  const empty = !loading && groups.length === 0

  const minWidth = useMemo(
    () => STICKY_WIDTH + periods.length * periodColWidth + totalColWidth + 8,
    [periods.length, periodColWidth, totalColWidth]
  )

  if (empty) {
    return (
      <Box sx={{ py: 10, textAlign: 'center' }}>
        <Typography color='text.secondary'>No data for the selected filters.</Typography>
      </Box>
    )
  }

  return (
    <TableContainer
      sx={{
        maxHeight: '72vh',
        overflow: 'auto',
        mx: 3,
        mb: 2,
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: 1
      }}
    >
      <Table
        stickyHeader
        size='small'
        sx={{
          minWidth,
          tableLayout: 'fixed',
          borderCollapse: 'separate',
          borderSpacing: 0,
          '& .MuiTableCell-root': {
            py: 0.65,
            px: 1,
            fontSize: '0.8125rem',
            lineHeight: 1.3,
            borderBottom: theme => `1px solid ${theme.palette.divider}`,
            whiteSpace: 'nowrap',
            verticalAlign: 'middle'
          }
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                ...stickyCellSx('header'),
                top: 0,
                zIndex: 6,
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                color: 'text.secondary',
                borderBottom: theme => `1px solid ${theme.palette.divider}`
              }}
            >
              Model / Component
            </TableCell>
            {periods.length === 0 ? (
              <TableCell
                align='center'
                sx={{
                  top: 0,
                  zIndex: 5,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  backgroundColor: theme => `${surface(theme, 'header')} !important`,
                  backgroundImage: 'none !important'
                }}
              >
                Plan Periode
              </TableCell>
            ) : (
              periods.map(period => (
                <TableCell
                  key={period.key}
                  align='center'
                  sx={{
                    top: 0,
                    zIndex: 5,
                    width: periodColWidth,
                    minWidth: periodColWidth,
                    maxWidth: periodColWidth,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    backgroundColor: theme => `${surface(theme, 'header')} !important`,
                    backgroundImage: 'none !important'
                  }}
                >
                  {period.label}
                </TableCell>
              ))
            )}
            <TableCell
              align='center'
              sx={{
                top: 0,
                zIndex: 5,
                width: totalColWidth,
                minWidth: totalColWidth,
                maxWidth: totalColWidth,
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                color: 'text.secondary',
                backgroundColor: theme => `${surface(theme, 'header')} !important`,
                backgroundImage: 'none !important'
              }}
            >
              Total
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map(group => {
            const isCollapsed = isGroupCollapsed(group.modelName)

            return (
              <FragmentGroup
                key={group.modelName}
                group={group}
                periods={periods}
                isCollapsed={isCollapsed}
                metric={metric}
                onToggle={() => toggleModel(group.modelName)}
              />
            )
          })}
          <TableRow>
            <TableCell
              sx={{
                ...stickyCellSx('total'),
                zIndex: 4,
                fontWeight: 700,
                fontSize: '0.8125rem'
              }}
            >
              Grand Total
            </TableCell>
            {periods.map(period => (
              <TableCell
                key={period.key}
                align='center'
                sx={{
                  backgroundColor: theme => `${surface(theme, 'total')} !important`,
                  backgroundImage: 'none !important'
                }}
              >
                <CountCell value={grandTotals[period.key]} emphasize metric={metric} />
              </TableCell>
            ))}
            <TableCell
              align='center'
              sx={{
                backgroundColor: theme => `${surface(theme, 'total')} !important`,
                backgroundImage: 'none !important'
              }}
            >
              <CountCell value={grandTotal} emphasize metric={metric} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function FragmentGroup({ group, periods, isCollapsed, metric, onToggle }) {
  return (
    <>
      <TableRow
        onClick={onToggle}
        sx={{
          cursor: 'pointer',
          '&:hover .period-matrix-sticky, &:hover td': {
            backgroundColor: theme => `${surface(theme, 'hover')} !important`
          }
        }}
      >
        <TableCell
          className='period-matrix-sticky'
          sx={{
            ...stickyCellSx('group'),
            fontWeight: 700
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <IconButton
              size='small'
              onClick={e => {
                e.stopPropagation()
                onToggle()
              }}
              sx={{ p: 0.15, flexShrink: 0, color: 'text.secondary' }}
            >
              <Icon icon={isCollapsed ? 'tabler:chevron-right' : 'tabler:chevron-down'} fontSize='0.95rem' />
            </IconButton>
            <Typography
              component='span'
              sx={{
                fontWeight: 700,
                fontSize: '0.8125rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0
              }}
            >
              {group.modelName}
            </Typography>
            <Typography
              component='span'
              sx={{
                flexShrink: 0,
                ml: 0.5,
                px: 0.6,
                py: 0.1,
                borderRadius: 0.75,
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'text.secondary',
                bgcolor: theme =>
                  theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800]
              }}
            >
              {group.rows.length}
            </Typography>
          </Box>
        </TableCell>
        {periods.map(period => (
          <TableCell
            key={period.key}
            align='center'
            sx={{
              backgroundColor: theme => `${surface(theme, 'group')} !important`,
              backgroundImage: 'none !important'
            }}
          >
            <CountCell value={group.totals[period.key]} emphasize metric={metric} />
          </TableCell>
        ))}
        <TableCell
          align='center'
          sx={{
            backgroundColor: theme => `${surface(theme, 'group')} !important`,
            backgroundImage: 'none !important'
          }}
        >
          <CountCell value={group.total} emphasize metric={metric} />
        </TableCell>
      </TableRow>

      {!isCollapsed
        ? group.rows.map(row => (
            <TableRow
              key={`${row.modelName}-${row.compDesc}`}
              sx={{
                '&:hover .period-matrix-sticky, &:hover td': {
                  backgroundColor: theme => `${surface(theme, 'hover')} !important`
                }
              }}
            >
              <TableCell className='period-matrix-sticky' sx={stickyCellSx('paper')}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 2.75, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      flexShrink: 0,
                      bgcolor: 'divider'
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.8125rem',
                      color: 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {row.compDesc}
                  </Typography>
                </Box>
              </TableCell>
              {periods.map(period => (
                <TableCell
                  key={period.key}
                  align='center'
                  sx={{
                    backgroundColor: theme => `${surface(theme, 'paper')} !important`,
                    backgroundImage: 'none !important'
                  }}
                >
                  <CountCell value={row.counts[period.key]} metric={metric} />
                </TableCell>
              ))}
              <TableCell
                align='center'
                sx={{
                  backgroundColor: theme => `${surface(theme, 'paper')} !important`,
                  backgroundImage: 'none !important'
                }}
              >
                <CountCell value={row.total} metric={metric} />
              </TableCell>
            </TableRow>
          ))
        : null}
    </>
  )
}

export default ForecastPeriodMatrix
