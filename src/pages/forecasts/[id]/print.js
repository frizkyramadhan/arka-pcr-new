/**
 * BA PCR print page — opens forecast detail in formal document layout.
 */
import { useCallback, useEffect, useState } from 'react'

import { useRouter } from 'next/router'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import BlankLayout from 'src/@core/layouts/BlankLayout'

import arkaApi from 'src/utils/arka-api'

import BaPcrPrintView from 'src/views/pcr/forecasts/BaPcrPrintView'

const ForecastBaPcrPrintPage = () => {
  const router = useRouter()
  const { id } = router.query

  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchDetail = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(false)

    try {
      const { data } = await arkaApi.get(`/forecasts/${id}`)
      setForecast(data)
    } catch {
      setForecast(null)
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

  if (error || !forecast) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Typography color='error'>Failed to load BA PCR document.</Typography>
      </Box>
    )
  }

  return <BaPcrPrintView forecast={forecast} />
}

ForecastBaPcrPrintPage.getLayout = page => <BlankLayout>{page}</BlankLayout>
ForecastBaPcrPrintPage.authGuard = true

export default ForecastBaPcrPrintPage
