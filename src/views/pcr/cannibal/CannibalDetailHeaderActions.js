/**
 * Cannibal detail — action buttons for page header (top right).
 * Vuexy: tonal untuk navigasi/edit section; contained untuk aksi workflow utama.
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

import Link from 'next/link'

import Icon from 'src/@core/components/icon'

const actionButtonSx = {
  width: { xs: '100%', md: 'auto' },
  minWidth: { xs: 0, md: 'auto' },
  whiteSpace: 'nowrap',
  flexShrink: 0
}

const CannibalDetailHeaderActions = ({
  baId,
  ba,
  canEditPlant,
  canSubmitPlant,
  canEditLogistic,
  canSubmitApproval,
  canEditExecution,
  canClose,
  canConfirmRequestor = false,
  canRejectRequestor = false,
  plantEditable,
  logisticEditable,
  executionEditable,
  planningEditable,
  showPlantStatementAction = false,
  showLogisticStatementAction = false,
  showLegacyApprovalSeedAction = false,
  onEditPlant,
  onEditLogistic,
  onEditExecution,
  onEditPlanning,
  onRunAction,
  onSubmitToRequestor,
  onConfirmRequestor,
  onRejectRequestor,
  onSeedLegacyApproval,
  includeBackOnMobile = false
}) => {
  if (!ba) return null

  const showPlantEdit = canEditPlant && (plantEditable || showPlantStatementAction)
  const showLogisticEdit = canEditLogistic && (logisticEditable || showLogisticStatementAction)
  const hasMrPr = Boolean(ba.mrNo?.trim() && ba.prNo?.trim())
  const showPlanningButton = canEditPlant && planningEditable && ba.statusBa !== 'PENDING_DOCUMENT'
  const showDocumentationButton = canEditExecution && executionEditable
  const showSubmitApproval = canSubmitApproval && ba.statusBa === 'PENDING_DOCUMENT'

  const buttons = [
    includeBackOnMobile ? (
      <Button
        key='back'
        variant='tonal'
        color='secondary'
        sx={{ ...actionButtonSx, display: { xs: 'inline-flex', md: 'none' } }}
        startIcon={<Icon icon='tabler:arrow-left' />}
        component={Link}
        href='/cannibals'
      >
        Back
      </Button>
    ) : null,
    <Button
      key='print'
      variant='tonal'
      color='secondary'
      sx={actionButtonSx}
      startIcon={<Icon icon='tabler:printer' />}
      component={Link}
      href={`/cannibals/${baId}/print`}
      target='_blank'
    >
      Print
    </Button>,
    showPlantEdit ? (
      <Button
        key='edit'
        variant='tonal'
        color='primary'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:edit' />}
        onClick={onEditPlant}
      >
        Edit
      </Button>
    ) : null,
    showPlanningButton ? (
      <Button
        key='planning'
        variant='tonal'
        color='warning'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:clipboard-list' />}
        onClick={onEditPlanning}
      >
        Planning
      </Button>
    ) : null,
    canSubmitPlant && plantEditable ? (
      <Button
        key='requestor'
        variant='contained'
        color='info'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:send' />}
        onClick={onSubmitToRequestor}
      >
        Send to Requestor
      </Button>
    ) : null,
    canConfirmRequestor ? (
      <Button
        key='confirm-requestor'
        variant='contained'
        color='success'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:check' />}
        onClick={onConfirmRequestor}
      >
        Confirm Request
      </Button>
    ) : null,
    canRejectRequestor ? (
      <Button
        key='reject-requestor'
        variant='contained'
        color='error'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:x' />}
        onClick={onRejectRequestor}
      >
        Reject Request
      </Button>
    ) : null,
    showLogisticEdit ? (
      <Button
        key='edit-logistic'
        variant='tonal'
        color='info'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:truck' />}
        onClick={onEditLogistic}
      >
        Edit Logistic
      </Button>
    ) : null,
    showDocumentationButton ? (
      <Button
        key='execution'
        variant='contained'
        color='info'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:file-description' />}
        onClick={onEditExecution}
      >
        Update Documentation
      </Button>
    ) : null,
    showSubmitApproval ? (
      <Button
        key='submit-approval'
        variant='contained'
        color='primary'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:send' />}
        disabled={!hasMrPr}
        title={hasMrPr ? undefined : 'MR# and PR# are required before submit for approval'}
        onClick={() => onRunAction('submit', 'Submitted for approval')}
      >
        Submit for Approval
      </Button>
    ) : null,
    canClose && ba.statusBa === 'APPROVED' ? (
      <Button
        key='close'
        variant='contained'
        color='success'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:lock' />}
        onClick={() => onRunAction('close', 'BA closed')}
      >
        Close BA
      </Button>
    ) : null,
    canEditPlant && ['SUBMITTED', 'REJECTED', 'PENDING_REQUESTOR', 'PENDING_LOGISTICS', 'PENDING_DOCUMENT'].includes(ba.statusBa) ? (
      <Button
        key='cancel'
        variant='tonal'
        color='error'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:ban' />}
        onClick={() => onRunAction('cancel', 'BA cancelled')}
      >
        Cancel
      </Button>
    ) : null,
    showLegacyApprovalSeedAction ? (
      <Button
        key='seed-approval'
        variant='tonal'
        color='primary'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:git-branch' />}
        onClick={onSeedLegacyApproval}
      >
        Init Approval Chain
      </Button>
    ) : null
  ].filter(Boolean)

  if (!buttons.length) return null

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        flexWrap: { md: 'wrap' },
        gap: { xs: 1.5, md: 2 },
        flexShrink: 0,
        alignItems: { xs: 'stretch', md: 'center' },
        justifyContent: 'flex-end',
        width: { xs: 'fit-content', md: 'auto' }
      }}
    >
      {buttons}
    </Box>
  )
}

export default CannibalDetailHeaderActions
