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
  onSeedLegacyApproval,
  includeBackOnMobile = false
}) => {
  if (!ba) return null

  const showPlantEdit = canEditPlant && (plantEditable || showPlantStatementAction)
  const showLogisticEdit = canEditLogistic && (logisticEditable || showLogisticStatementAction)

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
    canEditPlant && planningEditable ? (
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
        key='logistics'
        variant='contained'
        color='info'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:send' />}
        onClick={() => onRunAction('submit-to-logistics', 'Sent to logistics')}
      >
        Send to Logistics
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
    canEditExecution && executionEditable ? (
      <Button
        key='execution'
        variant='contained'
        color='info'
        sx={actionButtonSx}
        startIcon={<Icon icon='tabler:tool' />}
        onClick={onEditExecution}
      >
        Update Record
      </Button>
    ) : null,
    canClose && executionEditable ? (
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
    canEditPlant && ['SUBMITTED', 'REJECTED', 'PENDING_LOGISTICS'].includes(ba.statusBa) ? (
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
