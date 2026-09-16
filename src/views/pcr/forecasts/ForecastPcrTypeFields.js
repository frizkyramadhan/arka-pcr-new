/**
 * PCR type fields — 4 columns: Type | Location | Lifetime Mode | Return To (+ Other Unit row).
 */
import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import FormLabel from '@mui/material/FormLabel'
import Grid from '@mui/material/Grid'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Typography from '@mui/material/Typography'

import CustomTextField from 'src/@core/components/mui/text-field'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import { getFieldError } from 'src/utils/api-error-message'
import arkaApi from 'src/utils/arka-api'
import { withBasePath } from 'src/utils/base-path'

import {
  LIFETIME_MODE_OPTIONS,
  PCR_COMPONENT_GRADE_OPTIONS,
  PCR_RETURN_TO_OPTIONS,
  PCR_SUPPLY_CATEGORY_OPTIONS,
  REPAIR_SITE_OPTIONS,
  REPAIR_VENDOR_KIND_OPTIONS,
  emptyPcrSupplyForm
} from '@/lib/forecasts/pcr-supply'

const columnSx = {
  height: '100%',
  p: 3,
  borderRadius: 1,
  border: theme => `1px solid ${theme.palette.divider}`,
  bgcolor: 'background.paper'
}

const unitLabel = unit => {
  if (!unit) return ''
  const no = unit.unit_no ?? unit.unitNo ?? ''
  const project = unit.project_code ?? unit.projectCode ?? ''

  return project ? `${no} · ${project}` : no
}

