/**
 * Admin debug — trial kirim email notifikasi (SMTP) + preview template di browser.
 * Hanya system.admin.
 */
import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import Switch from '@mui/material/Switch'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import PageHeader from 'src/@core/components/page-header'

import useCan from 'src/hooks/useCan'
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'

const DEFAULT_EVENTS = [
  'approval_pending',
  'approval_decision',
  'fully_approved',
  'cannibal_handoff',
  'cannibal_requestor_pending',
  'cannibal_requestor_confirmed',
  'cannibal_requestor_rejected',
  'plain_ping'
]

const EVENT_LABELS = {
  approval_pending: 'Approval pending',
  approval_decision: 'Approval decision',
  fully_approved: 'Fully approved',
  cannibal_handoff: 'Cannibal handoff (logistics)',
  cannibal_requestor_pending: 'Cannibal — requestor pending',
  cannibal_requestor_confirmed: 'Cannibal — requestor confirmed',
  cannibal_requestor_rejected: 'Cannibal — requestor rejected',
  plain_ping: 'Plain ping'
}

const EmailNotificationsPage = () => {
  const { can } = useCan()
  const isAdmin = can('system.admin')

  const [status, setStatus] = useState(null)
  const [previewSamples, setPreviewSamples] = useState([])
  const [events, setEvents] = useState(DEFAULT_EVENTS)
  const [to, setTo] = useState('')
  const [event, setEvent] = useState('plain_ping')
  const [documentNo, setDocumentNo] = useState('')
  const [level, setLevel] = useState('')
  const [unitNo, setUnitNo] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [compDesc, setCompDesc] = useState('')
  const [actorName, setActorName] = useState('')
  const [remark, setRemark] = useState('')
  const [message, setMessage] = useState('ARKA PCR email notification — uji koneksi SMTP.')
  const [sending, setSending] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [togglingMail, setTogglingMail] = useState(false)

  const buildSamplePayload = useCallback(
    () => ({
      documentNo: documentNo.trim() || undefined,
      level: level.trim() || undefined,
      unitNo: unitNo.trim() || undefined,
      projectCode: projectCode.trim() || undefined,
      compDesc: compDesc.trim() || undefined,
      actorName: actorName.trim() || undefined,
      remark: remark.trim() || undefined,
      message: message.trim() || undefined
    }),
    [documentNo, level, unitNo, projectCode, compDesc, actorName, remark, message]
  )

  const applyFormDefaultsFromSamples = useCallback(samples => {
    if (!Array.isArray(samples)) return

    const pending = samples.find(row => row.event === 'approval_pending')?.source
    if (!pending) return

    setDocumentNo(prev => prev || pending.documentNo || '')
    setUnitNo(prev => prev || pending.unitNo || '')
    setProjectCode(prev => prev || pending.projectCode || '')
  }, [])

  const buildPreviewUrl = useCallback(
    previewEvent => {
      const params = new URLSearchParams({ event: previewEvent })
      const sample = buildSamplePayload()
      Object.entries(sample).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })

      return `/api/admin/email-test/preview/?${params.toString()}`
    },
    [buildSamplePayload]
  )

  const getPreviewSource = useCallback(
    previewEvent => previewSamples.find(row => row.event === previewEvent)?.source,
    [previewSamples]
  )

  const openPreview = useCallback(
    previewEvent => {
      window.open(buildPreviewUrl(previewEvent), '_blank', 'noopener,noreferrer')
    },
    [buildPreviewUrl]
  )

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const res = await arkaApi.get('/admin/email-test')
      setStatus(res.data?.data ?? null)
      if (Array.isArray(res.data?.data?.previewSamples)) {
        setPreviewSamples(res.data.data.previewSamples)
        applyFormDefaultsFromSamples(res.data.data.previewSamples)
      }
      if (Array.isArray(res.data?.data?.events) && res.data.data.events.length) {
        setEvents(res.data.data.events)
      }
    } catch (error) {
      await notifyApiError(error, 'Failed to load mail status', toast.error)
    } finally {
      setLoadingStatus(false)
    }
  }, [applyFormDefaultsFromSamples])

  useEffect(() => {
    if (!isAdmin) return
    fetchStatus()
  }, [isAdmin, fetchStatus])

  const handleToggleMailEnabled = async enabled => {
    setTogglingMail(true)
    try {
      const res = await arkaApi.patch('/admin/email-test', { mailEnabled: enabled })
      const next = res.data?.data
      if (next) {
        setStatus(prev => ({ ...(prev || {}), ...next }))
      }
      toast.success(enabled ? 'Email notifications ON' : 'Email notifications OFF')
    } catch (error) {
      await notifyApiError(error, 'Failed to update MAIL_ENABLED', toast.error)
    } finally {
      setTogglingMail(false)
    }
  }

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error('Recipient email is required')

      return
    }

    setSending(true)
    try {
      const res = await arkaApi.post('/admin/email-test', {
        to: to.trim(),
        event,
        sample: buildSamplePayload()
      })
      const data = res.data?.data
      if (data?.skipped) {
        toast.success(`Skipped: ${data.reason || 'mail disabled'}`)
      } else {
        toast.success(`Sent${data?.id ? ` — message id ${data.id}` : ''}`)
      }
      fetchStatus()
    } catch (error) {
      await notifyApiError(error, 'Failed to send trial email', toast.error)
    } finally {
      setSending(false)
    }
  }

  if (!isAdmin) {
    return (
      <Box>
        <PageHeader title='Email Notifications' subtitle='Admin trial sender' />
        <Alert severity='warning'>You need system.admin permission to use this page.</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <PageHeader
        title='Email Notifications'
        subtitle='Preview templates or send trial emails (admin debug, SMTP)'
      />

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title='Runtime status' action={
              <Button size='small' onClick={fetchStatus} disabled={loadingStatus}>
                Refresh
              </Button>
            } />
            <CardContent>
              {!status ? (
                <Typography color='text.secondary'>{loadingStatus ? 'Loading…' : 'No status'}</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant='body2' sx={{ minWidth: 110 }}>
                      MAIL_ENABLED
                    </Typography>
                    <FormControlLabel
                      sx={{ ml: 0, mr: 1 }}
                      control={
                        <Switch
                          color='success'
                          checked={Boolean(status.mailEnabled)}
                          disabled={togglingMail}
                          onChange={e => handleToggleMailEnabled(e.target.checked)}
                          inputProps={{ 'aria-label': 'Toggle MAIL_ENABLED' }}
                        />
                      }
                      label={
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {status.mailEnabled ? 'On' : 'Off'}
                        </Typography>
                      }
                    />
                    <CustomChip
                      rounded
                      size='small'
                      skin='light'
                      color={status.mailEnabled ? 'success' : 'warning'}
                      label={status.mailEnabledSource === 'runtime' ? 'runtime' : 'env'}
                    />
                  </Box>
                  <Typography variant='caption' color='text.secondary' sx={{ mt: -1 }}>
                    {status.mailEnabledSource === 'runtime'
                      ? `Override admin (env default: ${status.mailEnabledEnvDefault ? 'true' : 'false'})`
                      : 'Mengikuti MAIL_ENABLED di .env — toggle untuk override'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant='body2' sx={{ minWidth: 110 }}>
                      SMTP
                    </Typography>
                    <CustomChip
                      rounded
                      size='small'
                      skin='light'
                      color={status.smtpConfigured ? 'success' : 'error'}
                      label={status.smtpConfigured ? 'configured' : 'missing host'}
                    />
                  </Box>
                  {status.smtpHost ? (
                    <Typography variant='body2'>
                      <strong>Host:</strong> {status.smtpHost}:{status.smtpPort}
                      {status.smtpSecure ? ' (TLS)' : ''}
                      {status.smtpAuth ? ' + auth' : ''}
                    </Typography>
                  ) : null}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant='body2' sx={{ minWidth: 110 }}>
                      Connection
                    </Typography>
                    <CustomChip
                      rounded
                      size='small'
                      skin='light'
                      color={
                        !status.smtpConfigured ? 'default' : status.smtpReachable ? 'success' : 'error'
                      }
                      label={
                        !status.smtpConfigured
                          ? 'n/a'
                          : status.smtpReachable
                            ? 'reachable'
                            : 'unreachable'
                      }
                    />
                  </Box>
                  {status.smtpError ? (
                    <Typography variant='caption' color='error'>
                      {status.smtpError}
                    </Typography>
                  ) : null}
                  <Typography variant='body2'>
                    <strong>From:</strong> {status.mailFrom || '-'}
                  </Typography>
                  <Typography variant='body2'>
                    <strong>App URL:</strong> {status.appBaseUrl || '-'}
                  </Typography>
                  <Alert severity='info' sx={{ mt: 1 }}>
                    Preview memakai data real terakhir dari database. Field sample di bawah opsional untuk override.
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 4 }}>
            <CardHeader
              title='Template previews'
              subheader='Buka HTML sample di tab baru — data dari record terakhir di DB'
            />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Event</TableCell>
                      <TableCell>Label</TableCell>
                      <TableCell>Sumber data</TableCell>
                      <TableCell align='right'>Preview</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.map(code => {
                      const source = getPreviewSource(code)

                      return (
                        <TableRow key={code} hover>
                          <TableCell>
                            <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                              {code}
                            </Typography>
                          </TableCell>
                          <TableCell>{EVENT_LABELS[code] ?? code}</TableCell>
                          <TableCell>
                            {source ? (
                              <Box>
                                <Typography variant='body2'>{source.label}</Typography>
                                {(source.documentNo || source.unitNo) && (
                                  <Typography variant='caption' color='text.secondary'>
                                    {[source.documentNo, source.unitNo, source.projectCode].filter(Boolean).join(' · ')}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant='caption' color='text.secondary'>
                                Loading…
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align='right'>
                            <Tooltip title='Buka preview di tab baru'>
                              <IconButton
                                size='small'
                                color='primary'
                                onClick={() => openPreview(code)}
                                aria-label={`Preview ${code}`}
                              >
                                <Icon icon='tabler:eye' fontSize='1.25rem' />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title='Send trial email' />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label='To (custom email)'
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    placeholder='you@example.com'
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <SearchableSelect
                    label='Event / template'
                    value={event}
                    onChange={e => setEvent(e.target.value)}
                    options={events.map(code => ({ value: code, label: code }))}
                    disableClearable
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Sample document no (override)'
                    value={documentNo}
                    onChange={e => setDocumentNo(e.target.value)}
                    placeholder='Kosongkan = pakai data DB'
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label='Level (override)'
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                    placeholder='PS'
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label='Project (override)'
                    value={projectCode}
                    onChange={e => setProjectCode(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label='Unit no (override)' value={unitNo} onChange={e => setUnitNo(e.target.value)} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label='Komponen (override)'
                    value={compDesc}
                    onChange={e => setCompDesc(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label='Actor (override)'
                    value={actorName}
                    onChange={e => setActorName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label='Remark (override, approval templates)'
                    value={remark}
                    onChange={e => setRemark(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label='Message (plain_ping)'
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Button variant='outlined' startIcon={<Icon icon='tabler:eye' />} onClick={() => openPreview(event)}>
                      Preview selected template
                    </Button>
                    <Button variant='contained' onClick={handleSend} disabled={sending}>
                      {sending ? 'Sending…' : 'Send trial email'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

EmailNotificationsPage.acl = {
  action: 'read',
  subject: 'system-admin'
}

export default EmailNotificationsPage
