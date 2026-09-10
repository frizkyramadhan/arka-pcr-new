/**
 * Edit Replacement form — same sectioned fields as the former modal (WO + procurement).
 */
import { useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import InstallationReportUpload from 'src/@core/components/installation-report-upload'

import arkaApi from 'src/utils/arka-api'
import { formatUploadError } from 'src/utils/format-upload-error'
import { toIsoDateOnly } from 'src/utils/date-format'
import { uploadReplacementReport } from 'src/utils/upload-replacement-report'

import { replacementUpdateSchema } from '@/lib/validations/replacement'
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

const resolveComponentLabel = (replacement, policies, idMod) => {
  if (replacement?.commod?.comp?.compDesc) {
    const type = replacement.commod.comp.compType ?? replacement.commod.lifeType

    return type ? `${replacement.commod.comp.compDesc} (${type})` : replacement.commod.comp.compDesc
  }

  const match = policies.find(item => String(item.idMod) === String(idMod))

  return match ? formatComponentOption(match) : idMod ? `Component #${idMod}` : '—'
}

const resolveCompType = (replacement, policies, idMod) => {
  if (replacement) {
    return replacement.commod?.comp?.compType ?? replacement.commod?.lifeType ?? replacement.compType ?? null
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

const ReplacementForm = ({
  replacement,
  fleetModelId,
  latestHmUnit = null,
  closedEditAllowed = false,
  onCancel,
  onSuccess
}) => {
  const [form, setForm] = useState(defaultForm)
  const [policies, setPolicies] = useState([])
  const [reportFile, setReportFile] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)

  const woClosed = replacement?.woStatus === 'CLOSE'
  const closedEditMode = woClosed && closedEditAllowed

  const hmUnitHelperText = woClosed
    ? 'HM unit tersimpan saat WO ditutup'
    : replacement?.hmRepManual
      ? 'HM unit di-set manual'
      : 'HM unit berjalan (live)'

  const compType = resolveCompType(replacement, policies, form.idMod)
  const isMajor = compType?.toUpperCase() === 'MAJOR'
  const componentLabel = resolveComponentLabel(replacement, policies, form.idMod)

  useEffect(() => {
    if (!replacement) return

    const displayHm = resolveOpenHmRepDisplay(replacement, latestHmUnit)

    setForm({
      idMod: String(replacement.idMod ?? ''),
      repDate: toFormDate(replacement.repDate),
      hmRep: displayHm != null && displayHm !== '' ? String(displayHm) : '',
      woNo: replacement.woNo != null ? String(replacement.woNo) : '',
      woDate: toFormDate(replacement.woDate),
      woEndDate: toFormDate(replacement.woEndDate),
      mrNo: replacement.mrNo != null ? String(replacement.mrNo) : '',
      prNo: replacement.prNo != null ? String(replacement.prNo) : '',
      poNo: replacement.poNo != null ? String(replacement.poNo) : '',
      returnOldcoreDate: toFormDate(replacement.returnOldcoreDate),
      spbBaReturnOldcore: replacement.spbBaReturnOldcore != null ? String(replacement.spbBaReturnOldcore) : '',
      compHour: String(replacement.compHour ?? '0'),
      compCond: replacement.compCond ?? 'A',
      remarks: replacement.remarks ?? ''
    })
    setReportFile(null)
    setUploadError('')
  }, [replacement, latestHmUnit])

  useEffect(() => {
    if (!fleetModelId) return

    let cancelled = false

    arkaApi
      .get('/model-components', { params: { fleetModelId } })
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
  }, [fleetModelId])

  const handleChange = field => event => {
    setForm(prev => ({ ...prev, [field]: event.target.value }))
  }

  const buildPayload = () => {
    const payload = {
      fleetUnitId: replacement.fleetUnitId,
      idMod: form.idMod,
      hmRep: form.hmRep,
      lastHmRep: replacement?.lastHmRep ?? 0,
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
    const parsed = replacementUpdateSchema.safeParse(payload)

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid form data')

      return
    }

    setSaving(true)
    setUploadError('')

    try {
      await arkaApi.put(`/replacements/${replacement.idRep}`, parsed.data)
      toast.success('Work order updated')

      if (reportFile) {
        await uploadReplacementReport(replacement.idRep, reportFile)
        toast.success('Installation report uploaded')
      }

      setReportFile(null)
      onSuccess?.()
    } catch (error) {
      const message = error.userMessage ?? formatUploadError(error, { fallback: 'Save failed' })
      if (reportFile) {
        setUploadError(message)
      }
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const title = closedEditMode ? 'Edit Closed Work Order' : 'Edit Replacement'

  const subtitle = closedEditMode
    ? 'Changes are saved directly — no reopen required'
    : 'Work order, component metrics, and procurement references'

  return (
    <Card>
      <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
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
            <Icon icon='tabler:edit' fontSize='1.35rem' />
          </Box>
          <Box>
            <Typography variant='h5' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {title}
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5 }}>
              {subtitle}
            </Typography>
          </Box>
        </Box>

        {closedEditMode ? (
          <Alert severity='info' sx={{ mb: 4 }}>
            Editing a closed work order. Procurement, dates, and metrics can be corrected without reopening the WO.
          </Alert>
        ) : null}

        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: theme => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper'
              }}
            >
              <CustomTextField fullWidth label='Component' value={componentLabel} disabled />
            </Box>
          </Grid>

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
                  helperText={hmUnitHelperText}
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

          {isMajor ? (
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
                  idRep={replacement.idRep}
                  file={reportFile}
                  onFileChange={file => {
                    setReportFile(file)
                    if (file) setUploadError('')
                  }}
                  hasExistingReport={Boolean(replacement?.report)}
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
      </CardContent>

      <CardActions sx={{ flexWrap: 'wrap', gap: 1, px: 5, pb: 5 }}>
        <Button variant='tonal' color='secondary' onClick={onCancel} disabled={saving}>
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
      </CardActions>
    </Card>
  )
}

export default ReplacementForm
