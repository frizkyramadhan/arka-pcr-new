/**
 * Konten read-only BA cannibal pada halaman approval review.
 */
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import { getSingleTransfer } from 'src/utils/cannibal-transfer-form'

import useSapWoKanibalStatuses from 'src/hooks/useSapWoKanibalStatuses'

import CannibalComponentCard from 'src/views/pcr/cannibal/CannibalComponentCard'
import CannibalSectionCard from 'src/views/pcr/cannibal/CannibalSectionCard'
import CannibalTransferDisplay from 'src/views/pcr/cannibal/CannibalTransferDisplay'

const CannibalApprovalDetailInfo = ({ ba, loading = false, transferCardRef }) => {
  const transfer = ba ? getSingleTransfer(ba) : null

  const { statuses: sapWoStatuses, loading: sapWoStatusesLoading } = useSapWoKanibalStatuses({
    removeWoNo: transfer?.remove?.woNoKanibal,
    installWoNo: transfer?.install?.woNoKanibal,
    enabled: Boolean(ba)
  })
  const componentTitle = transfer?.remove?.compDesc || transfer?.install?.compDesc || ''

  if (loading) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12} md={4}>
          <Skeleton variant='rounded' height={320} />
        </Grid>
        <Grid item xs={12} md={8}>
          <Skeleton variant='rounded' height={360} />
        </Grid>
      </Grid>
    )
  }

  if (!ba) {
    return <Typography sx={{ color: 'text.secondary' }}>No data</Typography>
  }

  return (
    <Grid container spacing={6}>
      <Grid item xs={12} md={4}>
        <CannibalComponentCard ba={ba} transfer={transfer} componentTitle={componentTitle} />
      </Grid>

      <Grid item xs={12} md={8}>
        <div ref={transferCardRef}>
          <CannibalSectionCard
            fullHeight
            title='Component Transfer'
            subtitle='REMOVE / INSTALL per unit'
            icon='tabler:arrows-left-right'
            iconColor='primary'
            sx={{ mb: 0 }}
          >
            <CannibalTransferDisplay
              transfer={transfer}
              pairs={ba.pairs}
              sapWoStatuses={sapWoStatuses}
              sapWoStatusesLoading={sapWoStatusesLoading}
            />
          </CannibalSectionCard>
        </div>
      </Grid>
    </Grid>
  )
}

export default CannibalApprovalDetailInfo
