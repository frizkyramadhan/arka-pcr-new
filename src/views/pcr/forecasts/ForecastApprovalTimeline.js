/**
 * Alur approval BA PCR — stepper visual per tahap (PS → PM+PLM → Direksi).
 */
import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import Icon from 'src/@core/components/icon'
import DeleteConfirmDialog from 'src/@core/components/delete-confirm-dialog'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'
import MenuItem from '@mui/material/MenuItem'

import useCan from 'src/hooks/useCan'
import { buildLevelConfirmMessage } from 'src/utils/approval-confirm-message'
import { formatDisplayDate } from 'src/utils/date-format'
import { getApproveLevelsFromCan } from 'src/utils/forecast-approval-auth'
import {
  findActionableForecastApproval,
  getForecastFlowStageLabel,
  getForecastLevelFlowLabel,
  getForecastLevelFlowStatus
} from 'src/utils/forecast-approval-workflow'

const APPROVAL_STAGES = [
  {
    step: 1,
    title: 'Technical Review',
    subtitle: 'Plant Superintendent / Dept Head',
    levels: [{ code: 'PS', label: 'Plant Superintendent / Dept Head' }]
  },
  {
    step: 2,
    title: 'Management Approval',
    subtitle: 'Project Manager, then Plant Manager',
    levels: [
      { code: 'PM', label: 'Project Manager' },
      { code: 'PLM', label: 'Plant Manager' }
    ]
  },
  {
    step: 3,
    title: 'Director Review',
    subtitle: 'Operation Director → Commercial & Treasury Director → President Director',
    levels: [
      { code: 'OD', label: 'Operation Director' },
      { code: 'FD', label: 'Commercial & Treasury Director' },
      { code: 'PD', label: 'President Director' }
    ]
  }
]

const flowStatusMeta = status => {
  if (status === 'APPROVED') return { color: 'success', icon: 'tabler:circle-check-filled' }
  if (status === 'REVISABLE') return { color: 'info', icon: 'tabler:edit-circle' }
  if (status === 'REJECTED') return { color: 'error', icon: 'tabler:circle-x-filled' }
  if (status === 'ACTIVE') return { color: 'warning', icon: 'tabler:player-play-filled' }

  return { color: 'secondary', icon: 'tabler:clock' }
}

const formatUser = user => {
  if (!user) return null

  return user.fullName || user.username
}

