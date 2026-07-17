// ** MUI Imports
import CustomChip from 'src/@core/components/mui/chip'

const STATUS_COLORS = {
  DRAFT: 'secondary',
  PENDING_LOGISTICS: 'warning',
  SUBMITTED: 'info',
  OPEN: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  CLOSED: 'success',
  CANCELLED: 'warning'
}

const STATUS_LABELS = {
  PENDING_LOGISTICS: 'Pending Logistics'
}

const BaStatusChip = ({ status }) => {
  if (!status) {
    return <CustomChip rounded skin='light' size='small' label='—' color='secondary' />
  }

  const normalized = String(status).trim().toUpperCase()

  return (
    <CustomChip
      rounded
      skin='light'
      size='small'
      label={STATUS_LABELS[normalized] ?? normalized}
      color={STATUS_COLORS[normalized] ?? 'secondary'}
    />
  )
}

export default BaStatusChip
