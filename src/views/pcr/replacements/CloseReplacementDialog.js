/**
 * Close WO dialog — closing HM at replacement date (not latest unit HM) + reference readings.
 */
import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'

import arkaApi from 'src/utils/arka-api'
import { formatDisplayDate, toIsoDateOnly } from 'src/utils/date-format'
import { SapDocumentPicker } from 'src/views/pcr/sap'

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

const ProcurementCheckItem = ({ label, filled }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Icon
      icon={filled ? 'tabler:circle-check-filled' : 'tabler:circle-x'}
      fontSize='1.1rem'
      style={{ color: filled ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-warning-main)' }}
    />
    <Typography variant='body2' sx={{ color: filled ? 'text.primary' : 'text.secondary' }}>
      {label}
      {!filled ? (
        <Typography component='span' variant='caption' sx={{ color: 'warning.main', ml: 0.75 }}>
          — required
        </Typography>
      ) : null}
    </Typography>
  </Box>
)

const PROCUREMENT_FIELDS = [
  { key: 'mrNo', label: 'MR No' },
  { key: 'prNo', label: 'PR No' },
  { key: 'poNo', label: 'PO No' },
  { key: 'returnOldcoreDate', label: 'Return Oldcore Date' },
  { key: 'spbBaReturnOldcore', label: 'SPB/BA Return Oldcore' }
]

const CloseReplacementDialog = ({ open, idRep, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [context, setContext] = useState(null)
  const [closingHm, setClosingHm] = useState('')
  const [woEndDate, setWoEndDate] = useState('')
  const [mrNo, setMrNo] = useState('')
  const [prNo, setPrNo] = useState('')
  const [poNo, setPoNo] = useState('')
  const [returnOldcoreDate, setReturnOldcoreDate] = useState('')
  const [spbBaReturnOldcore, setSpbBaReturnOldcore] = useState('')
  const [hasLinkedForecast, setHasLinkedForecast] = useState(false)

  useEffect(() => {
    if (!open || !idRep) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setContext(null)

      try {
        const { data } = await arkaApi.get(`/replacements/${idRep}/action-context`, {
          params: { mode: 'close' }
        })

        if (cancelled) return

        setContext(data)
        setHasLinkedForecast(Boolean(data.hasLinkedForecast))
        const defaultHm = data.referenceHmUnit ?? data.postingHm ?? ''
        setClosingHm(defaultHm !== '' && defaultHm != null ? String(defaultHm) : '')
        setWoEndDate(data.woEndDate ?? data.referenceDate ?? toIsoDateOnly(new Date()) ?? '')
        setMrNo(data.mrNo ?? '')
        setPrNo(data.prNo ?? '')
        setPoNo(data.poNo ?? '')
        setReturnOldcoreDate(data.returnOldcoreDate ?? '')
        setSpbBaReturnOldcore(data.spbBaReturnOldcore ?? '')
      } catch {
        if (!cancelled) {
          setContext(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [open, idRep])

  const procurementValues = useMemo(
    () => ({
      mrNo,
      prNo,
      poNo,
      returnOldcoreDate,
      spbBaReturnOldcore
    }),
    [mrNo, poNo, prNo, returnOldcoreDate, spbBaReturnOldcore]
  )

  const procurementStatus = useMemo(() => {
    const items = PROCUREMENT_FIELDS.map(field => ({
      ...field,
      filled:
        field.key === 'returnOldcoreDate'
          ? Boolean(procurementValues.returnOldcoreDate)
          : Boolean(String(procurementValues[field.key] ?? '').trim())
    }))

    return {
      items,
      allComplete: items.every(item => item.filled),
      missingLabels: items.filter(item => !item.filled).map(item => item.label)
    }
  }, [procurementValues])

  const closingHmNum = Number(closingHm)

  const inputWarnings = useMemo(() => {
    if (!context || !Number.isFinite(closingHmNum)) return []

    const warnings = []

    if (context.latestHmUnit != null && closingHmNum > context.latestHmUnit) {
      warnings.push(
        `Closing HM (${formatHm(closingHmNum)}) exceeds latest unit HM (${formatHm(context.latestHmUnit)}). Verify the reading.`
      )
    }

    if (
      context.latestHmUnit != null &&
      context.referenceHmUnit != null &&
      closingHmNum === context.latestHmUnit &&
      context.referenceHmUnit !== context.latestHmUnit
    ) {
      warnings.push(
        `You entered the latest unit HM. For close, use HM at replacement date (reference: ${formatHm(context.referenceHmUnit)} on ${formatDisplayDate(context.referenceHmDate)}).`
      )
    }

    if (
      context.referenceHmUnit != null &&
      Math.abs(closingHmNum - context.referenceHmUnit) > 200 &&
      context.latestHmUnit != null &&
      closingHmNum === context.latestHmUnit
    ) {
      warnings.push('Large gap vs reference HM — confirm this is intentional.')
    }

    return warnings
  }, [closingHmNum, context])

  const canSubmit =
    context &&
    Number.isFinite(closingHmNum) &&
    closingHmNum >= 0 &&
    procurementStatus.allComplete &&
    !submitting &&
    !loading

  const handleSubmit = async () => {
    if (!idRep || !Number.isFinite(closingHmNum) || closingHmNum < 0) return

    if (!procurementStatus.allComplete) {
      toast.error(`Complete procurement & oldcore: ${procurementStatus.missingLabels.join(', ')}`)

      return
    }

    setSubmitting(true)
    try {
      const payload = {
        closingHm: closingHmNum,
        mrNo: mrNo.trim(),
        prNo: prNo.trim(),
        poNo: poNo.trim(),
        spbBaReturnOldcore: spbBaReturnOldcore.trim()
      }
      if (woEndDate) payload.woEndDate = woEndDate
      if (returnOldcoreDate) payload.returnOldcoreDate = returnOldcoreDate

      await arkaApi.post(`/replacements/${idRep}/close`, payload)
      onSuccess?.()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.error ?? 'Close failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='md' fullWidth>
      <DialogTitle>Close Work Order</DialogTitle>
      <DialogContent>
        <Alert severity='info' sx={{ mb: 3 }}>
          Enter the <strong>HM at replacement / complete date</strong>, not the latest unit HM shown in Unit
          Information (unless replacement was done today).
        </Alert>

        {loading ? (
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Loading HM reference…
          </Typography>
        ) : context ? (
          <>
            <Typography variant='body2' sx={{ mb: 2 }}>
              WO #{context.woNo ?? context.idRep}
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <ReferenceItem
                  label='HM at closing date (default)'
                  hm={context.referenceHmUnit}
                  date={context.referenceHmDate}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <ReferenceItem
                  label='Latest unit HM (monitoring only)'
                  hm={context.latestHmUnit}
                  date={context.latestHmDate}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <ReferenceItem label='Posting HM (this WO)' hm={context.postingHm} date={context.woDate} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <ReferenceItem label='Last replacement HM' hm={context.lastHmRep} date={null} />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  type='number'
                  label='Closing HM'
                  value={closingHm}
                  onChange={event => setClosingHm(event.target.value)}
                  helperText='HM when replacement was completed'
                  inputProps={{ min: 0, step: 1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='WO Complete Date'
                  value={woEndDate}
                  onChange={event => setWoEndDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, mb: 2 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                Procurement & Oldcore
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Values are loaded from the work order record. All fields must be filled before closing.
                {hasLinkedForecast ? ' PO is also required to complete the linked PCR forecast.' : ''}
              </Typography>
            </Box>

            <Alert severity={procurementStatus.allComplete ? 'success' : 'warning'} sx={{ mb: 3 }}>
              <Typography variant='body2' sx={{ fontWeight: 600, mb: 1 }}>
                {procurementStatus.allComplete
                  ? 'Procurement & oldcore data is complete — ready to close.'
                  : 'Complete the following before closing:'}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {procurementStatus.items.map(item => (
                  <ProcurementCheckItem key={item.key} label={item.label} filled={item.filled} />
                ))}
              </Box>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <SapDocumentPicker
                  type='mr'
                  label='MR No'
                  value={mrNo}
                  onChange={setMrNo}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <SapDocumentPicker
                  type='pr'
                  label='PR No'
                  value={prNo}
                  onChange={setPrNo}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <SapDocumentPicker
                  type='po'
                  label='PO No'
                  value={poNo}
                  onChange={setPoNo}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Return Oldcore Date'
                  value={returnOldcoreDate}
                  onChange={event => setReturnOldcoreDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  label='SPB/BA Return Oldcore'
                  value={spbBaReturnOldcore}
                  onChange={event => setSpbBaReturnOldcore(event.target.value)}
                  required
                />
              </Grid>
            </Grid>

            {inputWarnings.map((text, index) => (
              <Alert key={index} severity='warning' sx={{ mt: 2 }}>
                {text}
              </Alert>
            ))}
          </>
        ) : (
          <Alert severity='error'>Failed to load close context.</Alert>
        )}
      </DialogContent>
      <DialogActions className='dialog-actions-dense'>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant='contained' onClick={handleSubmit} disabled={!canSubmit}>
          Close WO
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CloseReplacementDialog
