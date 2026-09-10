/**
 * PCR type fields — 3-column layout: Type | Location | Life Mode (English labels).
 */
import Box from '@mui/material/Box'
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

import {
  PCR_SUPPLY_CATEGORY_OPTIONS,
  REPAIR_LIFE_MODE_OPTIONS,
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

const ForecastPcrTypeFields = ({ value, onChange, fieldErrors, disabled = false }) => {
  const form = value ?? emptyPcrSupplyForm()
  const categoryError = getFieldError(fieldErrors, 'pcrSupplyCategory')
  const siteError = getFieldError(fieldErrors, 'repairSite')
  const vendorError = getFieldError(fieldErrors, 'repairVendorKind')
  const dealerError = getFieldError(fieldErrors, 'repairDealerName')
  const lifeError = getFieldError(fieldErrors, 'repairLifeMode')
  const isRepair = form.pcrSupplyCategory === 'REPAIR'

  const patch = next => {
    const merged = { ...form, ...next }
    if (merged.pcrSupplyCategory !== 'REPAIR') {
      merged.repairSite = ''
      merged.repairVendorKind = ''
      merged.repairDealerName = ''
      merged.repairLifeMode = ''
    } else if (merged.repairSite !== 'OUT_SITE') {
      merged.repairVendorKind = ''
      merged.repairDealerName = ''
    } else if (merged.repairVendorKind !== 'DEALER') {
      merged.repairDealerName = ''
    }
    onChange(merged)
  }

  return (
    <Grid item xs={12}>
      <Grid container spacing={3}>
        {/* Column 1 — PCR Type */}
        <Grid item xs={12} md={4}>
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

        {/* Column 2 — Location (Repair only) */}
        <Grid item xs={12} md={4}>
          <Box sx={{ ...columnSx, opacity: isRepair ? 1 : 0.55 }}>
            <FormControl error={Boolean(siteError)} disabled={disabled || !isRepair} sx={{ width: '100%' }}>
              <FormLabel sx={{ mb: 1.5, fontWeight: 700 }}>Location</FormLabel>
              {!isRepair ? (
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  Available when PCR Type is Repair.
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

                  {form.repairSite === 'OUT_SITE' ? (
                    <Box sx={{ mt: 2 }}>
                      <SearchableSelect
                        label='Out-site destination'
                        value={form.repairVendorKind}
                        onChange={event => patch({ repairVendorKind: event.target.value })}
                        disabled={disabled}
                        error={Boolean(vendorError)}
                        helperText={vendorError || 'APS = Kariangau project workshop, not a dealer'}
                        options={REPAIR_VENDOR_KIND_OPTIONS}
                        disableClearable
                      />
                    </Box>
                  ) : null}

                  {form.repairSite === 'OUT_SITE' && form.repairVendorKind === 'DEALER' ? (
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
                </>
              )}
            </FormControl>
          </Box>
        </Grid>

        {/* Column 3 — Life Mode (Repair only) */}
        <Grid item xs={12} md={4}>
          <Box sx={{ ...columnSx, opacity: isRepair ? 1 : 0.55 }}>
            <FormControl error={Boolean(lifeError)} disabled={disabled || !isRepair} sx={{ width: '100%' }}>
              <FormLabel sx={{ mb: 1.5, fontWeight: 700 }}>Life Mode</FormLabel>
              {!isRepair ? (
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  Available when PCR Type is Repair.
                </Typography>
              ) : (
                <>
                  <RadioGroup
                    name='repairLifeMode'
                    value={form.repairLifeMode}
                    onChange={event => patch({ repairLifeMode: event.target.value })}
                  >
                    {REPAIR_LIFE_MODE_OPTIONS.map(option => (
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
                    {lifeError ||
                      'Return and Continue Life keep life running. Back to Zero resets life on close. Return stays a separate type.'}
                  </FormHelperText>
                </>
              )}
            </FormControl>
          </Box>
        </Grid>
      </Grid>
    </Grid>
  )
}

export default ForecastPcrTypeFields
