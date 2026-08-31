// ** React Imports
import { useEffect } from 'react'

// ** MUI Imports
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'

// ** Third Party Imports
import { useForm, Controller } from 'react-hook-form'

// ** Custom Component Import
import SearchableSelect from 'src/@core/components/mui/searchable-select'
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
              <SearchableSelect
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                label='Fleet Model'
                disabled={isEdit}
                error={Boolean(errors.fleetModelId)}
                helperText={errors.fleetModelId?.message}
                options={models.map(model => ({
                  value: String(model.model_id),
                  label: `${model.model} (${model.manufacture})`
                }))}
              />
            )}
          />
          <Controller
            name='idComp'
            control={control}
            rules={{ required: 'Component is required' }}
            render={({ field }) => (
              <SearchableSelect
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                label='Component'
                disabled={isEdit}
                error={Boolean(errors.idComp)}
                helperText={errors.idComp?.message}
                options={components.map(comp => ({
                  value: String(comp.idComp),
                  label: comp.compDesc
                }))}
              />
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
              <SearchableSelect
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                label='Life Type'
                options={[
                  { value: 'Hour', label: 'Hour' },
                  { value: 'Calendar', label: 'Calendar' }
                ]}
                disableClearable
              />
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
