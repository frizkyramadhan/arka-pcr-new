/**
 * Breakdown detail — ringkasan status, data laporan, lalu urutan activity.
 * Bukan tabel lebar yang sama dengan list.
 */
import { useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import { styled } from '@mui/material/styles'
import Timeline from '@mui/lab/Timeline'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import Typography from '@mui/material/Typography'
import toast from 'react-hot-toast'

import { collapseRepeatedName } from '@/lib/dmbd/employee-label'
import CustomChip from 'src/@core/components/mui/chip'
import Icon from 'src/@core/components/icon'
import PageHeader from 'src/@core/components/page-header'
import { AbilityContext } from 'src/layouts/components/acl/Can'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import arkaApi from 'src/utils/arka-api'
import { withBasePath } from 'src/utils/base-path'
import { formatDisplayDateTime } from 'src/utils/date-format'
import ActivityDialog from 'src/views/apps/breakdown/ActivityDialog'
import CloseDialog from 'src/views/apps/breakdown/CloseDialog'

const POSITION_COLOR = { BD: 'error', OP: 'warning', SB: 'info', AJ: 'secondary', RFU: 'success', CANCEL: 'secondary' }

const formatStamp = formatDisplayDateTime

const formatHours = value =>
  value == null ? '—' : Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 })

const Stat = ({ icon, label, value, emphasize }) => (
  <Paper variant='outlined' sx={{ p: 3, height: '100%', borderRadius: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, color: 'text.secondary' }}>
      <Icon icon={icon} fontSize={20} />
      <Typography variant='caption'>{label}</Typography>
    </Box>
    <Typography variant='h6' sx={{ fontWeight: 600, lineHeight: 1.3, color: emphasize ? 'error.main' : 'text.primary' }}>
      {value || '—'}
    </Typography>
  </Paper>
)

const Fact = ({ label, children }) => (
  <Box>
    <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>
      {children || '—'}
    </Typography>
  </Box>
)

/** Kode dan nama. Nama yang sudah diawali kode tidak diulang. First name yang sama dengan last name tampil sekali. */
const pair = (code, name) => {
  const left = (code || '').trim()
  const right = collapseRepeatedName(name) || ''
  if (!left) return right
  if (!right || left === right || right.startsWith(left)) return right || left

  return `${left} · ${right}`
}

const CardIcon = ({ icon, color = 'primary' }) => (
  <Box
    sx={{
      width: 40,
      height: 40,
      borderRadius: 1.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: `${color}.main`,
      color: `${color}.contrastText`
    }}
  >
    <Icon icon={icon} fontSize={22} />
  </Box>
)

const detailCardSx = { height: '100%', border: 1, borderColor: 'divider', borderRadius: 2 }

/** Timeline kiri tanpa kolom waktu di seberang. */
const ActivityTimeline = styled(Timeline)({
  padding: 0,
  margin: 0,
  '& .MuiTimelineItem-root:before': {
    display: 'none'
  }
})

