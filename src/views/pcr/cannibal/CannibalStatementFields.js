/**
 * Radio statement + optional Lead Time days + Other field.
 */
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Typography from '@mui/material/Typography'

import CustomTextField from 'src/@core/components/mui/text-field'

const LEAD_TIME_OPTION_VALUE = 'lead_time'

const inlineLeadTimeInputSx = {
  width: 72,
  mx: 0.5,
  verticalAlign: 'middle',
  '& .MuiInputBase-root': {
    fontSize: 'inherit',
    lineHeight: 'inherit',
    minHeight: 'unset'
  },
  '& .MuiInputBase-input': {
    py: 0.25,
    px: 0.75,
    fontSize: 'inherit',
    lineHeight: 'inherit',
    textAlign: 'center'
  },
  '& .MuiInput-underline:before': {
    borderBottomStyle: 'dotted'
  }
}

const CannibalStatementFields = ({
  title,
  options,
  value,
  onChange,
  otherLabel,
  otherValue,
  onOtherChange,
  leadTimeDays = '',
  onLeadTimeDaysChange,
  statementError = '',
  otherError = ''
}) => (
  <Box>
    {title ? (
      <Typography variant='subtitle2' sx={{ mb: 2, fontWeight: 600, letterSpacing: 0.5 }}>
        {title}
      </Typography>
    ) : null}
    <RadioGroup value={value} onChange={e => onChange(e.target.value)}>
      {options.map(option => {
        const isLeadTime = option.value === LEAD_TIME_OPTION_VALUE && onLeadTimeDaysChange

        return (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio size='small' />}
            sx={{ alignItems: 'center', mb: isLeadTime ? 0.25 : 0 }}
            label={
              isLeadTime ? (
                <Box
                  component='span'
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    fontSize: 'inherit',
                    lineHeight: 'inherit'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  Lead Time Part (Est
                  <CustomTextField
                    variant='standard'
                    type='number'
                    value={value === LEAD_TIME_OPTION_VALUE ? leadTimeDays : ''}
                    onChange={e => onLeadTimeDaysChange(e.target.value)}
                    disabled={value !== LEAD_TIME_OPTION_VALUE}
                    placeholder='days'
                    inputProps={{ min: 1, step: 1 }}
                    sx={inlineLeadTimeInputSx}
                    onClick={e => e.stopPropagation()}
                    onFocus={e => e.stopPropagation()}
                  />
                  days)
                </Box>
              ) : (
                option.label
              )
            }
          />
        )
      })}
    </RadioGroup>
    {statementError ? (
      <Typography variant='caption' color='error' sx={{ display: 'block', mt: 0.5 }}>
        {statementError}
      </Typography>
    ) : null}
    <CustomTextField
      fullWidth
      size='small'
      sx={{ mt: 2 }}
      label={otherLabel}
      value={value === 'other' ? otherValue : ''}
      onChange={e => onOtherChange(e.target.value)}
      InputProps={{ readOnly: value !== 'other' }}
      placeholder={value === 'other' ? 'Specify other reason' : 'Select Other to enable'}
      error={Boolean(otherError)}
      helperText={otherError || undefined}
    />
  </Box>
)

export default CannibalStatementFields
