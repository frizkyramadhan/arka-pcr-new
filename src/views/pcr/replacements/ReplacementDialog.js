/**
 * Add / Edit Replacement — sectioned form with WO + procurement (MR/PR/PO/oldcore).
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
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import InstallationReportUpload from 'src/@core/components/installation-report-upload'

import arkaApi from 'src/utils/arka-api'
import { validateForm } from 'src/utils/api-error-message'
import { formatUploadError } from 'src/utils/format-upload-error'
import { toIsoDateOnly } from 'src/utils/date-format'
import { uploadReplacementReport } from 'src/utils/upload-replacement-report'

import { replacementCreateSchema, replacementUpdateSchema } from '@/lib/validations/replacement'
import { resolveOpenHmRepDisplay } from '@/lib/replacement/hm-rep'
import { SapDocumentPicker } from 'src/views/pcr/sap'

const defaultForm = {
  idMod: '',
  repDate: '',
  hmRep: '',
  woNo: '',
  woDate: '',
  woEndDate: '',
  mrNo: '',
  prNo: '',
  poNo: '',
  returnOldcoreDate: '',
  spbBaReturnOldcore: '',
  compHour: '0',
  compCond: 'A',
  remarks: ''
}

const extractModelComponents = data => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.rows)) return data.rows

  return []
}

const formatComponentOption = item => {
  const desc = item.comp?.compDesc ?? `Component #${item.idMod}`
  const type = item.comp?.compType ?? item.lifeType

  return type ? `${desc} (${type})` : desc
}

const toFormDate = value => toIsoDateOnly(value) ?? ''

const normalizeCompCond = value => {
  const text = String(value ?? '')
    .trim()
    .toUpperCase()
  const map = { NORMAL: 'N', ATTENTION: 'A', CRITICAL: 'C' }

  if (map[text]) return map[text]
  if (text.length === 1) return text

  return text.slice(0, 1) || 'A'
}

const resolveComponentLabel = (initialData, policies, idMod) => {
  if (initialData?.commod?.comp?.compDesc) {
    const type = initialData.commod.comp.compType ?? initialData.commod.lifeType

    return type ? `${initialData.commod.comp.compDesc} (${type})` : initialData.commod.comp.compDesc
  }

  const match = policies.find(item => String(item.idMod) === String(idMod))

  return match ? formatComponentOption(match) : idMod ? `Component #${idMod}` : '—'
}

const resolveCompType = (initialData, policies, idMod) => {
  if (initialData) {
    return initialData.commod?.comp?.compType ?? initialData.commod?.lifeType ?? initialData.compType ?? null
  }

  const match = policies.find(item => String(item.idMod) === String(idMod))

  return match?.comp?.compType ?? match?.lifeType ?? null
}

const FormSection = ({ icon, title, subtitle, children }) => (
  <Box
    sx={{
      p: { xs: 3, sm: 4 },
      borderRadius: 2,
      border: theme => `1px solid ${theme.palette.divider}`,
      bgcolor: theme => (theme.palette.mode === 'light' ? 'grey.50' : 'action.hover'),
      height: '100%'
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          bgcolor: theme => `${theme.palette.primary.main}14`,
          color: 'primary.main'
        }}
      >
        <Icon icon={icon} fontSize='1.25rem' />
      </Box>
      <Box>
        <Typography variant='subtitle1' sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Box>
    <Grid container spacing={3}>
      {children}
    </Grid>
  </Box>
)

const ReplacementDialog = ({
  open,
  onClose,
  onExited,
  fleetUnitId,
  fleetModelId,
  initialData,
  presetIdMod,
  eligibleIdMods = null,
  latestHmUnit = null,
  onRefresh,
  onSubmit,
  closedEditAllowed = false
}) => {
  const [form, setForm] = useState(defaultForm)
  const [policies, setPolicies] = useState([])
  const [reportFile, setReportFile] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(initialData?.idRep)
  const woClosed = initialData?.woStatus === 'CLOSE'
  const closedEditMode = woClosed && closedEditAllowed

  const hmUnitHelperText = woClosed
    ? 'HM unit tersimpan saat WO ditutup'
    : initialData?.hmRepManual
      ? 'HM unit di-set manual'
      : 'HM unit berjalan (live)'

  const eligibleSet = eligibleIdMods != null ? new Set(eligibleIdMods.map(id => String(id))) : null

  const componentOptions = useMemo(() => {
    const filtered = policies.filter(item => !eligibleSet || eligibleSet.has(String(item.idMod)))
    const ensureId = isEdit ? initialData?.idMod : form.idMod || presetIdMod

    if (ensureId) {
      const id = String(ensureId)
      if (!filtered.some(item => String(item.idMod) === id)) {
        const existing = policies.find(item => String(item.idMod) === id)
        if (existing) return [existing, ...filtered]

        // Keep Select in-range while policies load / during dialog exit.
        return [{ idMod: id, comp: { compDesc: `Component #${id}` } }, ...filtered]
      }
    }

    return filtered
  }, [policies, eligibleSet, isEdit, initialData?.idMod, form.idMod, presetIdMod])

  const selectIdMod = useMemo(() => {
    const value = String(form.idMod ?? '')
    if (!value) return ''
    if (componentOptions.some(item => String(item.idMod) === value)) return value

    return ''
  }, [form.idMod, componentOptions])

  const compType = resolveCompType(initialData, policies, form.idMod)
  const isMajor = compType?.toUpperCase() === 'MAJOR'
  const componentLabel = resolveComponentLabel(initialData, policies, form.idMod)

  useEffect(() => {
    if (!open) {
      setReportFile(null)
      setUploadError('')

      return
    }

    if (initialData) {
      const displayHm = resolveOpenHmRepDisplay(initialData, latestHmUnit)

      setForm({
        idMod: String(initialData.idMod ?? ''),
        repDate: toFormDate(initialData.repDate),
        hmRep: displayHm != null && displayHm !== '' ? String(displayHm) : '',
        woNo: initialData.woNo != null ? String(initialData.woNo) : '',
        woDate: toFormDate(initialData.woDate),
        woEndDate: toFormDate(initialData.woEndDate),
        mrNo: initialData.mrNo != null ? String(initialData.mrNo) : '',
        prNo: initialData.prNo != null ? String(initialData.prNo) : '',
        poNo: initialData.poNo != null ? String(initialData.poNo) : '',
        returnOldcoreDate: toFormDate(initialData.returnOldcoreDate),
        spbBaReturnOldcore: initialData.spbBaReturnOldcore != null ? String(initialData.spbBaReturnOldcore) : '',
        compHour: String(initialData.compHour ?? '0'),
        compCond: initialData.compCond ?? 'A',
        remarks: initialData.remarks ?? ''
      })
    } else {
      setForm({
        ...defaultForm,
        repDate: toFormDate(new Date()),
        hmRep: latestHmUnit != null ? String(latestHmUnit) : '',
        idMod: presetIdMod ? String(presetIdMod) : ''
      })
    }
  }, [initialData, open, presetIdMod, latestHmUnit])

  useEffect(() => {
    if (!fleetModelId || !open) return

    let cancelled = false

    arkaApi
      .get('/model-components', { params: { fleetModelId, pageSize: 100 } })
      .then(res => {
        if (cancelled) return

        const items = extractModelComponents(res.data).sort((a, b) =>
          (a.comp?.compDesc ?? '').localeCompare(b.comp?.compDesc ?? '', 'id')
        )
        setPolicies(items)
      })
      .catch(() => {
        if (!cancelled) setPolicies([])
      })

    return () => {
      cancelled = true
    }
  }, [fleetModelId, open])

  const handleDialogExited = () => {
    setForm(defaultForm)
    setPolicies([])
    setReportFile(null)
    setUploadError('')
    onExited?.()
  }

  const handleChange = field => event => {
    setForm(prev => ({ ...prev, [field]: event.target.value }))
  }

  const buildPayload = () => {
    const payload = {
      fleetUnitId,
      idMod: form.idMod,
      hmRep: form.hmRep,
      lastHmRep: initialData?.lastHmRep ?? 0,
      woNo: form.woNo.trim() || null,
      mrNo: form.mrNo.trim() || null,
      prNo: form.prNo.trim() || null,
      poNo: form.poNo.trim() || null,
      spbBaReturnOldcore: form.spbBaReturnOldcore.trim() || null,
      compHour: form.compHour,
      compCond: normalizeCompCond(form.compCond),
      remarks: form.remarks
    }

    if (form.repDate) payload.repDate = form.repDate
    if (form.woDate) payload.woDate = form.woDate
    if (form.woEndDate) payload.woEndDate = form.woEndDate
    if (form.returnOldcoreDate) payload.returnOldcoreDate = form.returnOldcoreDate

    return payload
  }

  const handleSubmit = async () => {
    const payload = buildPayload()

    const result = isEdit
      ? (() => {
          const parsed = replacementUpdateSchema.safeParse(payload)

          return parsed.success
            ? { success: true, data: parsed.data }
            : { success: false, message: parsed.error.issues[0]?.message ?? 'Invalid form data' }
        })()
      : validateForm(replacementCreateSchema, {
          ...payload,
          repDate: form.repDate || new Date().toISOString().slice(0, 10)
        })

    if (!result.success) {
      toast.error(result.message)

      return
    }

    setSaving(true)
    setUploadError('')

    try {
      await onSubmit(result.data)

      if (reportFile && initialData?.idRep) {
        await uploadReplacementReport(initialData.idRep, reportFile)
        toast.success('Installation report uploaded')
      }

      setReportFile(null)
      onRefresh?.()
    } catch (error) {
      const message = error.userMessage ?? formatUploadError(error, { fallback: 'Save failed' })
      if (reportFile && initialData?.idRep) {
        setUploadError(message)
      }
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='lg'
      scroll='paper'
      TransitionProps={{ onExited: handleDialogExited }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: theme => `${theme.palette.primary.main}14`,
            color: 'primary.main'
          }}
        >
          <Icon icon={isEdit ? 'tabler:edit' : 'tabler:plus'} fontSize='1.35rem' />
        </Box>
        <Box>
          <Typography variant='h5' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {closedEditMode ? 'Edit Closed Work Order' : isEdit ? 'Edit Replacement' : 'Add Replacement'}
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
            {closedEditMode
              ? 'Changes are saved directly — no reopen required'
              : 'Work order, component metrics, and procurement references'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {closedEditMode ? (
          <Alert severity='info' sx={{ mb: 4 }}>
            Editing a closed work order. Procurement, dates, and metrics can be corrected without reopening the WO.
          </Alert>
        ) : null}
        <Grid container spacing={4}>
          {/* Component selector */}
          <Grid item xs={12}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: theme => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper'
              }}
            >
              {!isEdit ? (
                <CustomTextField
                  select
                  fullWidth
                  label='Component'
                  value={selectIdMod}
                  onChange={handleChange('idMod')}
                  disabled={Boolean(presetIdMod)}
                  SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value='' disabled>
                    {fleetModelId ? 'Select component' : 'Unit model not available'}
                  </MenuItem>
                  {componentOptions.map(item => (
                    <MenuItem key={item.idMod} value={String(item.idMod)}>
                      {formatComponentOption(item)}
                    </MenuItem>
                  ))}
                </CustomTextField>
              ) : (
                <CustomTextField fullWidth label='Component' value={componentLabel} disabled />
              )}
            </Box>
          </Grid>

          {/* Metrics + WO */}
          <Grid item xs={12} md={6}>
            <FormSection icon='tabler:gauge' title='Component & Posting' subtitle='Hour meter and condition at posting'>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Posting Date'
                  value={form.repDate}
                  onChange={handleChange('repDate')}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  type='number'
                  label='H/M Unit'
                  value={form.hmRep}
                  onChange={handleChange('hmRep')}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText={isEdit ? hmUnitHelperText : undefined}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  type='number'
                  label='Installed Comp. Hours'
                  value={form.compHour}
                  onChange={handleChange('compHour')}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  label='Component Condition'
                  value={form.compCond}
                  onChange={handleChange('compCond')}
                  placeholder='A, B, C, X'
                  helperText='Single char or NORMAL / ATTENTION / CRITICAL'
                />
              </Grid>
            </FormSection>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormSection icon='tabler:clipboard-list' title='Work Order' subtitle='WO number and schedule dates'>
              <Grid item xs={12}>
                <SapDocumentPicker
                  type='wo'
                  label='Work Order No.'
                  value={form.woNo}
                  onChange={value => setForm(prev => ({ ...prev, woNo: value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='WO Schedule Date'
                  value={form.woDate}
                  onChange={handleChange('woDate')}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='WO Complete Date'
                  value={form.woEndDate}
                  onChange={handleChange('woEndDate')}
                  InputLabelProps={{ shrink: true }}
                  disabled={woClosed && !closedEditMode}
                  helperText={woClosed && !closedEditMode ? 'Use reopen flow to change closed WO' : undefined}
                />
              </Grid>
            </FormSection>
          </Grid>

          {/* Procurement */}
          <Grid item xs={12}>
            <FormSection
              icon='tabler:file-invoice'
              title='Procurement & Oldcore'
              subtitle='MR → PR → PO chain and oldcore return documentation'
            >
              <Grid item xs={12} sm={4}>
                <SapDocumentPicker
                  type='mr'
                  label='MR No.'
                  value={form.mrNo}
                  onChange={value => setForm(prev => ({ ...prev, mrNo: value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <SapDocumentPicker
                  type='pr'
                  label='PR No.'
                  value={form.prNo}
                  onChange={value => setForm(prev => ({ ...prev, prNo: value }))}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <SapDocumentPicker
                  type='po'
                  label='PO No.'
                  value={form.poNo}
                  onChange={value => setForm(prev => ({ ...prev, poNo: value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  type='date'
                  label='Return Oldcore Date'
                  value={form.returnOldcoreDate}
                  onChange={handleChange('returnOldcoreDate')}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <CustomTextField
                  fullWidth
                  label='SPB / BA Return Oldcore'
                  value={form.spbBaReturnOldcore}
                  onChange={handleChange('spbBaReturnOldcore')}
                  placeholder='Document number'
                />
              </Grid>
            </FormSection>
          </Grid>

          {/* Remarks */}
          <Grid item xs={12}>
            <Box
              sx={{
                p: { xs: 3, sm: 4 },
                borderRadius: 2,
                border: theme => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper'
              }}
            >
              <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 2 }}>
                Remarks
              </Typography>
              <CustomTextField
                fullWidth
                multiline
                minRows={3}
                label='Notes'
                value={form.remarks}
                onChange={handleChange('remarks')}
                placeholder='Optional notes for this replacement work order'
              />
            </Box>
          </Grid>

          {isEdit && isMajor ? (
            <Grid item xs={12}>
              <Box
                sx={{
                  p: { xs: 3, sm: 4 },
                  borderRadius: 2,
                  border: theme => `1px solid ${theme.palette.divider}`,
                  bgcolor: theme => (theme.palette.mode === 'light' ? 'grey.50' : 'action.hover')
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Icon icon='tabler:file-upload' fontSize='1.25rem' />
                  <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                    Installation Report
                  </Typography>
                </Box>
                <InstallationReportUpload
                  idRep={initialData.idRep}
                  file={reportFile}
                  onFileChange={file => {
                    setReportFile(file)
                    if (file) setUploadError('')
                  }}
                  hasExistingReport={Boolean(initialData?.report)}
                  onDeleted={onRefresh}
                  disabled={saving}
                />
                {uploadError ? (
                  <Alert severity='error' sx={{ mt: 2 }}>
                    {uploadError}
                  </Alert>
                ) : null}
              </Box>
            </Grid>
          ) : null}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 5, py: 4, borderTop: theme => `1px solid ${theme.palette.divider}` }}>
        <Button variant='tonal' color='secondary' onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={saving}
          startIcon={<Icon icon='tabler:device-floppy' />}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReplacementDialog
