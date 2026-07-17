/**
 * CannibalWorkflowStepper — visual progress for plant → logistics → approval → documentation.
 */
import Box from '@mui/material/Box'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import Typography from '@mui/material/Typography'

import { CANNIBAL_WORKFLOW_STEPS, getCannibalWorkflowStepIndex } from 'src/utils/cannibal-workflow'

const CannibalWorkflowStepper = ({ statusBa, compact = false }) => {
  const activeStep = getCannibalWorkflowStepIndex(statusBa)

  return (
    <Box sx={{ mb: compact ? 0 : 4 }}>
      <Stepper
        activeStep={activeStep}
        alternativeLabel={!compact}
        orientation={compact ? 'horizontal' : 'horizontal'}
        sx={
          compact
            ? {
                '& .MuiStepConnector-line': { minWidth: { xs: 12, sm: 24 } },
                '& .MuiStepLabel-iconContainer': { pr: 0.5 },
                '& .MuiStepIcon-root': { width: 24, height: 24 },
                '& .MuiStepLabel-label': { display: { xs: 'none', md: 'block' }, fontSize: '0.7rem', mt: '4px !important' }
              }
            : undefined
        }
      >
        {CANNIBAL_WORKFLOW_STEPS.map(step => (
          <Step key={step.key} completed={activeStep > CANNIBAL_WORKFLOW_STEPS.findIndex(item => item.key === step.key)}>
            <StepLabel>
              <Typography variant='caption' sx={{ display: compact ? { xs: 'none', md: 'block' } : { xs: 'none', sm: 'block' } }}>
                {step.label}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  )
}

export default CannibalWorkflowStepper
