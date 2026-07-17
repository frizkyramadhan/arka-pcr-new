// ** React Imports
import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'

// ** Next Imports
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// ** Layout
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** View Components
import CannibalPairDisplay from 'src/views/pcr/cannibal/CannibalPairDisplay'
import CannibalPrintApprovalBox from 'src/views/pcr/cannibal/CannibalPrintApprovalBox'
import CannibalPrintPlanningSection from 'src/views/pcr/cannibal/CannibalPrintPlanningSection'

// ** Utils
import arkaApi from 'src/utils/arka-api'
import { isComponentStatusOther, sortComponentStatuses } from 'src/utils/cannibal-form-lookups'

const PRINT_FONT = 'Arial, Helvetica, sans-serif'

const printRootSx = {
  width: '100%',
  maxWidth: '174mm',
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
  '& .MuiTypography-subtitle1': { fontSize: '11px' },
  '& .MuiTypography-subtitle2': { fontSize: '10px' },
  '& .MuiTypography-body2': { fontSize: '10px' },
  '& .MuiTypography-caption': { fontSize: '8.5px' },
  '& .MuiCheckbox-root': { p: '2px', '& svg': { fontSize: 16 } },
  '& .MuiDivider-root': { my: '12px !important' },
  '& .MuiGrid-container': { width: '100%' }
}

const sectionBoxSx = { p: 1.5, mb: 2 }

const formatDate = value => (value ? String(value).slice(0, 10) : '—')

const formatUser = user => user?.fullName || user?.username || '—'

