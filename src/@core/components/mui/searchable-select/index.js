/**
 * SearchableSelect — Vuexy-styled select with type-to-search (Select2-like).
 * Built on MUI Autocomplete so it stays compatible with Next.js (no jQuery).
 *
 * Search text is independent of the selected value: opening the list clears
 * the input so the user can type. Autocomplete "reset" (which would restore
 * "Select unit") is ignored while the list is open.
 *
 * onChange matches CustomTextField select: event.target.name / event.target.value.
 */
import { useEffect, useState } from 'react'

import CustomAutocomplete from 'src/@core/components/mui/autocomplete'
import CustomTextField from 'src/@core/components/mui/text-field'

const optionKey = option => `${String(option?.value ?? '')}::${option?.label ?? ''}`

const findOption = (options, value) => {
  if (value === undefined || value === null) return null

  return options.find(option => String(option.value) === String(value)) ?? null
}

const emitChange = (name, value, onChange) => {
  if (typeof onChange !== 'function') return

  onChange({
    target: { name, value },
    currentTarget: { name, value }
  })
}

const SearchableSelect = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = 'Search…',
  helperText,
  error = false,
  disabled = false,
  required = false,
  fullWidth = true,
  size,
  sx,
  multiple = false,
  disableClearable = false,
  id
}) => {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const selected = multiple
    ? (Array.isArray(value) ? value : []).map(item => findOption(options, item)).filter(Boolean)
    : findOption(options, value)

  const selectedLabel = multiple ? '' : selected?.label ?? ''

  useEffect(() => {
    if (!open && !multiple) {
      setInputValue(selectedLabel)
    }
  }, [open, multiple, selectedLabel])

  return (
    <CustomAutocomplete
      id={id}
      open={open}
      openOnFocus
      autoHighlight
      multiple={multiple}
      disableClearable={disableClearable}
      disabled={disabled}
      options={options}
      value={multiple ? selected : selected ?? null}
      inputValue={inputValue}
      getOptionLabel={option => option?.label ?? ''}
      isOptionEqualToValue={(option, current) => String(option?.value) === String(current?.value)}
      getOptionDisabled={option => Boolean(option?.disabled)}
      filterOptions={(opts, state) => {
        const query = state.inputValue.trim().toLowerCase()
        if (!query) return opts

        return opts.filter(option => String(option?.label ?? '').toLowerCase().includes(query))
      }}
      renderOption={(props, option) => (
        <li {...props} key={optionKey(option)}>
          {option.label}
        </li>
      )}
      onOpen={() => {
        setOpen(true)
        if (!multiple) setInputValue('')
      }}
      onClose={() => {
        setOpen(false)
      }}
      onInputChange={(_event, next, reason) => {
        if (reason === 'reset') return

        setInputValue(next)
      }}
      onChange={(_event, next) => {
        if (multiple) {
          emitChange(
            name,
            (next ?? []).map(option => option.value),
            onChange
          )
          setInputValue('')

          return
        }

        emitChange(name, next ? next.value : '', onChange)
        setInputValue(next?.label ?? '')
      }}
      onBlur={onBlur}
      sx={{ width: fullWidth ? '100%' : undefined, ...sx }}
      renderInput={params => (
        <CustomTextField
          {...params}
          name={name}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          required={required}
          size={size}
          sx={sx}
        />
      )}
    />
  )
}

export default SearchableSelect
