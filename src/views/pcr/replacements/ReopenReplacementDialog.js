/**
 * Reopen CLOSED WO — warns when closed HM differs from latest unit HM.
 */
import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate } from 'src/utils/date-format'

const formatHm = value => {
  if (value === null || value === undefined || value === '') return '—'
  const num = Number(value)

  return Number.isFinite(num) ? num.toLocaleString('id-ID') : '—'
}

const ReferenceItem = ({ label, hm, date }) => (
  <Box>
    <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block' }}>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 600 }}>
      {formatHm(hm)}
      {date ? (
        <Typography component='span' variant='caption' sx={{ color: 'text.secondary', ml: 1 }}>
          ({formatDisplayDate(date)})
        </Typography>
      ) : null}
    </Typography>
  </Box>
)

const ReopenReplacementDialog = ({ open, idRep, woLabel, onClose, onConfirm, loading }) => {
  const [fetching, setFetching] = useState(false)
  const [context, setContext] = useState(null)

  useEffect(() => {
    if (!open || !idRep) return

    let cancelled = false

    const load = async () => {
      setFetching(true)
      setContext(null)

      try {
        const { data } = await arkaApi.get(`/replacements/${idRep}/action-context`, {
          params: { mode: 'reopen' }
        })

        if (!cancelled) setContext(data)
      } catch {
        if (!cancelled) setContext(null)
      } finally {
        if (!cancelled) setFetching(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [open, idRep])

  const label = woLabel ?? (context ? `WO #${context.woNo ?? context.idRep}` : '')

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Reopen Work Order?</DialogTitle>
      <DialogContent>
        <Typography variant='body2' sx={{ mb: 2 }}>
          Reopen {label}? The auto-created open cycle will be removed and metrics will be recalculated.
        </Typography>

        {fetching ? (
          <Typography variant='body2' sx={{ color: 'text.secondary', mb: 2 }}>
            Loading HM context…
          </Typography>
        ) : context ? (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <ReferenceItem
                  label='HM stored on this close'
                  hm={context.closedHmUnit}
                  date={context.woEndDate}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <ReferenceItem
                  label='Latest unit HM'
                  hm={context.latestHmUnit}
                  date={context.latestHmDate}
                />
              </Grid>
              {context.referenceHmUnit != null ? (
                <Grid item xs={12} sm={6}>
                  <ReferenceItem
                    label='Reference HM (at complete date)'
                    hm={context.referenceHmUnit}
                    date={context.referenceHmDate}
                  />
                </Grid>
              ) : null}
            </Grid>

            {context.hmMismatch ? (
              <Alert severity='warning' sx={{ mb: 2 }}>
                Unit HM has changed since this WO was closed
                {context.hmDriftHours != null && context.hmDriftHours > 0
                  ? ` (+${formatHm(context.hmDriftHours)} hrs)`
                  : context.hmDriftHours != null && context.hmDriftHours < 0
                    ? ` (${formatHm(context.hmDriftHours)} hrs)`
                    : ''}
                . After reopen, edit if needed then <strong>close again using HM at the actual replacement date</strong>{' '}
                (reference: {formatHm(context.referenceHmUnit ?? context.closedHmUnit)}
                {context.referenceHmDate ? ` on ${formatDisplayDate(context.referenceHmDate)}` : ''}), not the latest
                unit HM ({formatHm(context.latestHmUnit)}).
              </Alert>
            ) : (
              <Alert severity='info' sx={{ mb: 2 }}>
                After reopen, close again with HM at replacement date if you need to correct the closing reading.
              </Alert>
            )}
          </>
        ) : null}
      </DialogContent>
      <DialogActions className='dialog-actions-dense'>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button color='error' variant='contained' onClick={onConfirm} disabled={loading || fetching}>
          Reopen
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReopenReplacementDialog
