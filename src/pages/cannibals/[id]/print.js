// ** React Imports
import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'

// ** Next Imports
import { useRouter } from 'next/router'

// ** MUI Imports
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// ** Layout
import BlankLayout from 'src/@core/layouts/BlankLayout'

// ** View Components
import CannibalPrintApprovalBox from 'src/views/pcr/cannibal/CannibalPrintApprovalBox'
import CannibalPrintComponentDetail from 'src/views/pcr/cannibal/CannibalPrintComponentDetail'
import CannibalPrintPlanningSection from 'src/views/pcr/cannibal/CannibalPrintPlanningSection'
import CannibalPrintStatementsSection, {
  CannibalPrintComponentStatusSection,
  CannibalPrintFailureSection
} from 'src/views/pcr/cannibal/CannibalPrintFormSections'

// ** Utils
import arkaApi from 'src/utils/arka-api'
import { statusesForNewForm } from 'src/utils/cannibal-form-lookups'

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
  '& .MuiDivider-root': { my: '12px !important' },
  '& .MuiGrid-container': { width: '100%' }
}

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
      setStatuses(statusesForNewForm(lookupsRes.data?.statuses ?? [], data?.idStatus))
    } catch (error) {
      setBa(null)
      setStatuses([])
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  if (!id) return null

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
            <Typography variant='body2' sx={{ mt: 0.75, fontWeight: 600 }}>
              {ba?.noBa ?? '—'}
            </Typography>
          </Box>

          <Box />
        </Box>

        <CannibalPrintFailureSection ba={ba} />

        <CannibalPrintStatementsSection ba={ba} />

        <CannibalPrintComponentStatusSection ba={ba} statuses={statuses} />

        <CannibalPrintComponentDetail ba={ba} />

        <CannibalPrintApprovalBox ba={ba} />

        <CannibalPrintPlanningSection ba={ba} />
      </Box>
    </>
  )
}

CannibalPrintPage.getLayout = page => <BlankLayout>{page}</BlankLayout>
CannibalPrintPage.authGuard = true

export default CannibalPrintPage
