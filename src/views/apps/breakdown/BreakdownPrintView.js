/**
 * Print layout — detail Breakdown + daftar activity (A4 portrait).
 * Dipakai dari /breakdowns/print/[id]; toolbar disembunyikan saat window.print().
 */
import { Fragment } from 'react'
import Head from 'next/head'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import { collapseRepeatedName } from '@/lib/dmbd/employee-label'
import Icon from 'src/@core/components/icon'
import { withBasePath } from 'src/utils/base-path'
import { formatDisplayDateTime } from 'src/utils/date-format'

const PRINT_FONT = 'Arial, Helvetica, sans-serif'

const printRootSx = {
  width: '100%',
  maxWidth: '190mm',
  mx: 'auto',
  bgcolor: '#fff',
  color: '#000',
  fontFamily: PRINT_FONT,
  fontSize: 10,
  lineHeight: 1.45,
  p: { xs: '10mm 12mm', md: '12mm 14mm' },
  minHeight: '100vh',
  boxSizing: 'border-box',
  '& .MuiTypography-root': { fontFamily: PRINT_FONT, color: 'inherit' },
  '& .MuiTypography-h5': { fontSize: '14px', lineHeight: 1.2 },
  '& .MuiTypography-subtitle2': { fontSize: '10px', fontWeight: 700 },
  '& .MuiTypography-body2': { fontSize: '10px' },
  '& .MuiTypography-caption': { fontSize: '8.5px' }
}

const cellSx = {
  border: '1px solid #000',
  p: '4px 6px',
  fontSize: 9.5,
  lineHeight: 1.35,
  verticalAlign: 'top',
  fontFamily: PRINT_FONT,
  wordBreak: 'break-word'
}

const headerCellSx = {
  ...cellSx,
  fontWeight: 700,
  bgcolor: '#f2f2f2',
  fontSize: 9
}

const labelCellSx = {
  ...cellSx,
  fontWeight: 600,
  width: '22%',
  bgcolor: '#fafafa'
}

const formatStamp = value => formatDisplayDateTime(value) || '—'

const formatHours = value =>
  value == null || !Number.isFinite(Number(value))
    ? '—'
    : Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 })

/** Kode · nama; hindari pengulangan bila nama sudah mengandung kode. */
const pair = (code, name) => {
  const left = (code || '').trim()
  const right = collapseRepeatedName(name) || ''
  if (!left) return right || '—'
  if (!right || left === right || right.startsWith(left)) return right || left

  return `${left} · ${right}`
}

const Field = ({ label, children, colSpan = 1 }) => (
  <>
    <Box component='td' sx={labelCellSx}>
      {label}
    </Box>
    <Box component='td' sx={{ ...cellSx, ...(colSpan > 1 ? { width: `${78 - (colSpan - 1) * 22}%` } : {}) }} colSpan={colSpan}>
      {children || '—'}
    </Box>
  </>
)

const SectionTitle = ({ children }) => (
  <Typography
    variant='subtitle2'
    sx={{
      mt: 2.5,
      mb: 1,
      pb: 0.5,
      borderBottom: '1.5px solid #000',
      letterSpacing: 0.3,
      textTransform: 'uppercase'
    }}
  >
    {children}
  </Typography>
)

const statusUnitOf = row => {
  if (row.cancelledAt) return 'CANCEL'
  if (row.finishedAt) return 'RFU'
  const latest = row.activities?.length ? row.activities[row.activities.length - 1] : null

  return latest?.positionStatus || 'BD'
}

const downtimeHoursOf = row => {
  if (!row?.startedAt) return null
  const start = new Date(row.startedAt).getTime()
  const end = new Date(row.finishedAt || row.cancelledAt || Date.now()).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null

  return Math.max(0, Math.round(((end - start) / 3600000) * 10) / 10)
}