const CheckItem = ({ checked, label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Checkbox checked={Boolean(checked)} disabled size='small' sx={{ p: 0.5 }} />
    <Typography variant='body2'>{label}</Typography>
  </Box>
)

const CannibalPrintPage = () => {
  const router = useRouter()
  const { id } = router.query
  const [ba, setBa] = useState(null)
  const [statuses, setStatuses] = useState([])

  const fetchDetail = useCallback(async () => {
    if (!id) return

    try {
      const [{ data }, lookupsRes] = await Promise.all([arkaApi.get(`/cannibals/${id}`), arkaApi.get('/ba-lookups')])
      setBa(data)
      setStatuses(sortComponentStatuses(lookupsRes.data?.statuses ?? []))
    } catch (error) {
      setBa(null)
      setStatuses([])
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  if (!id) return null

  const getStatusLabel = statusItem => {
    if (isComponentStatusOther(statusItem) && ba?.statusOther?.trim()) {
      return `Other: ${ba.statusOther.trim()}`
    }

    return statusItem.status
  }

  const isStatusSelected = statusItem => Number(statusItem.idStatus) === Number(ba?.idStatus)

  return (
    <>
      <Head>
        <title>BA Kanibal — {ba?.noBa ?? id}</title>
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
            .ba-kanibal-print-root {
              padding: 0 !important;
              max-width: none !important;
              min-height: auto !important;
              width: 100% !important;
              font-size: 10px !important;
            }
            .ba-kanibal-logo {
              height: 28px !important;
            }
            .ba-kanibal-logo,
            .ba-kanibal-stamp {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
        `}</style>
      </Head>

      <Box className='ba-kanibal-print-root' sx={printRootSx}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            pb: 1,
            mb: 2,
            borderBottom: '1px solid #000'
          }}
        >
          <Box
            component='img'
            src='/images/arka-logo.png'
            alt='ARKA'
            className='ba-kanibal-logo'
            sx={{
              justifySelf: 'start',
              height: 32,
              width: 'auto',
              display: 'block',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact'
            }}
          />

          <Box sx={{ textAlign: 'center', px: 2 }}>
            <Typography variant='h5' sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: 0.5 }}>
              BERITA ACARA KANIBAL
            </Typography>
            <Typography variant='body2' sx={{ mt: 0.75, color: 'text.secondary' }}>
              {ba?.noBa ?? '—'} | Project: {ba?.projectCode ?? '—'} | Posting: {formatDate(ba?.postingDate)}
            </Typography>
          </Box>

          <Box />
        </Box>

        <Box sx={{ border: '1px solid #ccc', ...sectionBoxSx }}>
          <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 0.5 }}>
            FAILURE / KERUSAKAN :
          </Typography>
          <Typography
            variant='caption'
            sx={{
              color: 'text.secondary',
              mb: 0.5,
              display: 'block',
              fontStyle: 'italic'
            }}
          >
            (diisi oleh Plant Department)
          </Typography>

          <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
            {ba?.failure ?? '—'}
          </Typography>
          {ba?.symptom ? (
            <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap', mt: 2, color: 'text.secondary' }}>
              Symptom: {ba.symptom}
            </Typography>
          ) : null}
        </Box>

        <Box sx={{ bgcolor: '#fff9c4', border: '1px solid #f0e68c', ...sectionBoxSx }}>
          <Typography variant='subtitle2' align='center' sx={{ fontWeight: 700, mb: 1 }}>
            PLEASE COMPLETE THE SECTION BELOW (WAJIB MENGISI KOLOM DI BAWAH INI)
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant='subtitle2' sx={{ mb: 1 }}>
                PLANT STATEMENT
              </Typography>
              <CheckItem checked={ba?.plantP1UnitRfu} label='P1 Unit RFU' />
              <CheckItem checked={ba?.plantProductionReq} label='Production Requirements' />
              <CheckItem
                checked={ba?.plantOther}
                label={`Other${ba?.plantOtherText ? `: ${ba.plantOtherText}` : ''}`}
              />
            </Grid>
            <Grid item xs={6}>
              <Typography variant='subtitle2' sx={{ mb: 1 }}>
                LOGISTIC STATEMENT
              </Typography>
              <CheckItem checked={ba?.logisticNoStock} label='No Stock' />
              <CheckItem
                checked={ba?.logisticLeadTime}
                label={`Lead Time Part${ba?.logisticLeadTimeDays ? ` (Est ${ba.logisticLeadTimeDays} days)` : ''}`}
              />
              <CheckItem
                checked={ba?.logisticOther}
                label={`Other${ba?.logisticOtherText ? `: ${ba.logisticOtherText}` : ''}`}
              />
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <Typography variant='caption'>REQUEST BY (Foreman/Supervisor Plant)</Typography>
              <Typography variant='body2'>
                {formatUser(ba?.statementRequester)} — {formatDate(ba?.statementRequestedAt)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant='caption'>CONFIRMED BY (Logistic/WH Officer)</Typography>
              <Typography variant='body2'>
                {formatUser(ba?.statementConfirmer)} — {formatDate(ba?.statementConfirmedAt)}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ bgcolor: '#ffe0b2', border: '1px solid #ffcc80', ...sectionBoxSx }}>
          <Typography variant='subtitle2' align='center' sx={{ fontWeight: 700, mb: 1 }}>
            CANNIBALIZED COMPONENT STATUS (STATUS KOMPONEN YANG DIKANIBAL)
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'nowrap',
              gap: 1,
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            {statuses.map(statusItem => (
              <Box key={statusItem.idStatus} sx={{ flex: '1 1 0', minWidth: 0 }}>
                <CheckItem
                  checked={isStatusSelected(statusItem)}
                  label={getStatusLabel(statusItem)}
                />
              </Box>
            ))}
          </Box>
        </Box>

        <Typography variant='subtitle1' sx={{ fontWeight: 700, mb: 1 }}>
          Component Detail Information
        </Typography>
        <CannibalPairDisplay pairs={ba?.pairs ?? []} print />

        <Divider sx={{ my: 2 }} />

        <CannibalPrintApprovalBox ba={ba} />

        <CannibalPrintPlanningSection ba={ba} />
      </Box>
    </>
  )
}

CannibalPrintPage.getLayout = page => <BlankLayout>{page}</BlankLayout>
CannibalPrintPage.authGuard = true

export default CannibalPrintPage