const LevelRow = ({ level, approval, flowStatus, isLast }) => {
  const theme = useTheme()
  const displayStatus = getForecastLevelFlowLabel(flowStatus)
  const meta = flowStatusMeta(flowStatus)
  const isActive = flowStatus === 'ACTIVE'

  return (
    <Box sx={{ display: 'flex', gap: 2, position: 'relative', pb: isLast ? 0 : 2.5 }}>
      {!isLast ? (
        <Box
          sx={{
            position: 'absolute',
            left: 15,
            top: 32,
            bottom: 0,
            width: 2,
            bgcolor: theme => theme.palette.divider
          }}
        />
      ) : null}
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme => alpha(theme.palette[meta.color].main, isActive ? 0.2 : 0.12),
          color: `${meta.color}.main`,
          border: theme => `2px solid ${alpha(theme.palette[meta.color].main, isActive ? 0.9 : 0.35)}`,
          zIndex: 1,
          ...(isActive
            ? {
                boxShadow: theme => `0 0 0 4px ${alpha(theme.palette.warning.main, 0.16)}`
              }
            : {})
        }}
      >
        <Icon icon={meta.icon} fontSize='1rem' />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
          <CustomChip rounded skin='light' size='small' label={displayStatus} color={meta.color} />
          <Typography variant='body2' sx={{ fontWeight: 700 }}>
            {level.label}
          </Typography>
        </Box>
        {approval?.approver ? (
          <Typography variant='caption' sx={{ display: 'block', mt: 0.5 }}>
            {formatUser(approval.approver)}
            {approval.approvedAt ? ` · ${formatDisplayDate(approval.approvedAt)}` : ''}
          </Typography>
        ) : null}
        {approval?.note ? (
          <Typography
            variant='caption'
            sx={{
              display: 'block',
              mt: 0.5,
              p: 1.5,
              borderRadius: 1,
              bgcolor: theme =>
                alpha(approval.status === 'REJECTED' ? theme.palette.error.main : theme.palette.success.main, 0.08),
              color: 'text.secondary'
            }}
          >
            <Typography component='span' variant='caption' sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
              Note
            </Typography>
            {approval.note}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

function buildWorkflowForecast(forecast, selectedBa) {
  if (!selectedBa) return forecast

  return {
    ...forecast,
    idBaPcr: selectedBa.idBaPcr,
    baPcrStatus: selectedBa.baPcrStatus,
    statusBaPcr: selectedBa.statusBaPcr,
    noBaPcr: selectedBa.noBaPcr,
    approvals: selectedBa.approvals ?? [],
    baSubmittedAt: selectedBa.baSubmittedAt ?? selectedBa.baPcrDate
  }
}

function formatBaSelectLabel(ba) {
  const parts = [ba.noBaPcr ?? `BA #${ba.idBaPcr}`, ba.baPcrStatus]
  if (ba.isActive) parts.push('active')

  return parts.join(' · ')
}

const approvalActionButtonSx = {
  py: 1.25,
  px: 1.5,
  fontWeight: 600,
  textTransform: 'none',
  whiteSpace: 'nowrap',
  fontSize: '0.8125rem',
  borderRadius: 2,
  minHeight: 42
}

/** Tombol aksi approval — layout grid agar tidak pecah di sidebar sempit. */
const ApprovalActionButtons = ({ actionMode, actionLoading, onApprove, onRevoke, onReject }) => {
  if (actionMode === 'revise') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button
          variant='contained'
          color='success'
          fullWidth
          startIcon={<Icon icon='tabler:check' />}
          disabled={actionLoading}
          onClick={onApprove}
          sx={approvalActionButtonSx}
        >
          Update
        </Button>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.5
          }}
        >
          <Button
            variant='outlined'
            color='warning'
            fullWidth
            startIcon={<Icon icon='tabler:arrow-back-up' fontSize='1.125rem' />}
            disabled={actionLoading}
            onClick={onRevoke}
            sx={approvalActionButtonSx}
          >
            Revoke
          </Button>
          <Button
            variant='outlined'
            color='error'
            fullWidth
            startIcon={<Icon icon='tabler:x' fontSize='1.125rem' />}
            disabled={actionLoading}
            onClick={onReject}
            sx={approvalActionButtonSx}
          >
            Reject
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1.5
      }}
    >
      <Button
        variant='contained'
        color='success'
        fullWidth
        startIcon={<Icon icon='tabler:check' />}
        disabled={actionLoading}
        onClick={onApprove}
        sx={approvalActionButtonSx}
      >
        Approve
      </Button>
      <Button
        variant='outlined'
        color='error'
        fullWidth
        startIcon={<Icon icon='tabler:x' />}
        disabled={actionLoading}
        onClick={onReject}
        sx={approvalActionButtonSx}
      >
        Reject
      </Button>
    </Box>
  )
}

