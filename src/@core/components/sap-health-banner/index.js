/**
 * Banner in-app saat SAP B1 down — hanya untuk admin (`system.admin`), berdasar
 * baris terakhir sap_health_check_log (diisi berkala oleh scripts/sap-health-check.ts).
 */
import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Collapse from '@mui/material/Collapse'

import useCan from 'src/hooks/useCan'
import arkaApi from 'src/utils/arka-api'

const POLL_INTERVAL_MS = 5 * 60 * 1000

const SapHealthBanner = () => {
  const { can } = useCan()
  const isAdmin = can('system.admin')
  const [status, setStatus] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isAdmin) return

    let cancelled = false

    const fetchStatus = async () => {
      try {
        const res = await arkaApi.get('/sap/health-status/latest', { skipGlobalErrorToast: true })
        if (!cancelled) setStatus(res.data?.data ?? null)
      } catch {
        // Diamkan — banner tidak boleh mengganggu halaman lain saat endpoint ini sendiri gagal.
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isAdmin])

  if (!isAdmin || !status || status.isHealthy || dismissed) return null

  const checkedAt = status.checkedAt ? new Date(status.checkedAt).toLocaleString() : '-'

  return (
    <Collapse in>
      <Alert severity='warning' onClose={() => setDismissed(true)} sx={{ borderRadius: 0 }}>
        SAP B1 tidak terhubung sejak {checkedAt}
        {status.errorMessage ? ` — ${status.errorMessage}` : ''}
      </Alert>
    </Collapse>
  )
}

export default SapHealthBanner