const BreakdownViewPage = () => {
  const router = useRouter()
  const ability = useContext(AbilityContext)
  const id = typeof router.query.id === 'string' ? router.query.id : ''
  const [row, setRow] = useState(null)
  const [codes, setCodes] = useState([])
  const [activityOpen, setActivityOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [deleteBdOpen, setDeleteBdOpen] = useState(false)
  const [deleteBdBusy, setDeleteBdBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    if (!id) return
    try {
      const response = await arkaApi.get(`/breakdowns/${id}`)
      setRow(response.data)
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Breakdown was not found')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    arkaApi
      .get('/breakdowns/lookups')
      .then(response => setCodes(response.data?.activities ?? []))
      .catch(() => setCodes([]))
  }, [])

  const isCancelled = Boolean(row?.cancelledAt)
  const canUpdate = ability?.can('update', 'breakdown') && row && !row.finishedAt && !isCancelled
  const canCancel = ability?.can('cancel', 'breakdown') && row && !row.finishedAt && !isCancelled
  const canDeleteBd = ability?.can('delete', 'breakdown') && Boolean(row)
  const canRefresh = ability?.can('update', 'breakdown') && Boolean(row) && !isCancelled

  const refreshWo = async () => {
    if (!id || refreshing) return
    setRefreshing(true)
    try {
      const response = await arkaApi.post(`/breakdowns/${id}/refresh`)
      setRow(response.data)
      toast.success('Work order refreshed from SAP')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not refresh the work order')
    } finally {
      setRefreshing(false)
    }
  }

  const latestActivityRow = row?.activities?.length ? row.activities[row.activities.length - 1] : null

  const statusUnit = row
    ? row.cancelledAt
      ? 'CANCEL'
      : row.finishedAt
        ? 'RFU'
        : latestActivityRow?.positionStatus || 'BD'
    : null

  const downtimeHours = row
    ? Math.max(
        0,
        Math.round(
          (((row.finishedAt ? new Date(row.finishedAt).getTime() : now) - new Date(row.startedAt).getTime()) / 3600000) * 10
        ) / 10
      )
    : null

  const confirmDelete = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await arkaApi.delete(`/breakdowns/${id}/activities/${deleting.id}`)
      toast.success('Activity deleted')
      setDeleting(null)
      load()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not delete the activity')
    } finally {
      setDeletingBusy(false)
    }
  }

  const confirmCancel = async () => {
    if (!id || cancelBusy) return
    setCancelBusy(true)
    try {
      await arkaApi.post(`/breakdowns/${id}/cancel`)
      toast.success('Breakdown dibatalkan (status CANCEL)')
      setCancelOpen(false)
      load()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not cancel the breakdown')
    } finally {
      setCancelBusy(false)
    }
  }

  const confirmDeleteBd = async () => {
    if (!id || deleteBdBusy) return
    setDeleteBdBusy(true)
    try {
      await arkaApi.delete(`/breakdowns/${id}`)
      toast.success('Breakdown dihapus permanen')
      setDeleteBdOpen(false)
      router.push('/breakdowns')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not delete the breakdown')
    } finally {
      setDeleteBdBusy(false)
    }
  }

  return (
    <Grid container spacing={6}>
      {row ? (
        <>
          <Grid item xs={12}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'flex-start' },
                justifyContent: 'space-between',
                gap: { xs: 3, md: 4 }
              }}
            >
              <Box sx={{ minWidth: 0, flex: '1 1 auto', '& > .MuiGrid-item': { width: '100%', maxWidth: '100%', p: 0 } }}>
                <PageHeader
                  title={
                    <Typography
                      variant='h4'
                      sx={{
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        lineHeight: 1.3,
                        fontSize: { xs: '1.35rem', sm: '1.75rem', md: '2.125rem' }
                      }}
                    >
                      {row.registerNo || row.unitNo}
                    </Typography>
                  }
                  subtitle={
                    <Typography sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
                      {[row.unitNo, row.modelName, row.projectCode].filter(Boolean).join(' · ') || '—'}
                    </Typography>
                  }
                />
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 2,
                  alignItems: 'center',
                  justifyContent: { xs: 'flex-start', md: 'flex-end' },
                  flex: { xs: '1 1 auto', md: '0 1 auto' },
                  maxWidth: '100%',
                  '& .MuiButton-root': { flexShrink: 0 }
                }}
              >
                {canRefresh ? (
                  <Tooltip title={row.sapServiceCallId ? '' : 'WO ini belum terhubung ke SAP'}>
                    <span>
                      <Button
                        variant='tonal'
                        color='primary'
                        startIcon={<Icon icon='tabler:refresh' />}
                        disabled={!row.sapServiceCallId || refreshing}
                        onClick={refreshWo}
                      >
                        {refreshing ? 'Refreshing…' : 'Refresh WO'}
                      </Button>
                    </span>
                  </Tooltip>
                ) : null}
                {canUpdate ? (
                  <Tooltip title={row.workOrder ? '' : 'Isi nomor WO dulu'}>
                    <span>
                      <Button
                        variant='tonal'
                        color='success'
                        startIcon={<Icon icon='tabler:circle-check' />}
                        disabled={!row.workOrder}
                        onClick={() => setCloseOpen(true)}
                      >
                        Close
                      </Button>
                    </span>
                  </Tooltip>
                ) : null}
                {canUpdate ? (
                  <Button
                    variant='contained'
                    color='primary'
                    startIcon={<Icon icon='tabler:edit' />}
                    onClick={() => router.push(`/breakdowns/edit/${row.id}`)}
                  >
                    Edit
                  </Button>
                ) : null}
                {canCancel ? (
                  <Button
                    variant='tonal'
                    color='warning'
                    startIcon={<Icon icon='tabler:ban' />}
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel
                  </Button>
                ) : null}
                {canDeleteBd ? (
                  <Button
                    variant='tonal'
                    color='error'
                    startIcon={<Icon icon='tabler:trash' />}
                    onClick={() => setDeleteBdOpen(true)}
                  >
                    Delete
                  </Button>
                ) : null}
                <Button
                  variant='tonal'
                  color='secondary'
                  startIcon={<Icon icon='tabler:printer' />}
                  onClick={() =>
                    window.open(withBasePath(`/breakdowns/print/${row.id}`), '_blank', 'noopener')
                  }
                >
                  Print
                </Button>
                <Button
                  variant='tonal'
                  color='secondary'
                  startIcon={<Icon icon='tabler:arrow-left' />}
                  onClick={() => router.push('/breakdowns')}
                >
                  Back
                </Button>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <CustomChip size='small' skin='light' color={POSITION_COLOR[statusUnit] || 'secondary'} label={`Status unit ${statusUnit}`} />
              <CustomChip
                size='small'
                skin='light'
                color={
                  row.workOrderStatus === 'CLOSE' ? 'success' : row.workOrderStatus === 'CANCEL' ? 'secondary' : 'warning'
                }
                label={`Status WO ${row.workOrderStatus}`}
              />
              {isCancelled ? (
                <CustomChip size='small' skin='light' color='secondary' label='Cancelled — tidak dihitung di dashboard' />
              ) : null}
              {latestActivityRow ? (
                <CustomChip
                  size='small'
                  skin='light'
                  color='primary'
                  label={`${latestActivityRow.breakdownCode} · ${latestActivityRow.breakdownCodeName}`}
                />
              ) : null}
            </Box>
          </Grid>
          <Grid item xs={6} md={3}>
            <Stat icon='tabler:gauge' label='HM' value={formatHours(row.hourMeter)} />
          </Grid>
          <Grid item xs={6} md={3}>
            <Stat icon='tabler:clock' label='Down time (Hrs)' value={formatHours(downtimeHours)} emphasize={!row.finishedAt} />
          </Grid>
          <Grid item xs={6} md={3}>
            <Stat icon='tabler:calendar-event' label='BD date' value={formatStamp(row.startedAt)} />
          </Grid>
          <Grid item xs={6} md={3}>
            <Stat icon='tabler:flag' label='Finish date' value={formatStamp(row.finishedAt)} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={0} sx={detailCardSx}>
              <CardHeader
                avatar={<CardIcon icon='tabler:truck' />}
                title='Unit'
                titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              />
              <Divider />
              <CardContent>
                <Typography variant='h6' sx={{ fontWeight: 600, mb: 0.5 }}>
                  {row.unitNo || '—'}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
                  {[row.modelName, row.projectCode].filter(Boolean).join(' · ') || '—'}
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={6}>
                    <Fact label='Serial'>{row.serialNo}</Fact>
                  </Grid>
                  <Grid item xs={6}>
                    <Fact label='Location'>{row.location}</Fact>
                  </Grid>
                  <Grid item xs={6}>
                    <Fact label='Register No'>{row.registerNo}</Fact>
                  </Grid>
                  <Grid item xs={6}>
                    <Fact label='WO'>{row.workOrder || 'Belum dibuat'}</Fact>
                  </Grid>
                  <Grid item xs={6}>
                    <Fact label='Last operator'>{pair(row.operatorCode, row.operatorName)}</Fact>
                  </Grid>
                  <Grid item xs={6}>
                    <Fact label='Mechanic leader'>{pair(row.mechanicLeaderCode, row.mechanicLeaderName)}</Fact>
                  </Grid>
                  <Grid item xs={12}>
                    <Fact label='Assignee'>
                      {pair(row.assigneeUserId == null ? '' : String(row.assigneeUserId), row.assigneeName)}
                    </Fact>
                  </Grid>
                  <Grid item xs={6}>
                    <Fact label='Prepared by'>{row.preparedBy}</Fact>
                  </Grid>
                  <Grid item xs={6}>
                    <Fact label='Created by'>{row.createdByName}</Fact>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={8}>
            <Card elevation={0} sx={detailCardSx}>
              <CardHeader
                avatar={<CardIcon icon='tabler:file-description' color='info' />}
                title='Description'
                titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
              />
              <Divider />
              <CardContent>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                  Problem
                </Typography>
                <Paper variant='outlined' sx={{ p: 3, bgcolor: 'action.hover', borderColor: 'divider' }}>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{row.problem || '—'}</Typography>
                </Paper>
                <Grid container spacing={4} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Fact label='Remark'>{row.remark}</Fact>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Fact label='Resolution'>{row.resolution}</Fact>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 4 }} />
                <Typography variant='subtitle2' sx={{ mb: 3, fontWeight: 600 }}>
                  Failure
                </Typography>
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <Fact label='Job category'>{row.jobCategory}</Fact>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Fact label='Job code'>{pair(row.jobCode, row.jobCodeName)}</Fact>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Fact label='Component'>{pair(row.componentCode, row.componentName)}</Fact>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Fact label='Sub component'>{pair(row.subComponentCode, row.subComponentName)}</Fact>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Fact label='Damage'>{pair(row.damageCode, row.damageName)}</Fact>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Fact label='Failure cause'>{pair(row.failureCauseCode, row.failureCauseName)}</Fact>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card elevation={0} sx={detailCardSx}>
              <CardHeader
                avatar={<CardIcon icon='tabler:timeline' color='warning' />}
                title='Activities'
                subheader={`${row.activities.length} pekerjaan pada breakdown ini`}
                titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
                action={
                  canUpdate ? (
                    <Button variant='contained' startIcon={<Icon icon='tabler:plus' />} onClick={() => setActivityOpen(true)}>
                      Add activity
                    </Button>
                  ) : null
                }
              />
              <Divider />
              <CardContent>
                {row.activities.length === 0 ? (
                  <Typography sx={{ color: 'text.secondary' }}>Belum ada activity.</Typography>
                ) : (
                  <ActivityTimeline>
                    {row.activities.map((activity, index) => (
                      <TimelineItem key={activity.id}>
                        <TimelineSeparator>
                          <TimelineDot color={POSITION_COLOR[activity.positionStatus] || 'secondary'} />
                          {index < row.activities.length - 1 ? <TimelineConnector /> : null}
                        </TimelineSeparator>
                        <TimelineContent sx={{ pr: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
                                <Typography sx={{ fontWeight: 600 }}>
                                  {activity.breakdownCode} · {activity.breakdownCodeName}
                                </Typography>
                                <CustomChip
                                  size='small'
                                  skin='light'
                                  color={POSITION_COLOR[activity.positionStatus] || 'secondary'}
                                  label={activity.positionStatus}
                                />
                              </Box>
                              <Typography variant='body2' sx={{ color: 'text.secondary', mt: 1 }}>
                                {formatStamp(activity.startedAt)}
                                {activity.endedAt ? ` — ${formatStamp(activity.endedAt)}` : ' — masih berjalan'}
                              </Typography>
                            </Box>
                            {canUpdate ? (
                              <Box sx={{ display: 'flex', flexShrink: 0 }}>
                                <Tooltip title='Edit'>
                                  <IconButton size='small' onClick={() => setEditing(activity)}>
                                    <Icon icon='tabler:edit' />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title='Delete'>
                                  <IconButton size='small' color='error' onClick={() => setDeleting(activity)}>
                                    <Icon icon='tabler:trash' />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ) : null}
                          </Box>
                          {activity.details ? (
                            <Paper variant='outlined' sx={{ p: 2.5, mt: 2, bgcolor: 'action.hover', borderColor: 'divider' }}>
                              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{activity.details}</Typography>
                            </Paper>
                          ) : null}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mt: 2 }}>
                            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                              Mechanics{' '}
                              <Typography component='span' variant='body2' sx={{ color: 'text.primary', fontWeight: 500 }}>
                                {activity.technicianName || '—'}
                              </Typography>
                            </Typography>
                            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                              Handled by{' '}
                              <Typography component='span' variant='body2' sx={{ color: 'text.primary', fontWeight: 500 }}>
                                {activity.handledByName || '—'}
                              </Typography>
                            </Typography>
                          </Box>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </ActivityTimeline>
                )}
              </CardContent>
            </Card>
          </Grid>
        </>
      ) : (
        <Grid item xs={12}>
          <Button
            variant='tonal'
            color='secondary'
            startIcon={<Icon icon='tabler:arrow-left' />}
            onClick={() => router.push('/breakdowns')}
          >
            Back
          </Button>
        </Grid>
      )}
      <ActivityDialog
        open={activityOpen || Boolean(editing)}
        breakdownId={id}
        activities={codes}
        activity={editing}
        onClose={() => {
          setActivityOpen(false)
          setEditing(null)
        }}
        onSaved={() => {
          setActivityOpen(false)
          setEditing(null)
          load()
        }}
      />
      <DeleteConfirmDialog
        open={Boolean(deleting)}
        title='Delete activity'
        message='Hapus activity ini dari breakdown?'
        loading={deletingBusy}
        onClose={() => {
          if (!deletingBusy) setDeleting(null)
        }}
        onConfirm={confirmDelete}
      />
      <DeleteConfirmDialog
        open={cancelOpen}
        title='Cancel breakdown'
        message={
          row?.sapServiceCallId
            ? 'Batalkan breakdown ini? Status menjadi CANCEL (record tetap ada, tidak dihitung di dashboard). Activity SAP dinonaktifkan dan WO SAP dibatalkan.'
            : 'Batalkan breakdown ini? Status menjadi CANCEL (record tetap ada, tidak dihitung di dashboard).'
        }
        confirmLabel='Cancel breakdown'
        confirmColor='warning'
        loading={cancelBusy}
        onClose={() => {
          if (!cancelBusy) setCancelOpen(false)
        }}
        onConfirm={confirmCancel}
      />
      <DeleteConfirmDialog
        open={deleteBdOpen}
        title='Delete breakdown?'
        message={
          row
            ? `Hapus permanen ${row.registerNo || row.unitNo}? Record dan semua activity hilang dari ARKA PCR${
                row.sapServiceCallId && !row.finishedAt && !row.cancelledAt
                  ? '; WO/activity SAP yang masih open ikut dibatalkan'
                  : ''
              }. Tindakan ini tidak bisa dibatalkan.`
            : ''
        }
        confirmLabel='Delete permanently'
        confirmColor='error'
        loading={deleteBdBusy}
        onClose={() => {
          if (!deleteBdBusy) setDeleteBdOpen(false)
        }}
        onConfirm={confirmDeleteBd}
      />
      <CloseDialog
        open={closeOpen}
        breakdownId={id}
        onClose={() => setCloseOpen(false)}
        onSaved={() => {
          setCloseOpen(false)
          load()
        }}
      />
    </Grid>
  )
}

BreakdownViewPage.acl = {
  subject: 'breakdown',
  action: 'read'
}

export default BreakdownViewPage
