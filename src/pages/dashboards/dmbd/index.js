/**
 * Daily Monitoring Unit Breakdown.
 * Susunan data mengikuti rancangan DMBD. Warna dan komponen mengikuti template Vuexy,
 * sama dengan dashboard Fundamental Maintenance Control.
 * Site = project. Plant = plant type. Category = plant group.
 * MTTR, MTBF, dan PA memakai target KPI yang sama dengan dashboard maintenance.
 * Auto refresh default 5 menit, juga saat tab kembali aktif.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'
import { useTheme } from '@mui/material/styles'
import * as XLSX from 'xlsx'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import ReactApexcharts from 'src/@core/components/react-apexcharts'
import { useAuth } from 'src/hooks/useAuth'
import useProjects from 'src/hooks/useProjects'
import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate, formatDisplayDateTime } from 'src/utils/date-format'
import {
  formatKpiValue,
  formatTarget,
  kpiMark,
  MARKS,
  StatusMark
} from 'src/views/dashboards/maintenance-control/shared'

const STATUS_COLOR = { BD: 'error', RFU: 'success', OP: 'warning', SB: 'info', AJ: 'secondary' }
const UNIT_COLORS = ['primary', 'info', 'success', 'warning', 'secondary']

const currentMonthValue = () => {
  const now = new Date()

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const shiftMonth = (value, delta) => {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const stepButtonSx = {
  width: 40,
  minWidth: 40,
  maxWidth: 40,
  height: '100%',
  p: 0,
  flex: '0 0 40px',
  borderRadius: 1,
  border: theme => `1px solid ${theme.palette.divider}`
}

/** Fixed month box so the gap on each side of the input stays equal. */
const monthFieldSx = {
  width: 180,
  minWidth: 180,
  maxWidth: 180,
  m: 0,
  flex: '0 0 180px',
  alignItems: 'stretch',
  '& .MuiInputBase-root': { width: '100%', height: '100%', minWidth: 0 },
  '& .MuiInputBase-input': { width: '100%', minWidth: 0 }
}

