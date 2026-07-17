// ** MUI Imports
import CustomChip from 'src/@core/components/mui/chip'

import { formatEvalCodeLabel, SOS_EVAL_CHIP_COLORS } from 'src/views/pcr/sos/sosEvalOptions'

const SosRatingChip = ({ rating }) => {
  if (!rating) {
    return <CustomChip rounded skin='light' size='small' label='—' color='secondary' />
  }

  const label = formatEvalCodeLabel(rating) ?? String(rating)
  const color = SOS_EVAL_CHIP_COLORS[label] ?? 'secondary'

  return <CustomChip rounded skin='light' size='small' label={label} color={color} />
}

export default SosRatingChip
