/**
 * Halaman print Breakdown — BlankLayout, detail + activity untuk cetak / Save as PDF.
 */
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import BlankLayout from 'src/@core/layouts/BlankLayout'
import arkaApi from 'src/utils/arka-api'
import BreakdownPrintView from 'src/views/apps/breakdown/BreakdownPrintView'

const BreakdownPrintPage = () => {
  const router = useRouter()
  const id = typeof router.query.id === 'string' ? router.query.id : ''

  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(false)

    try {
      const { data } = await arkaApi.get(`/breakdowns/${id}`)
      setRow(data)
    } catch {
      setRow(null)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  if (!id) return null

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !row) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Typography color='error'>Breakdown was not found or you cannot view it.</Typography>
      </Box>
    )
  }

  return <BreakdownPrintView row={row} />
}

BreakdownPrintPage.getLayout = page => <BlankLayout>{page}</BlankLayout>
BreakdownPrintPage.authGuard = true
BreakdownPrintPage.acl = {
  subject: 'breakdown',
  action: 'read'
}

export default BreakdownPrintPage
