// ** React Imports
import { useEffect } from 'react'

// ** MUI Imports
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import MenuItem from '@mui/material/MenuItem'

// ** Third Party Imports
import { useForm, Controller } from 'react-hook-form'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

const defaultValues = {
  fleetModelId: '',
  idComp: '',
  policy: '',
  price: '',
  lifeType: 'Hour'
}

const ModelComponentDialog = ({ open, onClose, onSubmit, initialData, models, components }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({ defaultValues })

  useEffect(() => {
    if (open) {
      reset(
        initialData
          ? {
              fleetModelId: String(initialData.fleetModelId ?? ''),
              idComp: String(initialData.idComp ?? ''),
              policy: initialData.policy ?? '',
              price: initialData.price ?? '',
              lifeType: initialData.lifeType ?? 'Hour'
            }
          : defaultValues
      )
    }
  }, [open, initialData, reset])

  const isEdit = Boolean(initialData)

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{isEdit ? 'Edit Model Policy' : 'Add Model Policy'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Controller
            name='fleetModelId'
            control={control}
            rules={{ required: 'Model is required' }}
            render={({ field }) => (
              <CustomTextField
                {...field}
                select
                label='Fleet Model'
                disabled={isEdit}
                error={Boolean(errors.fleetModelId)}
                helperText={errors.fleetModelId?.message}
              >
                {models.map(model => (
                  <MenuItem key={model.model_id} value={String(model.model_id)}>
                    {model.model} ({model.manufacture})
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='idComp'
            control={control}
            rules={{ required: 'Component is required' }}
            render={({ field }) => (
              <CustomTextField
                {...field}
                select
                label='Component'
                disabled={isEdit}
                error={Boolean(errors.idComp)}
                helperText={errors.idComp?.message}
              >
                {components.map(comp => (
                  <MenuItem key={comp.idComp} value={String(comp.idComp)}>
                    {comp.compDesc}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          />
          <Controller
            name='policy'
            control={control}
            render={({ field }) => <CustomTextField {...field} type='number' label='Policy (hours)' />}
          />
          <Controller
            name='price'
            control={control}
            render={({ field }) => <CustomTextField {...field} type='number' label='Price' />}
          />
          <Controller
            name='lifeType'
            control={control}
            render={({ field }) => (
              <CustomTextField {...field} select label='Life Type'>
                <MenuItem value='Hour'>Hour</MenuItem>
                <MenuItem value='Calendar'>Calendar</MenuItem>
              </CustomTextField>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button variant='tonal' color='secondary' onClick={onClose}>
            Cancel
          </Button>
          <Button type='submit' variant='contained'>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ModelComponentDialog