const formatQty = value => {
  if (value == null || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'

  return number.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

const formatStamp = formatDisplayDateTime

const formatTrendDay = value => {
  if (/^\d{4}-\d{2}$/.test(value)) {
    const date = new Date(`${value}-01T00:00:00`)

    return date.toLocaleDateString('en-GB', { month: 'short' })
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const unitChipColor = unitNo => {
  const text = String(unitNo || '')
  let hash = 0
  for (let index = 0; index < text.length; index += 1) hash += text.charCodeAt(index)

  return UNIT_COLORS[hash % UNIT_COLORS.length]
}

const pdfSafe = value =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const pdfEscape = value => pdfSafe(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')

/** PDF tabel sederhana, landscape, tanpa library tambahan. */
const downloadTablePdf = records => {
  const lines = [
    'Daily Monitoring Breakdown',
    'Site | Unit | Model | Category | Status | BD Age | HM | Problem | PIC',
    ...records.map(row =>
      [
        row.site,
        row.unitNo,
        row.model,
        row.category,
        row.status,
        row.ageHours ?? '',
        row.hourMeter ?? '',
        row.problem,
        row.pic
      ]
        .map(pdfSafe)
        .join(' | ')
        .slice(0, 150)
    )
  ]
  const chunks = []
  for (let index = 0; index < lines.length; index += 32) chunks.push(lines.slice(index, index + 32))
  if (!chunks.length) chunks.push(['No data'])

  let body = '%PDF-1.4\n'
  const offsets = []

  const write = (id, content) => {
    offsets[id] = body.length
    body += `${id} 0 obj\n${content}\nendobj\n`
  }

  const pages = chunks.map(chunk => {
    const text = chunk.map(line => `(${pdfEscape(line)}) Tj`).join(' T*\n')

    return `BT /F1 9 Tf 36 560 Td 14 TL\n${text}\nET`
  })
  const kids = pages.map((_, index) => `${5 + index * 2} 0 R`).join(' ')

  write(1, '<< /Type /Catalog /Pages 2 0 R >>')
  write(2, `<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`)
  write(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  pages.forEach((stream, index) => {
    const contentId = 4 + index * 2
    const pageId = contentId + 1
    write(contentId, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
    write(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`
    )
  })

  const size = 4 + pages.length * 2
  const start = body.length
  body += `xref\n0 ${size}\n`
  body += '0000000000 65535 f \n'
  for (let id = 1; id < size; id += 1) body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  body += `trailer << /Size ${size} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`

  const blob = new Blob([body], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'dmbd-dashboard.pdf'
  link.click()
  URL.revokeObjectURL(url)
}

const Delta = ({ value, digits = 0, label = 'vs yesterday' }) => {
  if (value == null) {
    return (
      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
        — vs yesterday
      </Typography>
    )
  }

  const up = value > 0
  const down = value < 0
  const color = up ? 'success.main' : down ? 'error.main' : 'text.secondary'
  const icon = up ? 'tabler:arrow-up' : down ? 'tabler:arrow-down' : 'tabler:minus'

  const amount = Math.abs(value).toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits ? 1 : 0
  })

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color }}>
      <Icon icon={icon} fontSize='0.95rem' />
      <Typography variant='caption' sx={{ color, fontWeight: 600 }}>
        {amount} {label}
      </Typography>
    </Box>
  )
}

const ReliabilityCard = ({ kpi, icon }) => {
  const mark = kpiMark(kpi)
  const missing = mark === 'noData' || mark === 'notBuilt'

  return (
    <Tooltip title={[kpi?.note, kpi?.detail].filter(Boolean).join(' · ')} arrow placement='bottom'>
      <Card
        sx={{
          p: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          borderTop: theme => `3px solid ${theme.palette[MARKS[mark].mui].main}`,
          opacity: missing ? 0.75 : 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'primary.main' }}>
          <Icon icon={icon} fontSize='1.35rem' />
          <Typography variant='caption' sx={{ fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.2, flex: 1 }}>
            {kpi?.label}
          </Typography>
        </Box>
        <Typography variant='h4' sx={{ fontWeight: 700, color: missing ? 'text.disabled' : 'text.primary' }}>
          {formatKpiValue(kpi)}
        </Typography>
        <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {missing ? MARKS[mark].label : `Target ${formatTarget(kpi)}`}
          </Typography>
          <StatusMark kpi={kpi} />
        </Box>
      </Card>
    </Tooltip>
  )
}

const ProjectDownCard = ({ card, onOpen }) => (
  <Card
    onClick={onOpen}
    sx={{
      p: 3,
      minWidth: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
      borderTop: theme => `3px solid ${theme.palette.error.main}`,
      cursor: onOpen ? 'pointer' : 'default',
      '&:hover': onOpen ? { boxShadow: 6 } : undefined
    }}
  >
    <Typography
      variant='caption'
      sx={{ fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'text.secondary' }}
    >
      {card.site}
    </Typography>
    <Typography variant='h4' sx={{ fontWeight: 700 }}>
      {card.total}{' '}
      <Typography component='span' variant='body2' sx={{ color: 'text.secondary' }}>
        Unit
      </Typography>
    </Typography>
    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
      Breakdown {card.breakdown} · Waiting {card.waitingPart} · Repair {card.underRepair}
    </Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {card.units.slice(0, 8).map(unit => (
        <CustomChip
          key={unit.id}
          size='small'
          skin='light'
          color={STATUS_COLOR[unit.status] || 'error'}
          label={unit.unitNo}
        />
      ))}
      {card.units.length > 8 ? (
        <Typography variant='caption' sx={{ color: 'text.secondary', alignSelf: 'center' }}>
          +{card.units.length - 8}
        </Typography>
      ) : null}
    </Box>
  </Card>
)

const KpiCard = ({ icon, color, label, value, unit, delta, digits, compareLabel }) => (
  <Card
    sx={{
      p: 3,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
      borderTop: theme => `3px solid ${theme.palette[color].main}`
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: `${color}.main` }}>
      <Icon icon={icon} fontSize='1.35rem' />
      <Typography variant='caption' sx={{ fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.2 }}>
        {label}
      </Typography>
    </Box>
    <Typography variant='h4' sx={{ fontWeight: 700 }}>
      {value}
      <Typography component='span' variant='body2' sx={{ ml: 1, color: 'text.secondary', fontWeight: 600 }}>
        {unit}
      </Typography>
    </Typography>
    <Box sx={{ mt: 'auto' }}>
      <Delta value={delta} digits={digits} label={compareLabel} />
    </Box>
  </Card>
)

const Field = ({ label, children, sx }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 180, flex: '1 1 180px', ...sx }}>
    <Typography
      variant='caption'
      sx={{ mb: 1, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}
    >
      {label}
    </Typography>
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>{children}</Box>
  </Box>
)

const Panel = ({ title, action, children }) => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Box sx={{ px: 4, pt: 3.5, pb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Typography variant='h6' sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
        {title}
      </Typography>
      {action}
    </Box>
    <Box sx={{ px: 4, pb: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</Box>
  </Card>
)

const DetailLink = ({ onClick }) => (
  <CustomChip
    size='small'
    skin='light'
    color='primary'
    label='View Detail'
    icon={<Icon icon='tabler:list-search' fontSize='0.9rem' />}
    onClick={onClick}
    sx={{ cursor: 'pointer', '& .MuiChip-icon': { ml: 1 } }}
  />
)

const EmptyChart = ({ text }) => (
  <Box
    sx={{
      flex: 1,
      minHeight: 160,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'text.disabled',
      border: theme => `1px dashed ${theme.palette.divider}`,
      borderRadius: 1
    }}
  >
    <Typography variant='body2' sx={{ color: 'text.secondary', textAlign: 'center', px: 4 }}>
      {text}
    </Typography>
  </Box>
)

const DmbdDashboardPage = () => {
  const theme = useTheme()
  const router = useRouter()
  const { user } = useAuth()
  const { projects: projectsFromApi } = useProjects()
  const [projectId, setProjectId] = useState('')
  const [plant, setPlant] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [period, setPeriod] = useState(currentMonthValue)
  const [mode, setMode] = useState('YTD')
  const [search, setSearch] = useState('')
  const [autoOn, setAutoOn] = useState(true)
  const [everyMin, setEveryMin] = useState(5)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [history, setHistory] = useState([])

  const projectCodes = useMemo(
    () => (user?.projectCodes ?? []).map(code => String(code).trim().toUpperCase()).filter(Boolean),
    [user?.projectCodes]
  )
  const isHeadOffice = projectCodes.includes('000H') || projectCodes.includes('001H')

  const siteCodes = useMemo(() => projectCodes.filter(code => code !== '000H' && code !== '001H'), [projectCodes])
  const projectLocked = !isHeadOffice && siteCodes.length === 1

  const projectOptions = useMemo(() => {
    const list = projectsFromApi || []
    if (isHeadOffice) return list
    if (!projectCodes.length) return []

    return list.filter(project =>
      projectCodes.includes(
        String(project.value ?? '')
          .trim()
          .toUpperCase()
      )
    )
  }, [isHeadOffice, projectCodes, projectsFromApi])

  useEffect(() => {
    if (!projectLocked) return
    const only = projectOptions[0]?.value
    if (only) setProjectId(String(only))
  }, [projectLocked, projectOptions])

  const load = useCallback(
    async silent => {
      if (!silent) setLoading(true)
      try {
        const response = await arkaApi.get('/dashboard/dmbd', {
          params: {
            ...(projectId ? { projectCode: projectId } : {}),
            ...(plant ? { plant } : {}),
            ...(category ? { category } : {}),
            ...(status ? { status } : {}),
            period,
            mode
          }
        })
        setData(response.data)
        setError(null)
      } catch (loadError) {
        setError(loadError?.response?.data?.error || 'Could not load the DMBD dashboard')
      } finally {
        setLoading(false)
      }
    },
    [projectId, plant, category, status, period, mode]
  )

  useEffect(() => {
    load(false)
  }, [load])

  useEffect(() => {
    if (!autoOn) return undefined
    const timer = setInterval(() => load(true), everyMin * 60 * 1000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') load(true)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [autoOn, everyMin, load])

  useEffect(() => {
    if (!selected) {
      setDetail(null)
      setHistory([])

      return undefined
    }
    let cancelled = false
    const breakdownId = String(selected.id).startsWith('ready-') ? '' : selected.id
    const detailRequest = breakdownId ? arkaApi.get(`/breakdowns/${breakdownId}`) : Promise.resolve(null)

    const historyRequest = arkaApi.get('/breakdowns', {
      params: { unitId: selected.fleetUnitId, page: 0, pageSize: 20, sortField: 'startedAt', sortOrder: 'desc' }
    })

    Promise.all([detailRequest, historyRequest])
      .then(([detailResponse, historyResponse]) => {
        if (cancelled) return
        setDetail(detailResponse?.data ?? null)
        setHistory(historyResponse.data?.data ?? [])
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null)
          setHistory([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [selected, data?.updatedAt])

  const projectCards = useMemo(() => {
    const grouped = new Map()
    for (const row of data?.rows ?? []) {
      if (!row?.status || row.status === 'RFU' || row.bucket === 'ready') continue
      const site = row.site || '—'
      const card = grouped.get(site) ?? { site, total: 0, breakdown: 0, waitingPart: 0, underRepair: 0, units: [] }
      card.total += 1
      if (row.bucket === 'waiting_part') card.waitingPart += 1
      else if (row.bucket === 'under_repair') card.underRepair += 1
      else card.breakdown += 1
      card.units.push(row)
      grouped.set(site, card)
    }

    return [...grouped.values()].sort((a, b) => a.site.localeCompare(b.site))
  }, [data])

  const rows = useMemo(() => {
    const list = data?.rows ?? []
    const query = search.trim().toLowerCase()
    if (!query) return list

    return list.filter(row =>
      [row.site, row.unitNo, row.model, row.category, row.problem, row.pic, row.status].some(value =>
        String(value || '')
          .toLowerCase()
          .includes(query)
      )
    )
  }, [data, search])

  const reset = () => {
    if (!projectLocked) setProjectId('')
    setPlant('')
    setCategory('')
    setStatus('')
    setPeriod(currentMonthValue())
    setMode('YTD')
    setSearch('')
  }

  const showTable = () => document.getElementById('dmbd-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(
      rows.map(row => ({
        Site: row.site,
        'Unit No': row.unitNo,
        'Unit Model': row.model || '',
        Category: row.category || '',
        Status: row.status,
        'BD Age (Hours)': row.ageHours ?? '',
        'HM / KM': row.hourMeter ?? '',
        'Problem / Condition': row.problem || '',
        PIC: row.pic || ''
      }))
    )
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'DMBD')
    XLSX.writeFile(book, 'dmbd-dashboard.xlsx')
  }

  const kpis = data?.kpis
  const siteTitle = projectId || 'All Site'
  const plantOptions = data?.options?.plants ?? []
  const categoryOptions = data?.options?.categories ?? []
  const labelColor = theme.palette.text.secondary

  const chartBase = {
    chart: { toolbar: { show: false }, background: 'transparent' },
    grid: { borderColor: theme.palette.divider },
    dataLabels: { style: { colors: [theme.palette.text.primary] } }
  }

  const columns = [
    { field: 'site', headerName: 'Site', minWidth: 90, flex: 0.5 },
    {
      field: 'unitNo',
      headerName: 'Unit No',
      minWidth: 130,
      renderCell: ({ value }) => <CustomChip size='small' skin='light' color={unitChipColor(value)} label={value} />
    },
    { field: 'model', headerName: 'Unit Model', minWidth: 140, flex: 0.7, valueFormatter: ({ value }) => value || '—' },
    {
      field: 'category',
      headerName: 'Category',
      minWidth: 150,
      flex: 0.7,
      renderCell: ({ value }) => (
        <Typography variant='body2' sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
          {value || '—'}
        </Typography>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 100,
      renderCell: ({ value }) => (
        <CustomChip size='small' skin='light' color={STATUS_COLOR[value] || 'secondary'} label={value || '—'} />
      )
    },
    {
      field: 'ageHours',
      headerName: 'BD Age (Hours)',
      minWidth: 140,
      type: 'number',
      valueFormatter: ({ value }) => formatQty(value)
    },
    {
      field: 'hourMeter',
      headerName: 'HM / KM',
      minWidth: 110,
      type: 'number',
      valueFormatter: ({ value }) => formatQty(value)
    },
    {
      field: 'problem',
      headerName: 'Problem / Condition',
      flex: 1,
      minWidth: 220,
      renderCell: ({ value }) => (
        <Typography variant='body2' sx={{ whiteSpace: 'normal', lineHeight: 1.35, py: 1 }}>
          {value || '—'}
        </Typography>
      )
    },
    { field: 'pic', headerName: 'PIC', minWidth: 130, valueFormatter: ({ value }) => value || '—' }
  ]

  return (
    <Grid container spacing={5}>
      <Grid item xs={12} sx={{ display: 'flex', alignItems: 'flex-start', gap: 4, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 280 }}>
          <Typography variant='h4' sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Daily Monitoring Unit Breakdown – {siteTitle}
          </Typography>
          <Typography sx={{ color: 'text.secondary' }}>
            Monitoring kondisi unit breakdown secara real time di seluruh site
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Button
            component={Link}
            href={projectId ? `/reports/breakdowns/?projectCode=${encodeURIComponent(projectId)}` : '/reports/breakdowns/'}
            variant='tonal'
            color='primary'
            startIcon={<Icon icon='tabler:file-analytics' />}
          >
            Summary Breakdown
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch size='small' color='success' checked={autoOn} onChange={event => setAutoOn(event.target.checked)} />
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                Auto refresh
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                {autoOn ? `Setiap ${everyMin} menit` : 'Dimatikan'}
              </Typography>
            </Box>
          </Box>
          <CustomTextField
            select
            size='small'
            label='Interval'
            value={everyMin}
            disabled={!autoOn}
            onChange={event => setEveryMin(Number(event.target.value))}
            sx={{ width: 150 }}
          >
            {[1, 5, 10, 15].map(minutes => (
              <MenuItem key={minutes} value={minutes}>
                Every {minutes} min
              </MenuItem>
            ))}
          </CustomTextField>
        </Box>
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 4 }}>
            <Field label='Period' sx={{ flex: '0 0 auto', minWidth: 0 }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'stretch', gap: 2 }}>
                <Tooltip title='Previous month'>
                  <IconButton sx={stepButtonSx} onClick={() => setPeriod(current => shiftMonth(current, -1))}>
                    <Icon icon='tabler:chevron-left' />
                  </IconButton>
                </Tooltip>
                <CustomTextField
                  type='month'
                  size='small'
                  value={period}
                  inputProps={{ max: currentMonthValue() }}
                  onChange={event => {
                    const next = event.target.value
                    if (next && next <= currentMonthValue()) setPeriod(next)
                  }}
                  sx={monthFieldSx}
                />
                <Tooltip title='Next month'>
                  <Box component='span' sx={{ display: 'inline-flex', width: 40, flex: '0 0 40px' }}>
                    <IconButton
                      sx={stepButtonSx}
                      disabled={period >= currentMonthValue()}
                      onClick={() => setPeriod(current => shiftMonth(current, 1))}
                    >
                      <Icon icon='tabler:chevron-right' />
                    </IconButton>
                  </Box>
                </Tooltip>
              </Box>
            </Field>
            <Field label='View' sx={{ flex: '0 0 auto', minWidth: 0 }}>
              <ToggleButtonGroup
                exclusive
                color='primary'
                value={mode}
                onChange={(_event, next) => {
                  if (next) setMode(next)
                }}
                sx={{ height: '100%', '& .MuiToggleButton-root': { height: '100%', px: 5, py: 0 } }}
              >
                <ToggleButton value='MTD'>MTD</ToggleButton>
                <ToggleButton value='YTD'>YTD</ToggleButton>
              </ToggleButtonGroup>
            </Field>
            <Field label='Site'>
              <SearchableSelect
                value={projectId}
                disabled={projectLocked}
                disableClearable={projectLocked}
                onChange={event => {
                  setProjectId(event.target.value || '')
                  setPlant('')
                  setCategory('')
                }}
                options={[
                  ...(projectLocked ? [] : [{ value: '', label: 'All Site' }]),
                  ...projectOptions.map(project => ({
                    value: String(project.value),
                    label: project.label || project.value
                  }))
                ]}
              />
            </Field>
            <Field label='Plant'>
              <SearchableSelect
                value={plant}
                onChange={event => setPlant(event.target.value || '')}
                options={[
                  { value: '', label: 'All Plant' },
                  ...plantOptions.map(item => ({ value: item, label: item }))
                ]}
              />
            </Field>
            <Field label='Category'>
              <SearchableSelect
                value={category}
                onChange={event => setCategory(event.target.value || '')}
                options={[
                  { value: '', label: 'All Category' },
                  ...categoryOptions.map(item => ({ value: item, label: item }))
                ]}
              />
            </Field>
            <Field label='Status'>
              <SearchableSelect
                value={status}
                onChange={event => setStatus(event.target.value || '')}
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'breakdown', label: 'Breakdown' },
                  { value: 'waiting_part', label: 'Waiting Part' },
                  { value: 'under_repair', label: 'Under Repair' },
                  { value: 'ready', label: 'Ready (RFU)' }
                ]}
              />
            </Field>
            <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button variant='tonal' color='secondary' startIcon={<Icon icon='tabler:refresh' />} onClick={reset}>
                Reset
              </Button>
            </Box>
          </Box>
          {data?.period?.mode ? (
            <Typography variant='body2' sx={{ color: 'text.secondary', mt: 4 }}>
              Showing{' '}
              <Box component='span' sx={{ fontWeight: 600 }}>
                {data.period.mode}
              </Box>{' '}
              {formatDisplayDate(data.period.start)} – {formatDisplayDate(data.period.end)}. Month to date is the
              selected month only. Year to date is 1 January through the end of the selected month.
            </Typography>
          ) : null}
        </Card>
      </Grid>

      {loading && !data ? (
        <Grid item xs={12} sx={{ pt: '0 !important' }}>
          <LinearProgress />
        </Grid>
      ) : null}
      {error ? (
        <Grid item xs={12}>
          <Alert severity='error'>{error}</Alert>
        </Grid>
      ) : null}

      {kpis ? (
        <>
          <Grid item xs={12}>
            <Box
              sx={{
                display: 'grid',
                gap: 4,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)', xl: 'repeat(6, 1fr)' }
              }}
            >
              <KpiCard
                icon='tabler:calendar-stats'
                color='primary'
                label='Total unit'
                value={formatQty(kpis.totalUnits)}
                unit='Unit'
                delta={kpis.delta.totalUnits}
                compareLabel={data.period?.compareLabel}
              />
              <KpiCard
                icon='tabler:alert-triangle'
                color='error'
                label='Breakdown'
                value={formatQty(kpis.breakdown)}
                unit='Unit'
                delta={kpis.delta.breakdown}
                compareLabel={data.period?.compareLabel}
              />
              <KpiCard
                icon='tabler:clock'
                color='warning'
                label='Waiting part'
                value={formatQty(kpis.waitingPart)}
                unit='Unit'
                delta={kpis.delta.waitingPart}
                compareLabel={data.period?.compareLabel}
              />
              <KpiCard
                icon='tabler:tool'
                color='info'
                label='Under repair'
                value={formatQty(kpis.underRepair)}
                unit='Unit'
                delta={kpis.delta.underRepair}
                compareLabel={data.period?.compareLabel}
              />
              <KpiCard
                icon='tabler:circle-check'
                color='success'
                label='Ready (RFU)'
                value={formatQty(kpis.ready)}
                unit='Unit'
                delta={kpis.delta.ready}
                compareLabel={data.period?.compareLabel}
              />
              <KpiCard
                icon='tabler:clock-hour-4'
                color='secondary'
                label='Total lost hours'
                value={formatQty(kpis.lostHours)}
                unit='Hours'
                delta={kpis.delta.lostHours}
                digits={1}
                compareLabel={data.period?.compareLabel}
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box
              sx={{
                display: 'grid',
                gap: 4,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }
              }}
            >
              <ReliabilityCard kpi={data.reliability?.mttr} icon='tabler:tool' />
              <ReliabilityCard kpi={data.reliability?.mtbf} icon='tabler:clock-hour-4' />
              <ReliabilityCard kpi={data.reliability?.pa} icon='tabler:chart-bar' />
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Panel
              title={data.period?.mode ? `Breakdown trend (${data.period.mode})` : 'Breakdown trend (last 7 days)'}
            >
              <ReactApexcharts
                type='area'
                height={250}
                series={[{ name: 'Unit', data: data.trend.map(day => day.count) }]}
                options={{
                  ...chartBase,
                  colors: [theme.palette.primary.main],
                  stroke: { curve: 'smooth', width: 3 },
                  fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
                  markers: { size: 4 },
                  dataLabels: {
                    enabled: true,
                    style: { colors: [theme.palette.text.primary] },
                    background: { enabled: false }
                  },
                  xaxis: {
                    categories: data.trend.map(day => formatTrendDay(day.date)),
                    labels: { style: { colors: labelColor } }
                  },
                  yaxis: { labels: { style: { colors: labelColor } } }
                }}
              />
            </Panel>
          </Grid>
          <Grid item xs={12} md={4}>
            <Panel title='Breakdown by site' action={<DetailLink onClick={showTable} />}>
              {data.bySite.length ? (
                <ReactApexcharts
                  type='pie'
                  height={280}
                  series={data.bySite.map(item => item.count)}
                  options={{
                    chart: { toolbar: { show: false }, background: 'transparent' },
                    labels: data.bySite.map(item => item.name),
                    colors: [
                      theme.palette.primary.main,
                      theme.palette.error.main,
                      theme.palette.warning.main,
                      theme.palette.info.main,
                      theme.palette.success.main,
                      theme.palette.secondary.main,
                      theme.palette.primary.dark,
                      theme.palette.error.dark
                    ],
                    stroke: { width: 2, colors: [theme.palette.background.paper] },
                    legend: {
                      position: 'right',
                      labels: { colors: theme.palette.text.primary },
                      formatter: (name, opts) => {
                        const value = opts.w.globals.series[opts.seriesIndex]
                        const total = opts.w.globals.series.reduce((sum, item) => sum + item, 0)
                        const percent = total ? Math.round((value / total) * 100) : 0

                        return `${name} (${value}) ${percent}%`
                      }
                    },
                    dataLabels: {
                      enabled: true,
                      formatter: value => `${Math.round(value)}%`
                    },
                    tooltip: { y: { formatter: value => `${value} unit` } }
                  }}
                />
              ) : (
                <EmptyChart text='Tidak ada data.' />
              )}
            </Panel>
          </Grid>
          <Grid item xs={12} md={4}>
            <Panel title='Breakdown by component (top 5)' action={<DetailLink onClick={showTable} />}>
              {data.byComponent.length ? (
                <ReactApexcharts
                  type='bar'
                  height={250}
                  series={[{ name: 'Unit', data: data.byComponent.map(item => item.count) }]}
                  options={{
                    ...chartBase,
                    colors: [theme.palette.warning.main],
                    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
                    dataLabels: { enabled: true, style: { colors: [theme.palette.text.primary] } },
                    xaxis: {
                      categories: data.byComponent.map(item => item.name),
                      labels: { style: { colors: labelColor } }
                    },
                    yaxis: { labels: { style: { colors: theme.palette.text.primary, fontSize: '11px' } } }
                  }}
                />
              ) : (
                <EmptyChart text='Tidak ada data.' />
              )}
            </Panel>
          </Grid>
          {projectCards.length ? (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, mb: 4 }}>
                {projectLocked ? null : (
                  <Button
                    variant='tonal'
                    color='secondary'
                    size='small'
                    startIcon={<Icon icon='tabler:refresh' />}
                    disabled={!projectId}
                    onClick={() => setProjectId('')}
                  >
                    Reset
                  </Button>
                )}
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gap: 4,
                  gridTemplateColumns: `repeat(${projectCards.length}, minmax(0, 1fr))`
                }}
              >
                {projectCards.map(card => (
                  <ProjectDownCard
                    key={card.site}
                    card={card}
                    onOpen={projectLocked ? undefined : () => setProjectId(card.site)}
                  />
                ))}
              </Box>
            </Grid>
          ) : null}
          <Grid item xs={12} xl={8} id='dmbd-table'>
            <Card sx={{ height: '100%' }}>
              <Box sx={{ px: 4, pt: 3.5, pb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant='h6' sx={{ fontWeight: 600, flex: 1, minWidth: 200 }}>
                  Daily monitoring breakdown
                </Typography>
                <CustomTextField
                  size='small'
                  placeholder='Search unit / model / problem'
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  sx={{ minWidth: 240 }}
                />
                <Button
                  variant='tonal'
                  color='success'
                  startIcon={<Icon icon='tabler:file-spreadsheet' />}
                  onClick={exportExcel}
                  disabled={!rows.length}
                >
                  Export Excel
                </Button>
                <Button
                  variant='tonal'
                  startIcon={<Icon icon='tabler:file-type-pdf' />}
                  onClick={() => downloadTablePdf(rows)}
                  disabled={!rows.length}
                >
                  Export PDF
                </Button>
              </Box>
              <DataGrid
                autoHeight
                rows={rows}
                columns={columns}
                disableRowSelectionOnClick
                getRowHeight={() => 'auto'}
                pageSizeOptions={[6, 10, 25]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 6 } },
                  sorting: { sortModel: [{ field: 'ageHours', sort: 'desc' }] }
                }}
                localeText={{
                  MuiTablePagination: {
                    labelDisplayedRows: ({ from, to, count }) => `Showing ${from} to ${to} of ${count} data`
                  }
                }}
                onRowClick={({ row }) => setSelected(row)}
                sx={{
                  border: 0,
                  '& .MuiDataGrid-row': { cursor: 'pointer' },
                  '& .MuiDataGrid-cell': { alignItems: 'center' }
                }}
              />
            </Card>
          </Grid>
          <Grid item xs={12} xl={4}>
            <Panel
              title='Longest breakdown (top 5)'
              action={
                <Button variant='tonal' size='small' onClick={showTable}>
                  View all
                </Button>
              }
            >
              {(data.longest ?? []).length === 0 ? (
                <EmptyChart text='Tidak ada unit breakdown.' />
              ) : (
                data.longest.map(row => (
                  <Box
                    key={row.id}
                    onClick={() => setSelected(row)}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 2,
                      py: 2,
                      borderBottom: theme => `1px solid ${theme.palette.divider}`,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{row.unitNo}</Typography>
                      <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                        {row.site}
                        {row.category ? ` · ${row.category}` : ''}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: 'error.main' }}>{formatQty(row.ageHours)} hrs</Typography>
                  </Box>
                ))
              )}
            </Panel>
          </Grid>
          <Grid item xs={12}>
            <Typography variant='caption' sx={{ display: 'block', textAlign: 'center', color: 'text.secondary' }}>
              {autoOn ? `Data auto refresh setiap ${everyMin} menit` : 'Auto refresh dimatikan'}
            </Typography>
          </Grid>
        </>
      ) : null}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth='md'>
        <DialogTitle>{selected ? `${selected.unitNo} · ${selected.site}` : 'Unit'}</DialogTitle>
        <DialogContent dividers>
          {selected ? (
            <Grid container spacing={4}>
              <Grid item xs={6} md={3}>
                <Typography variant='caption' color='text.secondary'>
                  Status
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{selected.status}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant='caption' color='text.secondary'>
                  Start BD
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatStamp(selected.startedAt)}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant='caption' color='text.secondary'>
                  Duration (hrs)
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatQty(selected.ageHours)}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant='caption' color='text.secondary'>
                  HM
                </Typography>
                <Typography sx={{ fontWeight: 600 }}>{formatQty(selected.hourMeter)}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant='caption' color='text.secondary'>
                  Problem
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{selected.problem || '—'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant='subtitle2'>Detail breakdown</Typography>
                {(detail?.activities ?? []).length === 0 ? (
                  <Typography color='text.secondary'>Tidak ada activity terbuka.</Typography>
                ) : (
                  detail.activities.map(activity => (
                    <Typography key={activity.id} variant='body2' sx={{ mt: 1 }}>
                      {activity.breakdownCode} · {activity.positionStatus} · {formatStamp(activity.startedAt)}
                      {activity.details ? ` — ${activity.details}` : ''}
                    </Typography>
                  ))
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant='subtitle2'>History</Typography>
                {history.length === 0 ? (
                  <Typography color='text.secondary'>Belum ada breakdown lain.</Typography>
                ) : (
                  history.map(item => (
                    <Typography key={item.id} variant='body2' sx={{ mt: 1 }}>
                      {formatStamp(item.startedAt)} · {item.statusUnit} · {formatQty(item.downtimeHours)} hrs ·{' '}
                      {item.problem}
                    </Typography>
                  ))
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant='subtitle2'>Outstanding / backlog</Typography>
                <Typography color='text.secondary'>MR/PR/PO dan prioritas belum disimpan pada breakdown.</Typography>
              </Grid>
            </Grid>
          ) : null}
        </DialogContent>
        <DialogActions>
          {selected && !String(selected.id).startsWith('ready-') ? (
            <Button onClick={() => router.push(`/breakdowns/view/${selected.id}`)}>Open detail</Button>
          ) : null}
          <Button color='secondary' onClick={() => setSelected(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

DmbdDashboardPage.acl = {
  action: 'read',
  subject: 'breakdown'
}

DmbdDashboardPage.pageTitle = 'Daily Monitoring Unit Breakdown'

export default DmbdDashboardPage
