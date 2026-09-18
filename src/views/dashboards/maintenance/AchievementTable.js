/**
 * Tabel "ACHIEVEMENT PROGRAM MAINTENANCE ALL SITE" — Plan vs Actual per site, program CBM, dan bulan.
 * Data dari GET /api/dashboard/achievement. Menangani #DIV/0! dengan menampilkan N/A atau —.
 */
import React from 'react'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'

const REMARK_KEYS = ['plan', 'actual', 'ach']
const REMARK_LABELS = { plan: 'PLAN', actual: 'ACTUAL', ach: 'ACH' }

/** Lebar seragam untuk kolom bulan dan AVG */
const MONTH_AVG_CELL_SX = { width: 72, minWidth: 72, maxWidth: 72, py: 1.5, px: 1.5, boxSizing: 'border-box' }

function formatAch(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'number') return `${Number(value).toFixed(2)}%`
  const n = Number(value)
  if (!Number.isNaN(n)) return `${n.toFixed(2)}%`
  
return String(value)
}

function formatNum(value) {
  if (value == null || value === '') return '—'
  
return Number(value) === 0 ? '0' : String(value)
}

/** Nilai AVG: PLAN/ACTUAL dibagi jumlah bulan yang sudah ada plannya; ACH tetap persen achievement tahunan */
function getAvgForRemark(key, totalPlan, totalActual, ach, monthsWithPlan) {
  const n = monthsWithPlan > 0 ? monthsWithPlan : 0
  if (key === 'plan') return n > 0 && totalPlan != null ? Math.round(totalPlan / n) : null
  if (key === 'actual') return n > 0 && totalActual != null ? Math.round(totalActual / n) : null
  
return ach
}