const ForecastApprovalTimeline = ({
  forecast,
  approveLevels: approveLevelsProp,
  onApprove,
  onReject,
  onRevoke,
  actionLoading = false,
  showActions = true,
  showBaPcrSelector = true,
  scrollable = false,
  maxHeight
}) => {
  const theme = useTheme()
  const { can } = useCan()
  const approveLevels = approveLevelsProp ?? getApproveLevelsFromCan(can)
  const [note, setNote] = useState('')
  const [pendingConfirm, setPendingConfirm] = useState(null)

  const baPcrList = forecast?.baPcrList ?? []
  const activeBaId = forecast?.idBaPcr ?? baPcrList.find(row => row.isActive)?.idBaPcr ?? null
  const [selectedBaId, setSelectedBaId] = useState(activeBaId)

  useEffect(() => {
    if (!showBaPcrSelector) return
    setSelectedBaId(activeBaId)
  }, [activeBaId, forecast?.idForecast, showBaPcrSelector])

  const selectedBa =
    baPcrList.find(row => row.idBaPcr === selectedBaId) ?? baPcrList.find(row => row.isActive) ?? baPcrList[0] ?? null
  const workflowForecast = showBaPcrSelector ? buildWorkflowForecast(forecast, selectedBa) : forecast
  const isViewingActiveBa = showBaPcrSelector ? Boolean(selectedBa?.isActive) : true

  const approvals = workflowForecast?.approvals ?? []
  const baSubmitted = ['SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED'].includes(workflowForecast?.baPcrStatus)
  const flowStageLabel = getForecastFlowStageLabel(workflowForecast)
  const actionable =
    showActions && isViewingActiveBa ? findActionableForecastApproval(workflowForecast, approveLevels, can) : null

  useEffect(() => {
    setNote(actionable?.actionMode === 'revise' ? actionable?.note ?? '' : '')
    setPendingConfirm(null)
  }, [actionable?.idForecastApproval, actionable?.actionMode, actionable?.note])

  const approvalByLevel = Object.fromEntries(approvals.map(row => [row.level, row]))

  const cardSx = {
    height: scrollable && maxHeight ? maxHeight : '100%',
    display: 'flex',
    flexDirection: 'column',
    position: { md: scrollable ? 'relative' : 'sticky' },
    top: { md: scrollable ? undefined : 24 }
  }

  const contentSx = scrollable
    ? {
        p: { xs: 4, sm: 5 },
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        '&:last-child': { pb: { xs: 4, sm: 5 } }
      }
    : { p: { xs: 4, sm: 5 } }

  return (
    <Card sx={cardSx}>
      <CardContent sx={contentSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexShrink: 0 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.info.main, 0.12),
              color: 'info.main'
            }}
          >
            <Icon icon='tabler:route' fontSize='1.35rem' />
          </Box>
          <Box>
            <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
              BA PCR Approval
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {baSubmitted ? flowStageLabel : 'Menunggu submission'}
            </Typography>
          </Box>
        </Box>

        {showBaPcrSelector && baPcrList.length > 1 ? (
          <CustomTextField
            select
            fullWidth
            size='small'
            label='Select BA PCR'
            value={selectedBa?.idBaPcr ?? ''}
            onChange={event => setSelectedBaId(Number(event.target.value))}
            sx={{ mt: 2, flexShrink: 0 }}
          >
            {baPcrList.map(ba => (
              <MenuItem key={ba.idBaPcr} value={ba.idBaPcr}>
                {formatBaSelectLabel(ba)}
              </MenuItem>
            ))}
          </CustomTextField>
        ) : null}

        {baSubmitted ? (
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: theme => alpha(theme.palette.info.main, 0.06),
              border: theme => `1px solid ${alpha(theme.palette.info.main, 0.2)}`
            }}
          >
            <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              Tahap saat ini
            </Typography>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {flowStageLabel}
            </Typography>
          </Box>
        ) : null}

        {showBaPcrSelector && baPcrList.length > 1 && !isViewingActiveBa ? (
          <Typography variant='caption' sx={{ mt: 2, color: 'text.secondary', display: 'block', flexShrink: 0 }}>
            Viewing a previous BA PCR approval record (read-only).
          </Typography>
        ) : null}

        <Box sx={scrollable ? { flex: 1, minHeight: 0, overflowY: 'auto', mt: 3, pr: 0.5 } : { mt: 3 }}>
          {!baSubmitted ? (
            <Box
              sx={{
                p: 3,
                borderRadius: 2,
                border: theme => `1px dashed ${theme.palette.divider}`,
                bgcolor: theme => alpha(theme.palette.warning.main, 0.04),
                textAlign: 'center'
              }}
            >
              <Icon icon='tabler:send' fontSize='2rem' style={{ opacity: 0.5 }} />
              <Typography variant='body2' sx={{ fontWeight: 600, mt: 2 }}>
                BA PCR belum disubmit
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                Planner Foreman harus submit BA PCR untuk memulai alur approval.
              </Typography>
            </Box>
          ) : null}

          <Box sx={{ mt: baSubmitted ? 0 : 3 }}>
            {APPROVAL_STAGES.map((stage, stageIndex) => (
              <Box key={stage.step} sx={{ mb: stageIndex < APPROVAL_STAGES.length - 1 ? 3 : 0 }}>
                <Typography variant='overline' sx={{ color: 'text.secondary', letterSpacing: 0.8 }}>
                  Stage {stage.step}
                </Typography>
                <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 0.25 }}>
                  {stage.title}
                </Typography>
                <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                  {stage.subtitle}
                </Typography>
                {stage.levels.map((level, levelIndex) => (
                  <LevelRow
                    key={level.code}
                    level={level}
                    approval={baSubmitted ? approvalByLevel[level.code] : null}
                    flowStatus={baSubmitted ? getForecastLevelFlowStatus(approvals, level.code) : 'WAITING'}
                    isLast={stageIndex === APPROVAL_STAGES.length - 1 && levelIndex === stage.levels.length - 1}
                  />
                ))}
              </Box>
            ))}
          </Box>
        </Box>

        {showActions && actionable ? (
          <Box
            sx={{
              mt: 3,
              pt: 3,
              borderTop: theme => `1px solid ${theme.palette.divider}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              flexShrink: 0
            }}
          >
            <CustomTextField
              fullWidth
              multiline
              minRows={2}
              label='Note (optional)'
              value={note}
              onChange={event => setNote(event.target.value)}
              disabled={actionLoading}
            />
            <ApprovalActionButtons
              actionMode={actionable.actionMode}
              actionLoading={actionLoading}
              onApprove={() => setPendingConfirm('approve')}
              onRevoke={() => setPendingConfirm('revoke')}
              onReject={() => setPendingConfirm('reject')}
            />
          </Box>
        ) : null}
      </CardContent>

      <DeleteConfirmDialog
        open={pendingConfirm === 'approve'}
        title={actionable?.actionMode === 'revise' ? 'Konfirmasi Update Approval' : 'Konfirmasi Approve'}
        message={buildLevelConfirmMessage({
          action: 'approve',
          note,
          actionMode: actionable?.actionMode
        })}
        confirmLabel={actionable?.actionMode === 'revise' ? 'Update' : 'Approve'}
        confirmColor='success'
        loading={actionLoading}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => {
          onApprove?.(actionable, note.trim() || null)
          setPendingConfirm(null)
        }}
      />

      <DeleteConfirmDialog
        open={pendingConfirm === 'reject'}
        title='Konfirmasi Reject'
        message={buildLevelConfirmMessage({
          action: 'reject',
          note,
          actionMode: actionable?.actionMode
        })}
        confirmLabel='Reject'
        confirmColor='error'
        loading={actionLoading}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => {
          onReject?.(actionable, note.trim() || null)
          setPendingConfirm(null)
        }}
      />

      <DeleteConfirmDialog
        open={pendingConfirm === 'revoke'}
        title='Konfirmasi Revoke'
        message={buildLevelConfirmMessage({
          action: 'revoke',
          note,
          actionMode: actionable?.actionMode
        })}
        confirmLabel='Revoke'
        confirmColor='warning'
        loading={actionLoading}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => {
          onRevoke?.(actionable)
          setPendingConfirm(null)
        }}
      />
    </Card>
  )
}

export default ForecastApprovalTimeline
