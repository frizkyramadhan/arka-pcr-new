/**
 * SAP B1 material autocomplete for cannibal P/N — server-side lookup only.
 * Credentials never reach the browser; only /api/sap/materials is called.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import CustomAutocomplete from 'src/@core/components/mui/autocomplete'
import CustomTextField from 'src/@core/components/mui/text-field'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 350

/** MUI option label is "PN — description"; API search should use PN only. */
function extractPnQuery(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''

  const emDash = trimmed.indexOf(' — ')
  if (emDash > 0) return trimmed.slice(0, emDash).trim()

  const hyphen = trimmed.indexOf(' - ')
  if (hyphen > 0) return trimmed.slice(0, hyphen).trim()

  return trimmed
}

const SapMaterialAutocomplete = ({ value, onPnChange, onMaterialSelect, disabled, fieldProps = {}, error = false, helperText }) => {
  const [inputValue, setInputValue] = useState(value ?? '')
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [sapUnavailable, setSapUnavailable] = useState(false)
  const debounceRef = useRef(null)
  const requestIdRef = useRef(0)
  const skipFetchRef = useRef(false)
  const abortRef = useRef(null)

  useEffect(() => {
    setInputValue(value ?? '')
  }, [value])

  const selectedOption = useMemo(() => {
    if (!value) return null

    const match = options.find(opt => opt.pn === value)

    return match ?? { pn: value, compDesc: '' }
  }, [options, value])

  const fetchMaterials = useCallback(async query => {
    const searchQ = extractPnQuery(query)
    if (searchQ.length < MIN_QUERY_LENGTH) {
      setOptions([])
      setSapUnavailable(false)
      setLoading(false)

      return
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const requestId = ++requestIdRef.current
    setLoading(true)

    try {
      const res = await fetch(`/api/sap/materials?q=${encodeURIComponent(searchQ)}&limit=20`, {
        signal: controller.signal
      })
      const payload = await res.json()

      if (requestId !== requestIdRef.current) return

      if (!res.ok) {
        setOptions([])
        setSapUnavailable(true)

        return
      }

      setSapUnavailable(false)
      setOptions(Array.isArray(payload.data) ? payload.data : [])
    } catch (error) {
      if (error?.name === 'AbortError') return
      if (requestId !== requestIdRef.current) return
      setOptions([])
      setSapUnavailable(true)
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false

      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      fetchMaterials(inputValue)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchMaterials, inputValue])

  useEffect(() => () => abortRef.current?.abort(), [])

  return (
    <CustomAutocomplete
      freeSolo
      disabled={disabled}
      options={options}
      loading={loading}
      value={selectedOption}
      inputValue={inputValue}
      filterOptions={x => x}
      getOptionLabel={option => {
        if (typeof option === 'string') return extractPnQuery(option)
        if (!option?.pn) return ''
        if (!option.compDesc) return option.pn

        return `${option.pn} — ${option.compDesc}`
      }}
      isOptionEqualToValue={(option, selected) => option?.pn === selected?.pn}
      renderOption={(props, option) => {
        if (typeof option === 'string' || option?.onHand == null) {
          return (
            <li {...props} key={option?.pn ?? props.key}>
              {option?.pn ? (option.compDesc ? `${option.pn} — ${option.compDesc}` : option.pn) : option}
            </li>
          )
        }

        return (
          <Box
            component='li'
            {...props}
            key={option.pn}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}
          >
            <Typography variant='body2' noWrap>
              {option.compDesc ? `${option.pn} — ${option.compDesc}` : option.pn}
            </Typography>
            <Typography variant='caption' sx={{ color: option.onHand > 0 ? 'success.main' : 'error.main', flexShrink: 0 }}>
              Stock: {option.onHand}
            </Typography>
          </Box>
        )
      }}
      noOptionsText={
        sapUnavailable
          ? 'SAP lookup unavailable — enter P/N manually'
          : extractPnQuery(inputValue).length < MIN_QUERY_LENGTH
            ? `Type ${MIN_QUERY_LENGTH}+ characters`
            : 'No materials found'
      }
      onInputChange={(_event, nextInput, reason) => {
        const pnOnly = extractPnQuery(nextInput)

        // After picking from list, MUI sends full "PN — description" — keep PN only, skip refetch
        if (reason === 'reset') {
          skipFetchRef.current = true
          setInputValue(pnOnly)

          return
        }

        if (reason === 'clear') {
          skipFetchRef.current = true
          setInputValue('')
          onPnChange('')

          return
        }

        setInputValue(nextInput)
        if (reason === 'input') {
          onPnChange(pnOnly)
        }
      }}
      onChange={(_event, newValue) => {
        skipFetchRef.current = true

        if (typeof newValue === 'string') {
          const pn = extractPnQuery(newValue)
          setInputValue(pn)
          onPnChange(pn)

          return
        }

        if (!newValue) {
          setInputValue('')
          onPnChange('')

          return
        }

        const pn = newValue.pn ?? ''
        onMaterialSelect({
          pn,
          compDesc: newValue.compDesc ?? ''
        })
        setInputValue(pn)
      }}
      renderInput={params => (
        <CustomTextField
          {...params}
          {...fieldProps}
          placeholder='Search P/N or component'
          {...(error ? { error: true, helperText } : {})}
          InputProps={{
            ...params.InputProps,
            ...fieldProps.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color='inherit' size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
    />
  )
}

export default SapMaterialAutocomplete