const AchievementTable = ({ data, loading, year, onYearChange, projectId, onProjectChange }) => {
  if (loading || !data) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color='text.secondary'>Memuat data achievement...</Typography>
      </Paper>
    )
  }

  const { projects = [], sites, types, programRows, siteTotals, allSiteAch, monthLabels } = data
  const noLabel = idx => (idx < 5 ? ['A', 'B', 'C', 'D', 'E'][idx] : '')


  // Jumlah bulan yang ada plannya (semua site)
  const allMonthsWithPlan = programRows.length
    ? (() => {
        let n = 0
        for (let i = 0; i < 12; i++) {
          if (programRows.some(r => (r.months?.[i]?.plan || 0) > 0)) n++
        }
        
return n
      })()
    : 0


  // Rata-rata ACH semua site (untuk kolom AVG baris All Site Ach)
  const allSiteAchAvg =
    siteTotals?.length > 0 ? siteTotals.reduce((s, t) => s + (t.ach ?? 0), 0) / siteTotals.length : null


  // Per bulan: ACH All Site = rata-rata ACH All Program tiap site
  const allSiteAchPerMonth = Array.from({ length: 12 }, (_, j) => {
    const siteAchs = sites
      .map(site => {
        const sitePrograms = programRows.filter(r => r.siteId === site.id)
        const plan = sitePrograms.reduce((s, r) => s + (r.months?.[j]?.plan || 0), 0)
        const actual = sitePrograms.reduce((s, r) => s + (r.months?.[j]?.actual || 0), 0)
        
return plan > 0 ? (actual / plan) * 100 : null
      })
      .filter(x => x != null)
    
return siteAchs.length ? Math.round((siteAchs.reduce((a, b) => a + b, 0) / siteAchs.length) * 100) / 100 : null
  })

  return (
    <Box>
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}
      >
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          Raw Data
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size='small' sx={{ minWidth: 140 }}>
            <InputLabel>Project</InputLabel>
            <Select
              value={projectId ?? ''}
              label='Project'
              onChange={e => onProjectChange(e.target.value === '' ? null : e.target.value)}
            >
              <MenuItem value=''>Semua</MenuItem>
              {projects.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size='small' sx={{ minWidth: 120 }}>
            <InputLabel>Tahun</InputLabel>
            <Select value={year} label='Tahun' onChange={e => onYearChange(e.target.value)}>
              {[year - 1, year, year + 1].map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      <TableContainer
        component={Paper}
        sx={{
          overflowX: 'auto',
          borderRadius: 2,
          boxShadow: theme => theme.shadows[2]
        }}
      >
        <Table size='small' stickyHeader sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell
                align='center'
                sx={{
                  minWidth: 44,
                  py: 2,
                  px: 1.5,
                  fontWeight: 700,
                  bgcolor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider'
                }}
              >
                NO
              </TableCell>
              <TableCell
                sx={{
                  minWidth: 140,
                  py: 2,
                  px: 1.5,
                  fontWeight: 700,
                  bgcolor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider'
                }}
              >
                PROGRAM CBM
              </TableCell>
              <TableCell
                align='center'
                sx={{
                  minWidth: 80,
                  py: 2,
                  px: 1.5,
                  fontWeight: 700,
                  bgcolor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider'
                }}
              >
                SITE
              </TableCell>
              <TableCell
                align='center'
                sx={{
                  minWidth: 70,
                  py: 2,
                  px: 1.5,
                  fontWeight: 700,
                  bgcolor: 'background.paper',
                  borderBottom: 2,
                  borderColor: 'divider'
                }}
              >
                REMARKS
              </TableCell>
              {monthLabels.map(label => (
                <TableCell
                  key={label}
                  align='center'
                  sx={{
                    ...MONTH_AVG_CELL_SX,
                    py: 2,
                    fontWeight: 700,
                    bgcolor: 'background.paper',
                    borderBottom: 2,
                    borderColor: 'divider'
                  }}
                >
                  {label}
                </TableCell>
              ))}
              <TableCell
                align='center'
                sx={{
                  ...MONTH_AVG_CELL_SX,
                  py: 2,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 700,
                  borderBottom: 2,
                  borderColor: 'primary.dark'
                }}
                title='AVG: PLAN dan ACTUAL = total ÷ jumlah bulan yang ada plannya; ACH = persen achievement tahunan'
              >
                AVG
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sites.map(site => {
              const sitePrograms = programRows.filter(r => r.siteId === site.id)
              const siteTotal = siteTotals.find(t => t.siteId === site.id)


              // Jumlah bulan yang ada plannya untuk site ini (min 1 program punya plan di bulan itu)
              const siteMonthsWithPlan = sitePrograms.length
                ? (() => {
                    let n = 0
                    for (let i = 0; i < 12; i++) {
                      if (sitePrograms.some(r => (r.months?.[i]?.plan || 0) > 0)) n++
                    }
                    
return n
                  })()
                : 0


              // ACH per bulan untuk All Program (total plan/actual site per bulan → ACH%)
              const siteAchPerMonth = sitePrograms.length
                ? Array.from({ length: 12 }, (_, i) => {
                    const plan = sitePrograms.reduce((s, r) => s + (r.months?.[i]?.plan || 0), 0)
                    const actual = sitePrograms.reduce((s, r) => s + (r.months?.[i]?.actual || 0), 0)
                    
return plan > 0 ? Math.round((actual / plan) * 1000) / 10 : null
                  })
                : []
              const rows = []
              types.forEach((type, typeIdx) => {
                const row = sitePrograms.find(r => r.typeId === type.id)
                if (!row) return
                const monthsWithPlan = (row.months || []).filter(m => (m.plan || 0) > 0).length
                REMARK_KEYS.forEach(key => {
                  const avgVal = getAvgForRemark(key, row.totalPlan, row.totalActual, row.ach, monthsWithPlan)
                  const isAch = key === 'ach'
                  rows.push({
                    no: key === 'plan' ? noLabel(typeIdx) : '',
                    program: key === 'plan' ? row.typeName.toUpperCase() : '',
                    site: key === 'plan' ? site.name : '',
                    remark: REMARK_LABELS[key],
                    isAch,
                    months: row.months.map(m => (isAch ? m.ach : formatNum(m[key]))),
                    avgDisplay: isAch ? avgVal : formatNum(avgVal)
                  })
                })
              })
              
return (
                <React.Fragment key={site.id}>
                  {rows.map((r, i) => (
                    <TableRow
                      key={`${site.id}-${r.remark}-${i}`}
                      sx={{
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'action.hover' },
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <TableCell
                        align='center'
                        sx={{ py: 1.5, px: 1.5, fontWeight: r.remark === 'ACH' ? 700 : undefined }}
                      >
                        {r.no}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: r.remark === 'PLAN' ? 600 : r.remark === 'ACH' ? 700 : 400,
                          py: 1.5,
                          px: 1.5
                        }}
                      >
                        {r.program}
                      </TableCell>
                      <TableCell
                        align='center'
                        sx={{ py: 1.5, px: 1.5, fontWeight: r.remark === 'ACH' ? 700 : undefined }}
                      >
                        {r.site}
                      </TableCell>
                      <TableCell
                        align='center'
                        sx={{ py: 1.5, px: 1.5, fontWeight: r.remark === 'ACH' ? 700 : undefined }}
                      >
                        {r.remark}
                      </TableCell>
                      {r.months.map((val, j) => (
                        <TableCell
                          key={j}
                          align='center'
                          sx={{ ...MONTH_AVG_CELL_SX, fontWeight: r.remark === 'ACH' ? 700 : undefined }}
                        >
                          {r.isAch ? formatAch(val) : val}
                        </TableCell>
                      ))}
                      <TableCell
                        align='center'
                        sx={{ ...MONTH_AVG_CELL_SX, fontWeight: r.remark === 'ACH' ? 700 : 500 }}
                      >
                        {r.isAch ? formatAch(r.avgDisplay) : r.avgDisplay}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow
                    sx={theme => ({
                      bgcolor: theme.palette.mode === 'dark' ? 'warning.dark' : 'warning.light',
                      color: theme.palette.mode === 'dark' ? 'warning.contrastText' : undefined,
                      '&:hover': { filter: 'brightness(0.97)' },
                      transition: 'filter 0.15s ease'
                    })}
                  >
                    <TableCell align='center' sx={{ py: 1.5, px: 1.5 }} />
                    <TableCell colSpan={2} sx={{ fontWeight: 700, py: 1.5, px: 1.5 }}>
                      All Program
                    </TableCell>
                    <TableCell align='center' sx={{ py: 1.5, px: 1.5, fontWeight: 700 }}>
                      ACH
                    </TableCell>
                    {siteAchPerMonth.map((achVal, j) => (
                      <TableCell key={j} align='center' sx={{ ...MONTH_AVG_CELL_SX, fontWeight: 700 }}>
                        {formatAch(achVal)}
                      </TableCell>
                    ))}
                    <TableCell align='center' sx={{ ...MONTH_AVG_CELL_SX, fontWeight: 700 }}>
                      {formatAch(siteTotal?.ach)}
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              )
            })}
            <TableRow
              sx={theme => ({
                bgcolor: theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.light',
                color: theme.palette.mode === 'dark' ? 'primary.contrastText' : 'primary.dark',
                '&:hover': { filter: 'brightness(0.97)' },
                transition: 'filter 0.15s ease'
              })}
            >
              <TableCell align='center' sx={{ py: 1.5, px: 1.5 }} />
              <TableCell colSpan={2} sx={{ fontWeight: 700, py: 1.5, px: 1.5 }}>
                All Site Ach
              </TableCell>
              <TableCell align='center' sx={{ py: 1.5, px: 1.5, fontWeight: 700 }}>
                ACH
              </TableCell>
              {allSiteAchPerMonth.map((achVal, j) => (
                <TableCell key={j} align='center' sx={{ ...MONTH_AVG_CELL_SX, fontWeight: 700 }}>
                  {formatAch(achVal)}
                </TableCell>
              ))}
              <TableCell align='center' sx={{ ...MONTH_AVG_CELL_SX, fontWeight: 700 }}>
                {formatAch(allSiteAchAvg)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default AchievementTable
