// ** MUI Imports
import CustomChip from 'src/@core/components/mui/chip'

import { getUnitStatusChipColor } from '@/lib/fleet-api/unit-status'

const EquipmentStatusChip = ({ status }) => {
  return (
    <CustomChip
      rounded
      skin='light'
      size='small'
      label={status || '—'}
      color={getUnitStatusChipColor(status)}
    />
  )
}

export default EquipmentStatusChip
