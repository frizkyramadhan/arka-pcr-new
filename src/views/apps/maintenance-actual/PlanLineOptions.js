/**
 * Radio list of plan dates. A date that already has an actual stays visible but cannot be chosen again.
 */
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Typography from '@mui/material/Typography'

export function planLineLabel(line) {
  const unit = line.unitNo || line.fleetUnitId
  const type = line.maintenanceTypeName || '—'
  const taken = line.hasActual ? ' (already recorded)' : ''

  return `${unit} | ${line.planDate} | ${type} | ${line.projectId}${taken}`
}

const PlanLineOptions = ({ lines, value, onChange, error, searched, emptyHint }) => {
  return (
    <>
      <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
        Select a plan date
      </Typography>
      {lines.length === 0 ? (
        searched ? (
          <Alert severity='warning'>No plan dates match. Choose another project, month, or type.</Alert>
        ) : (
          <Typography variant='body2' color='text.secondary'>
            {emptyHint || 'Fill Project / Year / Month / Type and click Search to see plan dates.'}
          </Typography>
        )
      ) : (
        <RadioGroup value={value || ''} onChange={e => onChange(e.target.value)}>
          {lines.map(line => (
            <FormControlLabel
              key={line.id}
              value={line.id}
              disabled={Boolean(line.hasActual) && line.id !== value}
              control={<Radio size='small' />}
              label={<Typography variant='body2'>{planLineLabel(line)}</Typography>}
            />
          ))}
        </RadioGroup>
      )}
      {error ? (
        <Typography variant='caption' color='error' sx={{ display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      ) : null}
    </>
  )
}

export default PlanLineOptions
