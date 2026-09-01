/**
 * BA PCR print layout — formal document matching ARKA PCR submission template.
 */
import Head from 'next/head'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

import {
  BA_PCR_DOC_META,
  BA_PCR_RECIPIENT,
  buildBaPcrDocumentNo,
  buildBaPcrSubject,
  buildEquipmentHealthFlags,
  formatBaPcrDateId,
  formatCurrencyId,
  formatHmPrint,
  formatLifeSchedule,
  formatPlanPeriodIdMonthYear,
  formatPlanPeriodShort,
  getApprovalByLevel,
  resolveProjectLocation,
  resolveSignerName
} from 'src/utils/ba-pcr-print'

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
  { level: 'submitter', roleTitle: 'Plant Foreman / Supervisor' },
  { level: 'PS', roleTitle: 'Plant Superintendent / Dept Head' },
  { level: 'PM', roleTitle: 'Project Manager' },
  { level: 'PLM', roleTitle: 'Plant Manager' },
  { level: 'OD', roleTitle: 'Operation Director' },
  { level: 'FD', roleTitle: 'Commercial & Treasury Director' },
  { level: 'PD', roleTitle: 'President Director' }
]

const WARRANTY_APPROVAL_LEVELS = new Set(['submitter', 'PS', 'PM', 'PLM'])

function getApprovalBlocks(isWarranty) {
  if (!isWarranty) return APPROVAL_BLOCKS

  return APPROVAL_BLOCKS.filter(block => WARRANTY_APPROVAL_LEVELS.has(block.level))
}

const cellSx = {
  border: '1px solid #000',
  p: '5px 4px',
  fontSize: 9.5,
  lineHeight: 1.4,
  verticalAlign: 'middle',
  textAlign: 'center',
  fontFamily: PRINT_FONT,
  wordBreak: 'break-word'
}

const headerCellSx = {
  ...cellSx,
  fontWeight: 700,
  bgcolor: '#f2f2f2',
  fontSize: 9
}

const healthHeaderLabels = ['PPM', 'SOS', 'Magnetic Plug', 'Filter Cut', 'Data', 'Inspection']

const healthHeaderSx = {
  ...headerCellSx,
  width: 26,
  minWidth: 26,
  maxWidth: 30,
  p: '2px 1px',
  height: 78,
  verticalAlign: 'middle'
}

const healthCellSx = {
  ...cellSx,
  width: 26,
  minWidth: 26,
  maxWidth: 30,
  p: '4px 2px',
  fontSize: 11
}

const VerticalHealthHeader = ({ label }) => (
  <Box component='th' sx={healthHeaderSx}>
    <Box
      sx={{
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        fontSize: 8.5,
        fontWeight: 700,
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mx: 'auto',
        fontFamily: PRINT_FONT
      }}
    >
      {label}
    </Box>
  </Box>
)

const bodyTextSx = {
  fontSize: 10,
  fontFamily: PRINT_FONT,
  lineHeight: 1.5
}

const boldSx = { fontWeight: 700 }

const docMetaCellSx = {
  border: '1px solid #000',
  p: '2px 5px',
  fontSize: 7.5,
  lineHeight: 1.25,
  verticalAlign: 'middle',
  fontFamily: PRINT_FONT
}

const CheckCell = ({ checked }) => <Box sx={{ fontSize: 10, fontWeight: 700 }}>{checked ? '✓' : ''}</Box>

const resolveStampStatus = (forecast, level) => {
  if (level === 'submitter') {
    return forecast?.baSubmittedAt ? 'APPROVED' : 'WAITING'
  }

  const approval = getApprovalByLevel(forecast, level)
  if (!approval) return 'WAITING'
  if (approval.status === 'APPROVED') return 'APPROVED'
  if (approval.status === 'REJECTED') return 'REJECTED'

  return 'WAITING'
}

const ApprovalStamp = ({ status }) => {
  const config = STAMP_STYLES[status]

  return (
    <Box
      className='ba-pcr-stamp'
      sx={{
        display: 'inline-block',
        border: `4px solid ${config.borderColor}`,
        color: config.color,
        px: 2,
        py: 1,
        fontWeight: 800,
        fontSize: status === 'WAITING' ? 10 : 13,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        textAlign: 'center',
        lineHeight: 1.25,
        fontFamily: PRINT_FONT,
        textShadow: config.textShadow,
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        maxWidth: 190
      }}
    >
      {config.label}
    </Box>
  )
}

