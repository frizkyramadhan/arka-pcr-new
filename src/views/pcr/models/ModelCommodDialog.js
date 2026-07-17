/**
 * Dialog CRUD commod — model readonly (ARKFleet), pilih component + policy + price.
 */
import { useEffect } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import { useForm, Controller } from 'react-hook-form'

import CustomTextField from 'src/@core/components/mui/text-field'

const defaultValues = {
  idComp: '',
  policy: '',
  price: ''
}

const fieldSx = { width: '100%' }

function validateUniqueComponent(idComp, initialData, existingRows) {
  if (!idComp) return 'Component is required'

  const compId = Number(idComp)
  if (!Number.isFinite(compId) || compId <= 0) return 'Component is required'

  const duplicate = (existingRows ?? []).find(
    row => Number(row.idComp) === compId && row.idMod !== initialData?.idMod
  )

  if (duplicate) {
    return 'Component ini sudah dipetakan ke model yang sama'
  }

  return true
}

const ModelCommodDialog = ({ open, onClose, onSubmit, initialData, model, components, existingRows = [] }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({ defaultValues })

  const isEdit = Boolean(initialData)

  useEffect(() => {
    if (!open) return

    reset(
      initialData
        ? {
            idComp: String(initialData.idComp ?? ''),
            policy: initialData.policy ?? '',
            price: initialData.price ?? ''
          }
        : defaultValues
    )
  }, [open, initialData, reset])

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{isEdit ? 'Edit Component Policy' : 'Add Component Policy'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, pt: 1 }}>
            <CustomTextField
              fullWidth
              sx={fieldSx}
              label='Model'
              value={model ? `${model.model}${model.manufacture ? ` (${model.manufacture})` : ''}` : ''}
              disabled
            />
            <Controller
              name='idComp'
              control={control}
              rules={{
                required: 'Component is required',
                validate: value => validateUniqueComponent(value, initialData, existingRows)
              }}
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  fullWidth
                  sx={fieldSx}
                  select
                  label='Component'
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
              render={({ field }) => (
                <CustomTextField
                  {...field}
                  fullWidth
                  sx={fieldSx}
                  type='number'
                  label='Policy (hours)'
                  helperText='Interval penggantian komponen (jam operasi)'
                />
              )}
            />
            <Controller
              name='price'
              control={control}
              render={({ field }) => (
                <CustomTextField {...field} fullWidth sx={fieldSx} type='number' label='Price' />
              )}
            />
            {!isEdit ? (
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                Life type default: Hour (interval berdasarkan HM unit).
              </Typography>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 6, pb: 5 }}>
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

export default ModelCommodDialog
