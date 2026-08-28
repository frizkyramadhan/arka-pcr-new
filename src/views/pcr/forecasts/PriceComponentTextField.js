/**
 * Price input — live IDR thousand separators (id-ID) while typing or pasting.
 */
import CustomTextField from 'src/@core/components/mui/text-field'

import { formatPriceComponentInputValue } from 'src/utils/forecast-plan-period'

const PriceComponentTextField = ({ value, onChange, ...props }) => {
  const handleChange = event => {
    const formatted = formatPriceComponentInputValue(event.target.value)
    onChange?.({
      ...event,
      target: { ...event.target, value: formatted }
    })
  }

  return (
    <CustomTextField
      {...props}
      value={value ?? ''}
      onChange={handleChange}
      inputMode='numeric'
    />
  )
}

export default PriceComponentTextField