const BreakdownPrintView = ({ row, onPrint }) => {
  const statusUnit = statusUnitOf(row)
  const downtime = downtimeHoursOf(row)
  const activities = Array.isArray(row.activities) ? row.activities : []

  const printedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  return (
    <>
      <Head>
        <title>
          Breakdown {row.registerNo || row.unitNo || ''} {row.workOrder ? `· WO ${row.workOrder}` : ''}
        </title>
        <style>{`
          @media print {
            html, body {
              background: #fff !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            .layout-wrapper,
            .app-content {
              min-height: auto !important;
              height: auto !important;
              overflow: visible !important;
            }
            .bd-print-no-print { display: none !important; }
            .bd-print-root {
              padding: 0 !important;
              max-width: none !important;
              min-height: auto !important;
              width: 100% !important;
              font-size: 10px !important;
            }
            .bd-print-logo {
              height: 28px !important;
            }
            .bd-print-root,
            .bd-print-logo,
            .bd-print-table th,
            .bd-print-table td {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
          @page {
            size: A4 portrait;
            margin: 12mm 12mm;
          }
        `}</style>
      </Head>

      <Box className='bd-print-root' sx={printRootSx}>
        <Box className='bd-print-no-print' sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2 }}>
          <Button
            variant='contained'
            startIcon={<Icon icon='tabler:printer' />}
            onClick={onPrint ?? (() => window.print())}
          >
            Print
          </Button>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            pb: 1,
            mb: 2,
            borderBottom: '2px solid #000'
          }}
        >
          <Box
            component='img'
            src={withBasePath('/images/arka-logo.png')}
            alt='ARKA'
            className='bd-print-logo'
            sx={{
              justifySelf: 'start',
              height: 32,
              width: 'auto',
              display: 'block'
            }}
          />
          <Box sx={{ textAlign: 'center', px: 2 }}>
            <Typography variant='h5' sx={{ fontWeight: 700, letterSpacing: 0.6 }}>
              BREAKDOWN DETAIL
            </Typography>
            <Typography variant='body2' sx={{ mt: 0.5, fontWeight: 600 }}>
              {row.registerNo || '—'}
              {row.unitNo ? ` · ${row.unitNo}` : ''}
              {row.workOrder ? ` · WO ${row.workOrder}` : ''}
            </Typography>
          </Box>
          <Box sx={{ justifySelf: 'end', textAlign: 'right' }}>
            <Typography variant='caption' sx={{ display: 'block' }}>
              Status unit: <strong>{statusUnit}</strong>
            </Typography>
            <Typography variant='caption' sx={{ display: 'block' }}>
              Status WO: <strong>{row.workOrderStatus || '—'}</strong>
            </Typography>
          </Box>
        </Box>

        <SectionTitle>Unit & timing</SectionTitle>
        <Box component='table' className='bd-print-table' sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <Field label='Register No'>{row.registerNo}</Field>
              <Field label='Unit'>{row.unitNo}</Field>
            </tr>
            <tr>
              <Field label='Model'>{row.modelName}</Field>
              <Field label='Project'>{row.projectCode}</Field>
            </tr>
            <tr>
              <Field label='Serial'>{row.serialNo}</Field>
              <Field label='Location'>{row.location}</Field>
            </tr>
            <tr>
              <Field label='HM'>{formatHours(row.hourMeter)}</Field>
              <Field label='BD date'>{formatStamp(row.startedAt)}</Field>
            </tr>
            <tr>
              <Field label='Finish date'>{formatStamp(row.finishedAt)}</Field>
              <Field label='Downtime (Hrs)'>{formatHours(downtime)}</Field>
            </tr>
            <tr>
              <Field label='WO'>{row.workOrder || 'Belum dibuat'}</Field>
              <Field label='Last operator'>{pair(row.operatorCode, row.operatorName)}</Field>
            </tr>
            <tr>
              <Field label='Mechanic leader'>{pair(row.mechanicLeaderCode, row.mechanicLeaderName)}</Field>
              <Field label='Assignee'>
                {pair(row.assigneeUserId == null ? '' : String(row.assigneeUserId), row.assigneeName)}
              </Field>
            </tr>
            <tr>
              <Field label='Prepared / created' colSpan={3}>
                {[row.preparedBy, row.createdByName].filter(Boolean).join(' / ') || '—'}
              </Field>
            </tr>
          </tbody>
        </Box>

        <SectionTitle>Description & failure</SectionTitle>
        <Box component='table' className='bd-print-table' sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <Field label='Problem' colSpan={3}>
                <Box sx={{ whiteSpace: 'pre-wrap' }}>{row.problem || '—'}</Box>
              </Field>
            </tr>
            <tr>
              <Field label='Remark' colSpan={3}>
                <Box sx={{ whiteSpace: 'pre-wrap' }}>{row.remark || '—'}</Box>
              </Field>
            </tr>
            <tr>
              <Field label='Resolution' colSpan={3}>
                <Box sx={{ whiteSpace: 'pre-wrap' }}>{row.resolution || '—'}</Box>
              </Field>
            </tr>
            <tr>
              <Field label='Job category'>{row.jobCategory}</Field>
              <Field label='Job code'>{pair(row.jobCode, row.jobCodeName)}</Field>
            </tr>
            <tr>
              <Field label='Component'>{pair(row.componentCode, row.componentName)}</Field>
              <Field label='Sub component'>{pair(row.subComponentCode, row.subComponentName)}</Field>
            </tr>
            <tr>
              <Field label='Damage'>{pair(row.damageCode, row.damageName)}</Field>
              <Field label='Failure cause'>{pair(row.failureCauseCode, row.failureCauseName)}</Field>
            </tr>
          </tbody>
        </Box>

        <SectionTitle>Activities ({activities.length})</SectionTitle>
        {activities.length === 0 ? (
          <Typography variant='body2' sx={{ fontStyle: 'italic' }}>
            Belum ada activity.
          </Typography>
        ) : (
          <Box component='table' className='bd-print-table' sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <Box component='th' sx={{ ...headerCellSx, width: '4%' }}>
                  #
                </Box>
                <Box component='th' sx={{ ...headerCellSx, width: '22%' }}>
                  Activity
                </Box>
                <Box component='th' sx={{ ...headerCellSx, width: '8%' }}>
                  Pos
                </Box>
                <Box component='th' sx={{ ...headerCellSx, width: '16%' }}>
                  Start
                </Box>
                <Box component='th' sx={{ ...headerCellSx, width: '16%' }}>
                  End
                </Box>
                <Box component='th' sx={{ ...headerCellSx, width: '17%' }}>
                  Mechanics
                </Box>
                <Box component='th' sx={{ ...headerCellSx, width: '17%' }}>
                  Handled by
                </Box>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, index) => (
                <Fragment key={activity.id}>
                  <tr>
                    <Box component='td' sx={{ ...cellSx, textAlign: 'center' }}>
                      {index + 1}
                    </Box>
                    <Box component='td' sx={cellSx}>
                      {activity.breakdownCode} · {activity.breakdownCodeName}
                    </Box>
                    <Box component='td' sx={{ ...cellSx, textAlign: 'center', fontWeight: 700 }}>
                      {activity.positionStatus}
                    </Box>
                    <Box component='td' sx={cellSx}>
                      {formatStamp(activity.startedAt)}
                    </Box>
                    <Box component='td' sx={cellSx}>
                      {activity.endedAt ? formatStamp(activity.endedAt) : 'masih berjalan'}
                    </Box>
                    <Box component='td' sx={cellSx}>
                      {activity.technicianName || '—'}
                    </Box>
                    <Box component='td' sx={cellSx}>
                      {activity.handledByName || '—'}
                    </Box>
                  </tr>
                  {activity.details ? (
                    <tr>
                      <Box component='td' sx={cellSx} colSpan={7}>
                        <Typography variant='caption' sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                          Details
                        </Typography>
                        <Box sx={{ whiteSpace: 'pre-wrap' }}>{activity.details}</Box>
                      </Box>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </Box>
        )}

        <Box sx={{ mt: 3, pt: 1, borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant='caption'>APMS — Breakdown report</Typography>
          <Typography variant='caption'>Printed {printedAt}</Typography>
        </Box>
      </Box>
    </>
  )
}

export default BreakdownPrintView
