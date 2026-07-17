// ** MUI Imports
import CustomChip from 'src/@core/components/mui/chip'

const LifePercentChip = ({ value }) => {
  const percent = Number(value ?? 0)
  let color = 'success'
  if (percent >= 100) color = 'error'
  else if (percent >= 85) color = 'warning'

  return (
    <CustomChip rounded skin='light' size='small' label={`${percent.toFixed(1)}%`} color={color} />
  )
}

export default LifePercentChip
