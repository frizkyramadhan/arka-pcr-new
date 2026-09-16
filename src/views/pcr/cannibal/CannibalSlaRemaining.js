/**
 * Live remaining-time for cannibal BA SLA — stage window + 5-day overall from Plant Submit.
 */
import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import { formatCannibalRemaining } from '@/lib/cannibal/sla'

const HOUR_MS = 60 * 60 * 1000

function useTickingNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)

    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}

function remainingColor(stage, overall) {
  if (stage.overdue) return 'error.main'
  if (overall.remainingMs != null && overall.remainingMs < 24 * HOUR_MS) return 'warning.main'

  return 'text.primary'
}

const CannibalSlaRemaining = ({ sla, compact = true }) => {
  const now = useTickingNow()

  if (!sla?.tracked && !sla?.expired) {
    return (
      <Typography variant='body2' sx={{ color: 'text.disabled' }}>
        —
      </Typography>
    )
  }

  if (sla.expired) {
    return (
      <Box sx={{ lineHeight: 1.25, py: compact ? 0.5 : 0 }}>
        <Typography variant={compact ? 'body2' : 'subtitle2'} sx={{ color: 'error.main', fontWeight: 600 }}>
          Expired
        </Typography>
        {sla.waitingOn ? (
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
            Menunggu {sla.waitingOn}
          </Typography>
        ) : null}
      </Box>
    )
  }

  const stage = formatCannibalRemaining(sla.stageDeadline, now)
  const overall = formatCannibalRemaining(sla.overallDeadline, now)
  const color = remainingColor(stage, overall)

  return (
    <Box sx={{ lineHeight: 1.25, py: compact ? 0.5 : 0 }}>
      <Typography variant={compact ? 'body2' : 'subtitle2'} sx={{ color, fontWeight: 600 }}>
        {stage.text}
      </Typography>
      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
        {sla.stageLabel ? `${sla.stageLabel} · ` : ''}Pengajuan {overall.text}
      </Typography>
    </Box>
  )
}

export default CannibalSlaRemaining
