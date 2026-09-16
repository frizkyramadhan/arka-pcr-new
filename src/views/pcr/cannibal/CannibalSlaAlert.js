/**
 * Detail banner — remaining SLA time, waiting party, and expired lock message.
 */
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'

import CannibalSlaRemaining from 'src/views/pcr/cannibal/CannibalSlaRemaining'

const CannibalSlaAlert = ({ sla }) => {
  if (!sla?.tracked && !sla?.expired) return null

  const severity = sla.expired ? 'error' : 'info'
  const icon = sla.expired ? 'tabler:clock-off' : 'tabler:clock'

  return (
    <Alert severity={severity} icon={<Icon icon={icon} />} sx={{ mt: 2, py: 0.75 }}>
      {sla.expired ? (
        <Typography variant='body2'>
          BA expired (lebih dari 5 hari sejak Plant Submit). Tidak dapat dilanjutkan kecuali di-reopen
          (permission cannibals.reopen). Reopen mengembalikan BA ke tahap terakhir dan menghitung ulang SLA 5 hari.
          {sla.waitingOn ? ` Saat expired menunggu: ${sla.waitingOn}.` : ''}
        </Typography>
      ) : (
        <>
          <Typography variant='body2' sx={{ mb: 0.5 }}>
            Menunggu {sla.waitingOn ?? 'tindakan berikutnya'}. Jam SLA mulai dari Plant Submit.
          </Typography>
          <CannibalSlaRemaining sla={sla} compact={false} />
        </>
      )}
    </Alert>
  )
}

export default CannibalSlaAlert
