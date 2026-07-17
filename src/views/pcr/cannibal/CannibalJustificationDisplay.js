/**
 * Read-only Plant / Logistic / Planning — three-column statement layout.
 */
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import {
  isPlanningActionSelected,
  logisticStatementFromFlags,
  LOGISTIC_STATEMENT_OPTIONS,
  PLANNING_ACTION_OPTIONS,
  plantStatementFromFlags,
  PLANT_STATEMENT_OPTIONS
} from 'src/utils/cannibal-form-lookups'

import CannibalSectionCard from 'src/views/pcr/cannibal/CannibalSectionCard'

const formatUser = user => user?.fullName || user?.username || '—'

const formatDate = value => (value ? String(value).slice(0, 10) : '—')

const readoutBoxSx = {
  p: 2.5,
  borderRadius: 2,
  bgcolor: 'action.hover',
  border: theme => `1px solid ${theme.palette.divider}`
}

const StatementReadout = ({ options, selected, otherText, otherLabel, leadTimeDays, signature, emptyMessage }) => (
  <Box>
    {options.map(option => {
      const isSelected = selected === option.value
      const label =
        option.value === 'lead_time' && isSelected && leadTimeDays
          ? `Lead Time Part (Est ${leadTimeDays} days)`
          : option.label

      return (
        <Box
          key={option.value}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 0.75,
            color: isSelected ? 'text.primary' : 'text.disabled'
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              bgcolor: isSelected ? 'primary.main' : 'action.disabled',
              boxShadow: isSelected ? theme => `0 0 0 3px ${theme.palette.primary.main}22` : 'none'
            }}
          />
          <Typography variant='body2' sx={{ fontWeight: isSelected ? 600 : 400, lineHeight: 1.45 }}>
            {label}
          </Typography>
          {isSelected ? <Chip size='small' label='Selected' color='primary' variant='outlined' sx={{ ml: 'auto' }} /> : null}
        </Box>
      )
    })}
    <Box sx={{ mt: 2.5, ...readoutBoxSx }}>
      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 600 }}>
        {otherLabel}
      </Typography>
      <Typography variant='body2'>{selected === 'other' ? otherText || '—' : '—'}</Typography>
    </Box>
    {signature ? (
      <Box sx={{ mt: 2, ...readoutBoxSx }}>
        <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 600 }}>
          {signature.label}
        </Typography>
        <Typography variant='body1' sx={{ fontWeight: 600, lineHeight: 1.35 }}>
          {formatUser(signature.user)}
        </Typography>
        <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
          {formatDate(signature.date)}
        </Typography>
      </Box>
    ) : emptyMessage ? (
      <Box sx={{ mt: 2, ...readoutBoxSx }}>
        <Typography variant='body2' sx={{ color: 'text.secondary' }}>
          {emptyMessage}
        </Typography>
      </Box>
    ) : null}
  </Box>
)

const PlanningReadout = ({ ba }) => (
  <Box>
    {PLANNING_ACTION_OPTIONS.map(option => {
      const isSelected = isPlanningActionSelected(ba, option.label)

      return (
        <Box
          key={option.label}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 0.75,
            color: isSelected ? 'text.primary' : 'text.disabled'
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              bgcolor: isSelected ? 'warning.main' : 'action.disabled',
              boxShadow: isSelected ? theme => `0 0 0 3px ${theme.palette.warning.main}22` : 'none'
            }}
          />
          <Typography variant='body2' sx={{ fontWeight: isSelected ? 600 : 400, lineHeight: 1.45 }}>
            {option.label}
          </Typography>
          {isSelected ? <Chip size='small' label='Selected' color='warning' variant='outlined' sx={{ ml: 'auto' }} /> : null}
        </Box>
      )
    })}
    <Grid container spacing={1.5} sx={{ mt: 2.5 }}>
      {[
        { label: 'MR#', value: ba?.mrNo },
        { label: 'PR#', value: ba?.prNo },
        { label: 'PO#', value: ba?.poNo }
      ].map(field => (
        <Grid item xs={12} key={field.label}>
          <Box sx={readoutBoxSx}>
            <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.5, fontWeight: 600 }}>
              {field.label}
            </Typography>
            <Typography variant='body2' sx={{ fontWeight: field.value ? 500 : 400, color: field.value ? 'text.primary' : 'text.disabled' }}>
              {field.value || '—'}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  </Box>
)

const CannibalJustificationDisplay = ({ ba }) => {
  if (!ba) return null

  const plantSelected = plantStatementFromFlags(ba)
  const logisticSelected = logisticStatementFromFlags(ba)
  const hasPlantStatement = Boolean(plantSelected)
  const hasLogisticStatement = Boolean(logisticSelected)

  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={4}>
          <CannibalSectionCard
            title='Plant Statement'
            subtitle='Justification from plant'
            icon='tabler:building-factory-2'
            compact
            fullHeight
            sx={{ mb: 0 }}
          >
            <StatementReadout
              options={PLANT_STATEMENT_OPTIONS}
              selected={plantSelected}
              otherText={ba.plantOtherText}
              otherLabel='Other (Plant)'
              signature={
                hasPlantStatement
                  ? {
                      label: 'Requested By (Plant)',
                      user: ba.statementRequester,
                      date: ba.statementRequestedAt
                    }
                  : null
              }
              emptyMessage={hasPlantStatement ? null : 'No plant statement recorded for this legacy BA.'}
            />
          </CannibalSectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <CannibalSectionCard
            title='Logistic Statement'
            subtitle='Confirmation from logistics'
            icon='tabler:truck'
            iconColor='info'
            compact
            fullHeight
            sx={{ mb: 0 }}
          >
            <StatementReadout
              options={LOGISTIC_STATEMENT_OPTIONS}
              selected={logisticSelected}
              otherText={ba.logisticOtherText}
              otherLabel='Other (Logistic)'
              leadTimeDays={ba.logisticLeadTimeDays}
              signature={
                hasLogisticStatement
                  ? {
                      label: 'Confirmed By (Logistics)',
                      user: ba.statementConfirmer,
                      date: ba.statementConfirmedAt
                    }
                  : null
              }
              emptyMessage={hasLogisticStatement ? null : 'No logistic statement recorded for this legacy BA.'}
            />
          </CannibalSectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <CannibalSectionCard
            title='Planning Action'
            subtitle='Follow-up by planning section'
            icon='tabler:clipboard-list'
            iconColor='warning'
            compact
            fullHeight
            sx={{ mb: 0 }}
          >
            <PlanningReadout ba={ba} />
          </CannibalSectionCard>
        </Grid>
      </Grid>
    </Box>
  )
}

export default CannibalJustificationDisplay
