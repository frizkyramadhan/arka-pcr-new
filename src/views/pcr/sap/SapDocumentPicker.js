/**
 * SAP document number picker — search/validate DocNum via Service Layer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomAutocomplete from 'src/@core/components/mui/autocomplete'
import CustomChip from 'src/@core/components/mui/chip'
import CustomTextField from 'src/@core/components/mui/text-field'

import {
  normalizeDocNumValue,
  SAP_DOCUMENT_LABELS,
  searchSapDocuments,
  statusChipColor
} from './sap-document-utils'

const MIN_QUERY_LENGTH = 4
const DEBOUNCE_MS = 350

const SapDocumentPicker = ({
  type,
  value,
  onChange,
  disabled = false,
  label,
  hideLabel = false,
  required = false,
  error = false,
  helperText,
  fieldProps = {}
}) => {
  const [inputValue, setInputValue] = useState(value ?? '')
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [sapUnavailable, setSapUnavailable] = useState(false)
  const [preview, setPreview] = useState(null)
  const debounceRef = useRef(null)
  const requestIdRef = useRef(0)
  const skipFetchRef = useRef(false)
  const abortRef = useRef(null)

  const fieldLabel = hideLabel ? undefined : label ?? `${SAP_DOCUMENT_LABELS[type] ?? type} No.`

  useEffect(() => {
    setInputValue(value ?? '')
  }, [value])

  const selectedOption = useMemo(() => {
    const normalized = normalizeDocNumValue(value)
    if (!normalized) return null

    const match = options.find(opt => String(opt.docNum) === normalized)

    return match ?? { docNum: Number(normalized), label: normalized, docStatusLabel: '' }
  }, [options, value])

  const fetchDocuments = useCallback(
    async query => {
      const searchQ = normalizeDocNumValue(query)

      if (searchQ.length < MIN_QUERY_LENGTH) {
        setOptions([])
        setPreview(null)
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
        const data = await searchSapDocuments({
          type,
          query: searchQ,
          limit: 10,
          signal: controller.signal
        })

        if (requestId !== requestIdRef.current) return

        setSapUnavailable(false)
        const filtered = data.filter(item => String(item.docNum).startsWith(searchQ))
        setOptions(filtered)

        const exact = filtered.find(item => String(item.docNum) === searchQ)
        setPreview(exact ?? null)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (requestId !== requestIdRef.current) return
        setOptions([])
        setPreview(null)
        setSapUnavailable(true)
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [type]
  )

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false

      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      fetchDocuments(inputValue)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchDocuments, inputValue])

  useEffect(() => () => abortRef.current?.abort(), [])

  if (sapUnavailable) {
    return (
      <Box>
        <CustomTextField
          fullWidth
          disabled={disabled}
          label={fieldLabel}
          value={value ?? ''}
          onChange={event => onChange(event.target.value)}
          required={required}
          error={error}
          helperText={helperText}
          {...fieldProps}
          InputProps={{
            ...fieldProps.InputProps,
            endAdornment: (
              <Tooltip title='SAP lookup unavailable — enter document number manually'>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                  <Icon icon='tabler:alert-triangle' fontSize='1rem' />
                </Box>
              </Tooltip>
            )
          }}
        />
      </Box>
    )
  }

  return (
    <Box>
      <CustomAutocomplete
        freeSolo
        disabled={disabled}
        options={options}
        loading={loading}
        value={selectedOption}
        inputValue={inputValue}
        filterOptions={x => x}
        getOptionLabel={option => {
          if (typeof option === 'string') return normalizeDocNumValue(option)
          if (!option?.docNum) return ''

          return String(option.docNum)
        }}
        renderOption={(props, option) => (
          <li {...props} key={option.docNum}>
            <Typography variant='body2' sx={{ fontWeight: 500 }}>
              {option.label || option.docNum}
            </Typography>
          </li>
        )}
        isOptionEqualToValue={(option, selected) => String(option?.docNum) === String(selected?.docNum)}
        noOptionsText={
          normalizeDocNumValue(inputValue).length < MIN_QUERY_LENGTH
            ? `Type ${MIN_QUERY_LENGTH}+ digits`
            : 'No documents found in SAP'
        }
        onInputChange={(_event, nextInput, reason) => {
          const docOnly = normalizeDocNumValue(nextInput)

          if (reason === 'reset') {
            skipFetchRef.current = true
            setInputValue(docOnly)

            return
          }

          if (reason === 'clear') {
            skipFetchRef.current = true
            setInputValue('')
            onChange('')
            setPreview(null)

            return
          }

          setInputValue(docOnly)
          // Don't commit partial typed value to parent — avoid status lookup on incomplete DocNum.
        }}
        onChange={(_event, newValue) => {
          skipFetchRef.current = true

          if (typeof newValue === 'string') {
            const docNum = normalizeDocNumValue(newValue)
            setInputValue(docNum)
            onChange(docNum)
            setPreview(null)

            return
          }

          if (!newValue) {
            setInputValue('')
            onChange('')
            setPreview(null)

            return
          }

          const docNum = String(newValue.docNum ?? '')
          setInputValue(docNum)
          onChange(docNum)
          setPreview(newValue)
        }}
        renderInput={params => (
          <CustomTextField
            {...params}
            {...fieldProps}
            label={fieldLabel}
            required={required}
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

      {preview ? (
        <Box
          sx={{
            mt: 1.5,
            p: 2,
            borderRadius: 1,
            border: theme => `1px solid ${theme.palette.divider}`,
            bgcolor: 'action.hover'
          }}
        >
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
            SAP preview
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {preview.label || preview.docNum}
            </Typography>
            {preview.docStatusLabel ? (
              <CustomChip
                rounded
                skin='light'
                size='small'
                label={preview.docStatusLabel}
                color={statusChipColor(preview.docStatusLabel)}
              />
            ) : null}
          </Box>
          {preview.project ? (
            <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
              Project: {preview.project}
            </Typography>
          ) : null}
        </Box>
      ) : null}
    </Box>
  )
}

export default SapDocumentPicker