const ApprovalStampBlock = ({ forecast, level, roleTitle }) => {
  const status = resolveStampStatus(forecast, level)
  const signerName = resolveSignerName(forecast, level)

  return (
    <Box
      sx={{
        textAlign: 'center',
        px: 0.5,
        py: 1,
        minHeight: 104,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <ApprovalStamp status={status} />
      <Typography
        sx={{
          ...bodyTextSx,
          fontSize: 10,
          fontWeight: 700,
          textDecoration: signerName ? 'underline' : 'none',
          mt: 1,
          minHeight: 15
        }}
      >
        {signerName || '\u00A0'}
      </Typography>
      <Typography sx={{ ...bodyTextSx, fontSize: 8.5, color: '#444', mt: 0.25 }}>({roleTitle})</Typography>
    </Box>
  )
}

const BaPcrPrintView = ({ forecast, onPrint }) => {
  if (!forecast) return null

  const compDesc = forecast.compDesc ?? forecast.commod?.comp?.compDesc ?? '—'
  const location = resolveProjectLocation(forecast.projectCode)
  const documentDate = formatBaPcrDateId(forecast.baSubmittedAt || new Date())
  const documentNo = buildBaPcrDocumentNo(forecast)
  const hmUnit = forecast.latestUnitHm ?? forecast.hmComponent
  const health = buildEquipmentHealthFlags(forecast)
  const plantType = forecast.unit?.plantType || 'Unit'
  const planPeriodLabel = formatPlanPeriodIdMonthYear(forecast.planPeriod)

  return (
    <>
      <Head>
        <title>BA PCR — {forecast.unitNo}</title>
        <style>{`
          @media print {
            .ba-pcr-no-print { display: none !important; }
            html, body { background: #fff !important; margin: 0; padding: 0; }
            .ba-pcr-print-root {
              padding: 0 !important;
              max-width: none !important;
              min-height: auto !important;
            }
            .ba-pcr-logo, .ba-pcr-stamp {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
          @page {
            size: A4 portrait;
            margin: 15mm 18mm;
          }
        `}</style>
      </Head>

      <Box
        className='ba-pcr-print-root'
        sx={{
          width: '100%',
          maxWidth: '174mm',
          mx: 'auto',
          bgcolor: '#fff',
          color: '#000',
          fontFamily: PRINT_FONT,
          fontSize: 10,
          lineHeight: 1.5,
          p: { xs: '12mm 14mm', md: '14mm 16mm' },
          minHeight: '100vh',
          boxSizing: 'border-box'
        }}
      >
        <Box className='ba-pcr-no-print' sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant='contained' onClick={onPrint ?? (() => window.print())}>
            Print
          </Button>
        </Box>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
          <Box
            component='img'
            src='/images/arka-logo.png'
            alt='ARKA'
            className='ba-pcr-logo'
            sx={{
              height: 34,
              width: 'auto',
              display: 'block',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact'
            }}
          />

          <Box component='table' sx={{ borderCollapse: 'collapse', fontFamily: PRINT_FONT }}>
            <tbody>
              {[
                ['Doc No', BA_PCR_DOC_META.docNo],
                ['Rev No', BA_PCR_DOC_META.revNo],
                ['Eff Date', BA_PCR_DOC_META.effDate],
                ['Page', BA_PCR_DOC_META.page]
              ].map(([label, value]) => (
                <tr key={label}>
                  <Box component='td' sx={{ ...docMetaCellSx, textAlign: 'left', fontWeight: 700, width: 52 }}>
                    {label}
                  </Box>
                  <Box component='td' sx={{ ...docMetaCellSx, textAlign: 'left', width: 96 }}>
                    {value}
                  </Box>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>

        {/* Letter meta */}
        <Typography sx={{ ...bodyTextSx, mb: 0.5 }}>
          {location}, {documentDate}
        </Typography>
        <Typography sx={{ ...bodyTextSx, mb: 0.5 }}>
          <Box component='span' sx={{ fontWeight: 700 }}>
            No
          </Box>{' '}
          : {documentNo}
        </Typography>
        <Typography sx={{ ...bodyTextSx, mb: 2 }}>
          <Box component='span' sx={boldSx}>
            Perihal
          </Box>{' '}
          :{' '}
          <Box component='span' sx={boldSx}>
            {buildBaPcrSubject(forecast)}
          </Box>
        </Typography>

        <Typography sx={{ ...bodyTextSx, mb: 0.25 }}>Kepada Yth,</Typography>
        <Typography sx={{ ...bodyTextSx, mb: 0.25, ...boldSx }}>Presiden Direktur</Typography>
        <Typography sx={{ ...bodyTextSx, mb: 0.25 }}>{BA_PCR_RECIPIENT.company}</Typography>
        <Typography sx={{ ...bodyTextSx, mb: 2 }}>
          u.p. Bp.{' '}
          <Box component='span' sx={boldSx}>
            {BA_PCR_RECIPIENT.director}
          </Box>
        </Typography>

        <Typography sx={{ ...bodyTextSx, mb: 1 }}>Dengan hormat,</Typography>
        <Typography sx={{ ...bodyTextSx, mb: 2, textAlign: 'justify' }}>
          Bersama ini kami sampaikan pengajuan PCR &apos;
          <Box component='span' sx={boldSx}>
            {compDesc}
          </Box>
          &apos; unit {plantType} {forecast.unitNo} site {forecast.projectCode} untuk periode{' '}
          <Box component='span' sx={boldSx}>
            {planPeriodLabel}
          </Box>
          , dengan rincian sebagai berikut:
        </Typography>

        {/* Main table */}
        <Box sx={{ overflowX: 'auto', mb: 1 }}>
          <Box component='table' sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontFamily: PRINT_FONT }}>
            <colgroup>
              <col style={{ width: '4%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              {healthHeaderLabels.map(label => (
                <col key={label} style={{ width: '3%' }} />
              ))}
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr>
                {[
                  'No',
                  'Nomor Unit',
                  'Model',
                  'HM',
                  'Komponen',
                  'Umur Komp & % of Schedule',
                  'Tanggal Rencana Eksekusi',
                  'Estimasi Biaya'
                ].map(label => (
                  <Box
                    key={label}
                    component='th'
                    rowSpan={2}
                    sx={{
                      ...headerCellSx,
                      ...(label === 'Umur Komp & % of Schedule' || label === 'Tanggal Rencana Eksekusi'
                        ? { fontSize: 8, lineHeight: 1.25 }
                        : {})
                    }}
                  >
                    {label}
                  </Box>
                ))}
                <Box component='th' colSpan={6} sx={headerCellSx}>
                  Data Equipment Health
                </Box>
                <Box component='th' rowSpan={2} sx={headerCellSx}>
                  Keterangan
                </Box>
              </tr>
              <tr>
                {healthHeaderLabels.map(label => (
                  <VerticalHealthHeader key={label} label={label} />
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <Box component='td' sx={cellSx}>
                  1
                </Box>
                <Box component='td' sx={cellSx}>
                  {forecast.unitNo}
                </Box>
                <Box component='td' sx={cellSx}>
                  {forecast.modelName ?? '—'}
                </Box>
                <Box component='td' sx={cellSx}>
                  {formatHmPrint(hmUnit)}
                </Box>
                <Box component='td' sx={{ ...cellSx, fontSize: 9, ...boldSx }}>
                  {compDesc}
                </Box>
                <Box component='td' sx={{ ...cellSx, fontSize: 8.5, lineHeight: 1.35 }}>
                  {formatLifeSchedule(forecast.lifePercent, forecast.hmComponent, forecast.policy)}
                </Box>
                <Box component='td' sx={cellSx}>
                  {formatPlanPeriodShort(forecast.planPeriod)}
                </Box>
                <Box component='td' sx={{ ...cellSx, fontSize: 9 }}>
                  {formatCurrencyId(forecast.priceComponent)}
                </Box>
                <Box component='td' sx={healthCellSx}>
                  <CheckCell checked={health.ppm} />
                </Box>
                <Box component='td' sx={healthCellSx}>
                  <CheckCell checked={health.sos} />
                </Box>
                <Box component='td' sx={healthCellSx}>
                  <CheckCell checked={health.magneticPlug} />
                </Box>
                <Box component='td' sx={healthCellSx}>
                  <CheckCell checked={health.filterCut} />
                </Box>
                <Box component='td' sx={healthCellSx}>
                  <CheckCell checked={health.data} />
                </Box>
                <Box component='td' sx={healthCellSx}>
                  <CheckCell checked={health.inspection} />
                </Box>
                <Box component='td' sx={{ ...cellSx, textAlign: 'left', fontSize: 9, lineHeight: 1.4 }}>
                  {forecast.remark || '—'}
                </Box>
              </tr>
            </tbody>
          </Box>
        </Box>

        <Typography sx={{ ...bodyTextSx, fontSize: 8, fontStyle: 'italic', mb: 2 }}>
          *Data equipment health dilampirkan dan pada kolom tersebut cukup diberi tanda (✓)
        </Typography>

        <Typography sx={{ ...bodyTextSx, mb: 3, textAlign: 'justify' }}>
          Demikian pengajuan PCR ini kami sampaikan, atas perhatian dan bantuannya kami ucapkan terimakasih.
        </Typography>

        {/* Approval stamps */}
        {(() => {
          const blocks = getApprovalBlocks(Boolean(forecast?.isWarranty))
          const pairs = []
          for (let i = 0; i < blocks.length; i += 2) {
            pairs.push(blocks.slice(i, i + 2))
          }

          return pairs.map((pair, pairIndex) => (
            <Box
              key={`approval-row-${pairIndex}`}
              sx={{
                display: 'grid',
                gridTemplateColumns: pair.length === 1 ? '1fr' : '1fr 1fr',
                gap: 1.5,
                mb: 1.5,
                maxWidth: pair.length === 1 ? 220 : undefined,
                mx: pair.length === 1 ? 'auto' : undefined
              }}
            >
              {pair.map(block => (
                <ApprovalStampBlock key={block.level} forecast={forecast} {...block} />
              ))}
            </Box>
          ))
        })()}
      </Box>
    </>
  )
}

export default BaPcrPrintView