const ForecastPcrTypeFields = ({
  value,
  onChange,
  fieldErrors,
  disabled = false,
  donorFleetUnitId = null,
  idMod = null,
  compDesc = '',
  selectedReturnOtherUnit = null
}) => {
  const form = value ?? emptyPcrSupplyForm()
  const categoryError = getFieldError(fieldErrors, 'pcrSupplyCategory')
  const siteError = getFieldError(fieldErrors, 'repairSite')
  const vendorError = getFieldError(fieldErrors, 'repairVendorKind')
  const dealerError = getFieldError(fieldErrors, 'repairDealerName')
  const gradeError = getFieldError(fieldErrors, 'pcrComponentGrade')
  const lifeError = getFieldError(fieldErrors, 'repairLifeMode')
  const returnError = getFieldError(fieldErrors, 'pcrReturnTo')
  const otherUnitError = getFieldError(fieldErrors, 'returnOtherFleetUnitId')
  const cannibalError = getFieldError(fieldErrors, 'cannibalNoBa')
  const isRepair = form.pcrSupplyCategory === 'REPAIR'
  const isOutSite = form.repairSite === 'OUT_SITE'
  const isAps = isOutSite && form.repairVendorKind === 'APS'
  const isOtherUnit = isRepair && form.pcrReturnTo === 'OTHER_UNIT'
  const usedLocksContinue = isAps && form.pcrComponentGrade === 'USED'

  const [unitSearch, setUnitSearch] = useState('')
  const [unitOptions, setUnitOptions] = useState([])
  const [unitLoading, setUnitLoading] = useState(false)
  const [cannibalSearch, setCannibalSearch] = useState('')
  const [cannibalOptions, setCannibalOptions] = useState([])
  const [cannibalLoading, setCannibalLoading] = useState(false)

  const unitSelectOptions = useMemo(() => {
    const rows = [...unitOptions]
    if (
      selectedReturnOtherUnit &&
      String(selectedReturnOtherUnit.fleetUnitId) === String(form.returnOtherFleetUnitId) &&
      !rows.some(row => String(row.id) === String(form.returnOtherFleetUnitId))
    ) {
      rows.unshift({
        id: selectedReturnOtherUnit.fleetUnitId,
        unit_no: selectedReturnOtherUnit.unitNo,
        project_code: selectedReturnOtherUnit.projectCode,
        description: selectedReturnOtherUnit.description ?? ''
      })
    }

    return rows.map(row => ({
      value: String(row.id),
      label: unitLabel(row)
    }))
  }, [form.returnOtherFleetUnitId, selectedReturnOtherUnit, unitOptions])

  const cannibalSelectOptions = useMemo(() => {
    const rows = [...cannibalOptions]
    if (form.cannibalNoBa && !rows.some(row => row.noBa === form.cannibalNoBa)) {
      rows.unshift({ noBa: form.cannibalNoBa, statusBa: '', projectCode: '' })
    }

    return rows.map(row => ({
      value: row.noBa,
      label: row.statusBa ? `${row.noBa} · ${row.statusBa}` : row.noBa
    }))
  }, [cannibalOptions, form.cannibalNoBa])

  const cannibalHelperText = (() => {
    if (cannibalError) return cannibalError
    if (!form.returnOtherFleetUnitId) return 'Select the other unit first.'
    if (cannibalLoading) return 'Searching cannibal BA…'
    if (cannibalSelectOptions.length === 0 && !form.cannibalNoBa) {
      return `No BA matches REMOVE (this forecast unit) → INSTALL (${
        unitSelectOptions.find(opt => opt.value === String(form.returnOtherFleetUnitId))?.label || 'other unit'
      }) for ${compDesc || 'this component'}. Create a BA or pick another unit. Draft is enough.`
    }

    return 'Required before Submit BA PCR. Draft is enough — not Fully Approved.'
  })()

  const patch = next => {
    const merged = { ...form, ...next }
    if (merged.repairSite !== 'OUT_SITE') {
      merged.repairVendorKind = ''
      merged.repairDealerName = ''
      merged.pcrComponentGrade = ''
    } else if (merged.repairVendorKind !== 'DEALER') {
      merged.repairDealerName = ''
    }

    if (!(merged.repairSite === 'OUT_SITE' && merged.repairVendorKind === 'APS')) {
      merged.pcrComponentGrade = ''
    } else if (merged.pcrComponentGrade === 'USED') {
      merged.repairLifeMode = 'CONTINUE_LIFE'
    }

    if (merged.pcrSupplyCategory !== 'REPAIR') {
      merged.pcrReturnTo = 'ORIGINAL_UNIT'
      merged.returnOtherFleetUnitId = ''
      merged.cannibalNoBa = ''
    } else if (merged.pcrReturnTo !== 'OTHER_UNIT') {
      merged.returnOtherFleetUnitId = ''
      merged.cannibalNoBa = ''
    }

    onChange(merged)
  }

  useEffect(() => {
    if (!isOtherUnit || !donorFleetUnitId || !idMod) {
      setUnitOptions([])

      return undefined
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      setUnitLoading(true)
      try {
        const { data } = await arkaApi.get('/forecasts/return-other-units', {
          params: {
            idMod,
            excludeFleetUnitId: donorFleetUnitId,
            search: unitSearch || undefined
          }
        })
        if (!cancelled) setUnitOptions(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setUnitOptions([])
      } finally {
        if (!cancelled) setUnitLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [donorFleetUnitId, idMod, isOtherUnit, unitSearch])

  useEffect(() => {
    if (!isOtherUnit || !donorFleetUnitId || !form.returnOtherFleetUnitId) {
      setCannibalOptions([])

      return undefined
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      setCannibalLoading(true)
      try {
        const { data } = await arkaApi.get('/forecasts/cannibal-candidates', {
          params: {
            removeFleetUnitId: donorFleetUnitId,
            installFleetUnitId: form.returnOtherFleetUnitId,
            compDesc: compDesc || undefined,
            search: cannibalSearch || undefined
          }
        })
        if (!cancelled) setCannibalOptions(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setCannibalOptions([])
      } finally {
        if (!cancelled) setCannibalLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [cannibalSearch, compDesc, donorFleetUnitId, form.returnOtherFleetUnitId, isOtherUnit])

  const lifetimeOptions = usedLocksContinue
    ? LIFETIME_MODE_OPTIONS.filter(option => option.value === 'CONTINUE_LIFE')
    : LIFETIME_MODE_OPTIONS

  return (
    <Grid item xs={12}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <Box sx={columnSx}>
            <FormControl error={Boolean(categoryError)} disabled={disabled} sx={{ width: '100%' }}>
              <FormLabel sx={{ mb: 1.5, fontWeight: 700 }}>PCR Type</FormLabel>
              <RadioGroup
                name='pcrSupplyCategory'
                value={form.pcrSupplyCategory}
                onChange={event => patch({ pcrSupplyCategory: event.target.value })}
              >
                {PCR_SUPPLY_CATEGORY_OPTIONS.map(option => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio size='small' />}
                    label={option.label}
                    sx={{ mb: 0.5 }}
                  />
                ))}
              </RadioGroup>
              <FormHelperText sx={{ mx: 0, mt: 1 }}>
                {categoryError || 'Required for non-warranty forecasts. Warranty skips this section.'}
              </FormHelperText>
            </FormControl>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Box sx={{ ...columnSx, opacity: form.pcrSupplyCategory ? 1 : 0.55 }}>
            <FormControl
              error={Boolean(siteError)}
              disabled={disabled || !form.pcrSupplyCategory}
              sx={{ width: '100%' }}
            >
              <FormLabel sx={{ mb: 1.5, fontWeight: 700 }}>Location</FormLabel>
              {!form.pcrSupplyCategory ? (
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  Choose PCR Type first.
                </Typography>
              ) : (
                <>
                  <RadioGroup
                    name='repairSite'
                    value={form.repairSite}
                    onChange={event => patch({ repairSite: event.target.value })}
                  >
                    {REPAIR_SITE_OPTIONS.map(option => (
                      <FormControlLabel
                        key={option.value}
                        value={option.value}
                        control={<Radio size='small' />}
                        label={option.label}
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </RadioGroup>
                  {siteError ? (
                    <FormHelperText error sx={{ mx: 0 }}>
                      {siteError}
                    </FormHelperText>
                  ) : null}

                  {isOutSite ? (
                    <Box sx={{ mt: 2 }}>
                      <SearchableSelect
                        label='Out-site destination'
                        value={form.repairVendorKind}
                        onChange={event => patch({ repairVendorKind: event.target.value })}
                        disabled={disabled}
                        error={Boolean(vendorError)}
                        helperText={vendorError}
                        options={REPAIR_VENDOR_KIND_OPTIONS}
                        disableClearable
                      />
                    </Box>
                  ) : null}

                  {isOutSite && form.repairVendorKind === 'DEALER' ? (
                    <Box sx={{ mt: 3 }}>
                      <CustomTextField
                        fullWidth
                        label='Dealer name'
                        value={form.repairDealerName}
                        onChange={event => patch({ repairDealerName: event.target.value })}
                        disabled={disabled}
                        error={Boolean(dealerError)}
                        helperText={dealerError || undefined}
                      />
                    </Box>
                  ) : null}

                  {isAps ? (
                    <Box sx={{ mt: 3 }}>
                      <FormControl error={Boolean(gradeError)} disabled={disabled} sx={{ width: '100%' }}>
                        <FormLabel sx={{ mb: 1, fontWeight: 600 }}>Component Grade</FormLabel>
                        <RadioGroup
                          name='pcrComponentGrade'
                          value={form.pcrComponentGrade}
                          onChange={event => patch({ pcrComponentGrade: event.target.value })}
                        >
                          {PCR_COMPONENT_GRADE_OPTIONS.map(option => (
                            <FormControlLabel
                              key={option.value}
                              value={option.value}
                              control={<Radio size='small' />}
                              label={option.label}
                              sx={{ mb: 0.5 }}
                            />
                          ))}
                        </RadioGroup>
                        <FormHelperText sx={{ mx: 0 }}>
                          {gradeError || 'Used allows Continue Life only.'}
                        </FormHelperText>
                      </FormControl>
                    </Box>
                  ) : null}
                </>
              )}
            </FormControl>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Box sx={{ ...columnSx, opacity: form.pcrSupplyCategory ? 1 : 0.55 }}>
            <FormControl
              error={Boolean(lifeError)}
              disabled={disabled || !form.pcrSupplyCategory}
              sx={{ width: '100%' }}
            >
              <FormLabel sx={{ mb: 1.5, fontWeight: 700 }}>Lifetime Mode</FormLabel>
              {!form.pcrSupplyCategory ? (
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  Choose PCR Type first.
                </Typography>
              ) : (
                <>
                  <RadioGroup
                    name='repairLifeMode'
                    value={form.repairLifeMode}
                    onChange={event => patch({ repairLifeMode: event.target.value })}
                  >
                    {lifetimeOptions.map(option => (
                      <FormControlLabel
                        key={option.value}
                        value={option.value}
                        control={<Radio size='small' />}
                        label={option.label}
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </RadioGroup>
                  <FormHelperText sx={{ mx: 0, mt: 1 }}>
                    {lifeError || 'Continue Life keeps running hours. Back to Zero resets life on close.'}
                  </FormHelperText>
                </>
              )}
            </FormControl>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Box sx={{ ...columnSx, opacity: form.pcrSupplyCategory ? 1 : 0.55 }}>
            <FormControl
              error={Boolean(returnError)}
              disabled={disabled || !form.pcrSupplyCategory}
              sx={{ width: '100%' }}
            >
              <FormLabel sx={{ mb: 1.5, fontWeight: 700 }}>Return To</FormLabel>
              {!form.pcrSupplyCategory ? (
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  Choose PCR Type first.
                </Typography>
              ) : (
                <>
                  <RadioGroup
                    name='pcrReturnTo'
                    value={form.pcrReturnTo}
                    onChange={event => patch({ pcrReturnTo: event.target.value })}
                  >
                    {PCR_RETURN_TO_OPTIONS.map(option => (
                      <FormControlLabel
                        key={option.value}
                        value={option.value}
                        control={<Radio size='small' />}
                        label={option.label}
                        disabled={option.value === 'OTHER_UNIT' && !isRepair}
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </RadioGroup>
                  <FormHelperText sx={{ mx: 0, mt: 1 }}>
                    {returnError ||
                      (isRepair
                        ? 'Other Unit is donor only — this forecast unit is not installed from this forecast.'
                        : 'Other Unit is Repair only.')}
                  </FormHelperText>
                </>
              )}
            </FormControl>
          </Box>
        </Grid>

        {isOtherUnit ? (
          <Grid item xs={12}>
            <Box sx={columnSx}>
              <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 2 }}>
                Other Unit & cannibal BA
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <SearchableSelect
                    name='returnOtherFleetUnitId'
                    label='Other unit'
                    value={form.returnOtherFleetUnitId}
                    onChange={event =>
                      patch({ returnOtherFleetUnitId: event.target.value || '', cannibalNoBa: '' })
                    }
                    onSearch={setUnitSearch}
                    options={unitSelectOptions}
                    loading={unitLoading}
                    disabled={disabled || !donorFleetUnitId || !idMod}
                    error={Boolean(otherUnitError)}
                    helperText={
                      otherUnitError || 'All projects. Same component type. Not this forecast unit.'
                    }
                    noOptionsText={unitLoading ? 'Loading…' : 'No matching units'}
                    placeholder='Search unit…'
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <SearchableSelect
                    name='cannibalNoBa'
                    label='Cannibal BA'
                    value={form.cannibalNoBa}
                    onChange={event => patch({ cannibalNoBa: event.target.value || '' })}
                    onSearch={setCannibalSearch}
                    options={cannibalSelectOptions}
                    loading={cannibalLoading}
                    disabled={disabled || !form.returnOtherFleetUnitId}
                    error={Boolean(cannibalError)}
                    helperText={cannibalHelperText}
                    noOptionsText={
                      cannibalLoading
                        ? 'Loading…'
                        : 'No matching BA — create one with REMOVE=forecast unit, INSTALL=other unit'
                    }
                    placeholder='Search BA no…'
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    size='small'
                    variant='outlined'
                    href={withBasePath('/cannibals/create')}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    Create cannibal BA
                  </Button>
                  <Typography variant='caption' sx={{ display: 'block', color: 'text.secondary', mt: 1 }}>
                    Alur: forecast unit = donor (REMOVE). Other unit = penerima (INSTALL). Komponen harus
                    sama. BA kanibal boleh draft; wajib di-link sebelum Submit BA PCR.
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        ) : null}
      </Grid>
    </Grid>
  )
}

export default ForecastPcrTypeFields
