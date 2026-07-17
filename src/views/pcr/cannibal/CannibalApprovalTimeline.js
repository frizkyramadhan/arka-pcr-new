/**
 * Cannibal BA approval workflow timeline — PS → PM → PLM → OGM → OD.
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

import { useAuth } from 'src/hooks/useAuth'
import useCan from 'src/hooks/useCan'
import { buildLevelConfirmMessage } from 'src/utils/approval-confirm-message'
import { CANNIBAL_APPROVAL_LEVEL_LABELS } from 'src/utils/forecast-approval-auth'
import {
  CANNIBAL_APPROVAL_LEVEL_ORDER,
  findActionableCannibalApproval,
  getCannibalLevelFlowLabel,
  getCannibalLevelFlowStatus,
  getCurrentCannibalFlowStage
} from 'src/utils/cannibal-approval-workflow'

const flowStatusMeta = status => {
  if (status === 'APPROVED') return { color: 'success', icon: 'tabler:circle-check-filled' }
  if (status === 'REVISABLE') return { color: 'info', icon: 'tabler:edit-circle' }
  if (status === 'REJECTED') return { color: 'error', icon: 'tabler:circle-x-filled' }
  if (status === 'ACTIVE') return { color: 'warning', icon: 'tabler:player-play-filled' }

  return { color: 'secondary', icon: 'tabler:clock' }
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

const LevelRow = ({ level, approval, flowStatus, isLast }) => {
  const theme = useTheme()
  const displayStatus = getCannibalLevelFlowLabel(flowStatus)
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
          border: theme =>
            `2px solid ${alpha(theme.palette[meta.color].main, isActive ? 0.9 : 0.35)}`,
          zIndex: 1,
          ...(isActive ? { boxShadow: theme => `0 0 0 4px ${alpha(theme.palette.warning.main, 0.16)}` } : {})
        }}
      >
        <Icon icon={meta.icon} fontSize='1rem' />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.25 }}>
          <CustomChip rounded skin='light' size='small' label={displayStatus} color={meta.color} />
          <Typography variant='body2' sx={{ fontWeight: 700 }}>
            {CANNIBAL_APPROVAL_LEVEL_LABELS[level]}
          </Typography>
        </Box>
        {approval?.remark ? (
          <Typography
            variant='caption'
            sx={{
              display: 'block',
              mt: 0.5,
              p: 1.5,
              borderRadius: 1,
              bgcolor: theme =>
                alpha(
                  flowStatus === 'REJECTED' ? theme.palette.error.main : theme.palette.success.main,
                  0.08
                ),
              color: 'text.secondary'
            }}
          >
            <Typography component='span' variant='caption' sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
              Note
            </Typography>
            {approval.remark}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

const CannibalApprovalTimeline = ({
  ba,
  onApprove,
  onReject,
  onRevoke,
  actionLoading = false,
  showActions = true,
  scrollable = false,
  maxHeight
}) => {
  const theme = useTheme()
  const { can } = useCan()
  const auth = useAuth()
  const [pendingConfirm, setPendingConfirm] = useState(null)
  const [note, setNote] = useState('')

  const inFlow = ['SUBMITTED', 'OPEN'].includes(ba?.statusBa)
  const flowStageLabel = getCurrentCannibalFlowStage(ba)
  const actionable = findActionableCannibalApproval(ba, null, can, auth.user)

  useEffect(() => {
    setNote('')
    setPendingConfirm(null)
  }, [actionable?.idBaApproval])

  const cardSx = {
    height: scrollable && maxHeight ? maxHeight : '100%',
    display: 'flex',
    flexDirection: 'column',
    mb: scrollable ? 0 : 4
  }

  return (
    <Card sx={cardSx}>
      <CardContent
        sx={{
          p: { xs: 4, sm: 5 },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
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
              BA Cannibal Approval
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {flowStageLabel}
            </Typography>
          </Box>
        </Box>

        {inFlow ? (
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

        <Box sx={scrollable ? { flex: 1, minHeight: 0, overflowY: 'auto', mt: 3, pr: 0.5 } : { mt: 3 }}>
          {CANNIBAL_APPROVAL_LEVEL_ORDER.map((level, index) => (
            <LevelRow
              key={level}
              level={level}
              approval={ba?.approvals?.find(item => item.level === level)}
              flowStatus={getCannibalLevelFlowStatus(ba, level)}
              isLast={index === CANNIBAL_APPROVAL_LEVEL_ORDER.length - 1}
            />
          ))}
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
        ) : showActions && inFlow ? (
          <Box
            sx={{
              mt: 3,
              pt: 3,
              borderTop: theme => `1px solid ${theme.palette.divider}`
            }}
          >
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              Belum giliran approval Anda — menunggu tahap sebelumnya selesai.
            </Typography>
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

export default CannibalApprovalTimeline
