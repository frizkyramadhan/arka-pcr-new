/**
 * Read-only REMOVE / INSTALL — cozy paper-style layout matching the form.
 */
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'

import CannibalFormRow from 'src/views/pcr/cannibal/CannibalFormRow'

const formatDate = value => (value ? String(value).slice(0, 10) : '—')

const sidePanelSx = color => ({
  borderRadius: 2,
  overflow: 'hidden',
  border: theme => `1px solid ${theme.palette[color].main}`,
  bgcolor: theme => `${theme.palette[color].main}08`,
  boxShadow: theme => theme.shadows[1]
})

const ReadonlyValue = ({ value, print = false }) => (
  <Typography variant='body2' sx={{ fontWeight: 500, py: print ? 0 : 0.5, fontSize: print ? '9.5px' : undefined }}>
    {value || '—'}
  </Typography>
)

const resolveUnitLabel = side => {
  const unitNo = side?.unitNo ?? side?.unit?.unitNo
  if (unitNo != null && String(unitNo).trim() !== '') return String(unitNo).trim()

  const fleetUnitId = side?.fleetUnitId
  if (fleetUnitId != null && String(fleetUnitId).trim() !== '') return `Unit #${fleetUnitId}`

  return '—'
}

const resolveWoStatus = (side, sapWoStatus, sapWoStatusLoading) => {
  if (!side?.woNoKanibal) return side?.woStatusKanibal

  if (sapWoStatusLoading) return 'Loading…'
  if (sapWoStatus) return sapWoStatus

  return side?.woStatusKanibal
}

const TransferSideDisplay = ({ side, title, subtitle, icon, color, print = false, sapWoStatus, sapWoStatusLoading }) => {
  const unitLabel = resolveUnitLabel(side)

  return (
    <Box sx={sidePanelSx(color)}>
      <Box
        sx={{
          px: print ? 1.5 : 3,
          py: print ? 0.75 : 2,
          display: 'flex',
          alignItems: 'center',
          gap: print ? 0.75 : 1.25,
          borderBottom: theme => `1px solid ${theme.palette.divider}`,
          bgcolor: theme => `${theme.palette[color].main}18`
        }}
      >
        {!print ? <Icon icon={icon} fontSize='1rem' /> : null}
        <Box>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, lineHeight: 1.2, fontSize: print ? '9.5px' : '0.875rem' }}
          >
            {title}
          </Typography>
          {!print ? (
            <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Box>
      <CannibalFormRow print={print} compact={print} label='Project'>
        <ReadonlyValue print={print} value={side?.unitProjectCode ?? side?.unit?.projectCode} />
      </CannibalFormRow>
      <CannibalFormRow print={print} compact={print} label='Unit No.'>
        <ReadonlyValue print={print} value={unitLabel} />
      </CannibalFormRow>
      <CannibalFormRow print={print} compact={print} label='Date'>
        <ReadonlyValue print={print} value={formatDate(side?.date)} />
      </CannibalFormRow>
      <CannibalFormRow print={print} compact={print} label='P/N'>
        <ReadonlyValue print={print} value={side?.pn} />
      </CannibalFormRow>
      <CannibalFormRow print={print} compact={print} label='S/N'>
        <ReadonlyValue print={print} value={side?.sn} />
      </CannibalFormRow>
      <CannibalFormRow print={print} compact={print} label='POS.'>
        <ReadonlyValue print={print} value={side?.pos} />
      </CannibalFormRow>
      <CannibalFormRow print={print} compact={print} label='Component'>
        <ReadonlyValue print={print} value={side?.compDesc} />
      </CannibalFormRow>
      <CannibalFormRow print={print} compact={print} label='WO' highlight='wo'>
        <ReadonlyValue print={print} value={side?.woNoKanibal} />
      </CannibalFormRow>
      <CannibalFormRow print={print} compact={print} label='WO Status' highlight='wo'>
        <ReadonlyValue print={print} value={resolveWoStatus(side, sapWoStatus, sapWoStatusLoading)} />
      </CannibalFormRow>
      <CannibalFormRow print={print} compact={print} label='HM Comp' highlight='hm'>
        <ReadonlyValue print={print} value={side?.hmComp} />
      </CannibalFormRow>
    </Box>
  )
}

const mergeTransferSide = (transferSide, pairSide) => ({
  ...(pairSide ?? {}),
  ...(transferSide ?? {}),
  unitNo: transferSide?.unitNo || pairSide?.unitNo || pairSide?.unit?.unitNo || '',
  unitProjectCode:
    transferSide?.unitProjectCode || pairSide?.unitProjectCode || pairSide?.unit?.projectCode || '',
  fleetUnitId: transferSide?.fleetUnitId || pairSide?.fleetUnitId || ''
})

const CannibalTransferDisplay = ({
  transfer,
  pairs,
  compact = false,
  print = false,
  sapWoStatuses = null,
  sapWoStatusesLoading = false
}) => {
  const pair = pairs?.[0]

  const resolved = pair
    ? {
        remove: mergeTransferSide(transfer?.remove, pair.remove),
        install: mergeTransferSide(transfer?.install, pair.install)
      }
    : transfer ?? { remove: {}, install: {} }

  const hasData = resolved.remove?.fleetUnitId || resolved.install?.fleetUnitId || resolved.remove?.compDesc

  if (!hasData) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          No component transfer data yet
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      {!compact && pairs?.length > 1 ? (
        <Typography variant='caption' color='warning.main' sx={{ display: 'block', mb: 2 }}>
          Legacy data: showing the first transfer only ({pairs.length} entries).
        </Typography>
      ) : null}

      <Grid container spacing={print ? 1 : 3} alignItems='stretch' sx={{ mt: print ? 0 : 3 }}>
        <Grid item xs={print ? 6 : 12} md={print ? 6 : 5.5}>
          <TransferSideDisplay
            side={resolved.remove}
            title='REMOVE FROM'
            subtitle='Taken from unit'
            icon='tabler:arrow-up-right'
            color='warning'
            print={print}
            sapWoStatus={sapWoStatuses?.remove}
            sapWoStatusLoading={sapWoStatusesLoading}
          />
        </Grid>
        {!print ? (
          <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: { xs: 0.5, md: 0 } }}>
            <Box
              sx={{
                display: 'flex',
                width: 36,
                height: 36,
                borderRadius: '50%',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: 2,
                transform: { xs: 'rotate(90deg)', md: 'none' }
              }}
            >
              <Icon icon='tabler:arrow-right' fontSize='1.125rem' />
            </Box>
          </Grid>
        ) : null}
        <Grid item xs={print ? 6 : 12} md={print ? 6 : 5.5}>
          <TransferSideDisplay
            side={resolved.install}
            title='INSTALL TO'
            subtitle='Installed to unit'
            icon='tabler:arrow-down-left'
            color='success'
            print={print}
            sapWoStatus={sapWoStatuses?.install}
            sapWoStatusLoading={sapWoStatusesLoading}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default CannibalTransferDisplay
