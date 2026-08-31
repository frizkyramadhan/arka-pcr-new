/**
 * Form input REMOVE / INSTALL — cozy paper-style layout.
 * PN / Component changes on REMOVE also fill INSTALL (still editable).
 */
import { useEffect } from 'react'

import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomTextField from 'src/@core/components/mui/text-field'

import CannibalFormRow from 'src/views/pcr/cannibal/CannibalFormRow'
import SapMaterialAutocomplete from 'src/views/pcr/cannibal/SapMaterialAutocomplete'
import { SapDocumentPicker } from 'src/views/pcr/sap'
import { fetchSapWoStatus, hasDocNumValue, normalizeDocNumValue } from 'src/views/pcr/sap/sap-document-utils'

const sidePanelSx = color => ({
  borderRadius: 2,
  overflow: 'hidden',
  border: theme => `1px solid ${theme.palette[color].main}`,
  bgcolor: theme => `${theme.palette[color].main}08`,
  boxShadow: theme => theme.shadows[1]
})

const fieldProps = {
  fullWidth: true,
  size: 'small',
  variant: 'standard',
  InputProps: { disableUnderline: false }
}

const fieldHelper = error =>
  error
    ? {
        error: true,
        helperText: error
      }
    : {}

const MIN_WO_STATUS_DOC_LENGTH = 8

const formatProjectOption = project =>
  project ? `${project.project_code}${project.bowheer ? ` — ${project.bowheer}` : ''}` : ''

const TransferSideForm = ({
  sideKey,
  side,
  title,
  subtitle,
  icon,
  color,
  projects = [],
  equipments,
  onChange,
  onPatch,
  fieldErrors = {}
}) => {
  const sideError = field => fieldErrors[`pairs.0.${sideKey}.${field}`] ?? ''
  const unitProjectCode = side.unitProjectCode || ''
  const projectSelected = Boolean(unitProjectCode)
  const projectOptions = projects.some(item => item.project_code === unitProjectCode)
    ? projects
    : unitProjectCode
      ? [{ project_code: unitProjectCode, bowheer: '' }, ...projects]
      : projects

  useEffect(() => {
    const wo = normalizeDocNumValue(side.woNoKanibal)

    if (!hasDocNumValue(wo) || wo.length < MIN_WO_STATUS_DOC_LENGTH) {
      if (side.woStatusKanibal) {
        onPatch({ woStatusKanibal: '' })
      }

      return
    }

    const controller = new AbortController()
    let active = true

    const loadStatus = async () => {
      const status = await fetchSapWoStatus(wo, controller.signal)
      if (!active) return

      const next = status || ''
      if (side.woStatusKanibal !== next) {
        onPatch({ woStatusKanibal: next })
      }
    }

    loadStatus()

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync SAP status from WO# only
  }, [side.woNoKanibal])

  return (
  <Box sx={sidePanelSx(color)}>
    <Box
      sx={{
        px: 3,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        borderBottom: theme => `1px solid ${theme.palette.divider}`,
        bgcolor: theme => `${theme.palette[color].main}18`
      }}
    >
      <Icon icon={icon} fontSize='1rem' />
      <Box>
        <Typography variant='subtitle2' sx={{ fontWeight: 600, lineHeight: 1.2, fontSize: '0.875rem' }}>
          {title}
        </Typography>
        <Typography variant='caption' sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>

    <CannibalFormRow cozy label='Project'>
      <SearchableSelect
        size='small'
        value={unitProjectCode}
        onChange={e => onChange('unitProjectCode', e.target.value)}
        {...fieldHelper(sideError('unitProjectCode'))}
        options={[
          { value: '', label: 'Select project' },
          ...projectOptions.map(project => ({
            value: project.project_code,
            label: formatProjectOption(project)
          }))
        ]}
      />
    </CannibalFormRow>
    <CannibalFormRow cozy label='Unit No.'>
      <SearchableSelect
        size='small'
        value={side.fleetUnitId != null && side.fleetUnitId !== '' ? String(side.fleetUnitId) : ''}
        onChange={e => onChange('fleetUnitId', e.target.value)}
        disabled={!projectSelected}
        {...fieldHelper(sideError('fleetUnitId'))}
        options={
          !projectSelected
            ? [{ value: '', label: 'Select project first', disabled: true }]
            : equipments.length === 0
              ? [{ value: '', label: 'No units in this project', disabled: true }]
              : [
                  { value: '', label: 'Select unit' },
                  ...equipments.map(eq => ({ value: String(eq.id), label: eq.unit_no }))
                ]
        }
      />
    </CannibalFormRow>
    <CannibalFormRow cozy label='Date'>
      <CustomTextField
        {...fieldProps}
        type='date'
        value={side.date}
        onChange={e => onChange('date', e.target.value)}
        InputLabelProps={{ shrink: true }}
        {...fieldHelper(sideError('date'))}
      />
    </CannibalFormRow>
    <CannibalFormRow cozy label='P/N'>
      <SapMaterialAutocomplete
        fieldProps={fieldProps}
        value={side.pn}
        disabled={!projectSelected}
        onPnChange={pn => onChange('pn', pn)}
        onMaterialSelect={({ pn, compDesc }) => onPatch({ pn, compDesc })}
        {...fieldHelper(sideError('pn'))}
      />
    </CannibalFormRow>
    <CannibalFormRow cozy label='S/N'>
      <CustomTextField
        {...fieldProps}
        value={side.sn}
        onChange={e => onChange('sn', e.target.value)}
        {...fieldHelper(sideError('sn'))}
      />
    </CannibalFormRow>
    <CannibalFormRow cozy label='POS.'>
      <CustomTextField
        {...fieldProps}
        value={side.pos}
        onChange={e => onChange('pos', e.target.value)}
        {...fieldHelper(sideError('pos'))}
      />
    </CannibalFormRow>
    <CannibalFormRow cozy label='Component'>
      <CustomTextField
        {...fieldProps}
        value={side.compDesc}
        onChange={e => onChange('compDesc', e.target.value)}
        {...fieldHelper(sideError('compDesc'))}
      />
    </CannibalFormRow>
    <CannibalFormRow cozy label='WO' highlight='wo'>
      <SapDocumentPicker
        type='wo'
        hideLabel
        value={side.woNoKanibal}
        onChange={value => onChange('woNoKanibal', value)}
        error={Boolean(sideError('woNoKanibal'))}
        helperText={sideError('woNoKanibal')}
        fieldProps={fieldProps}
      />
    </CannibalFormRow>
    <CannibalFormRow cozy label='WO Status' highlight='wo'>
      <CustomTextField
        {...fieldProps}
        value={side.woStatusKanibal}
        InputProps={{ readOnly: true }}
        {...fieldHelper(sideError('woStatusKanibal'))}
      />
    </CannibalFormRow>
    <CannibalFormRow cozy label='HM Comp' highlight='hm'>
      <CustomTextField
        {...fieldProps}
        type='number'
        value={side.hmComp}
        onChange={e => onChange('hmComp', e.target.value)}
        {...fieldHelper(sideError('hmComp'))}
      />
    </CannibalFormRow>
  </Box>
  )
}

/** Fields copied from REMOVE → INSTALL when set on remove (install stays editable after). */
const SYNC_REMOVE_TO_INSTALL_FIELDS = ['pn', 'compDesc']

const CannibalTransferForm = ({
  transfer,
  projects = [],
  removeEquipments = [],
  installEquipments = [],
  onTransferChange,
  fieldErrors = {}
}) => {
  const handleSide = (sideKey, field, value) => {
    const nextSide = { ...transfer[sideKey], [field]: value }
    if (field === 'unitProjectCode' && value !== transfer[sideKey].unitProjectCode) {
      nextSide.fleetUnitId = ''
    }

    const next = {
      ...transfer,
      [sideKey]: nextSide
    }

    // Mirror PN / Component from remove into install (user can still edit install afterward).
    if (sideKey === 'remove' && SYNC_REMOVE_TO_INSTALL_FIELDS.includes(field)) {
      next.install = { ...next.install, [field]: value }
    }

    onTransferChange(next)
  }

  const handleSidePatch = (sideKey, patch) => {
    const next = {
      ...transfer,
      [sideKey]: { ...transfer[sideKey], ...patch }
    }

    if (sideKey === 'remove') {
      const installSync = {}
      for (const field of SYNC_REMOVE_TO_INSTALL_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(patch, field)) {
          installSync[field] = patch[field]
        }
      }
      if (Object.keys(installSync).length) {
        next.install = { ...next.install, ...installSync }
      }
    }

    onTransferChange(next)
  }

  return (
    <Grid container spacing={3} alignItems='stretch' sx={{ mt: 3 }}>
      <Grid item xs={12} md={5.5}>
        <TransferSideForm
          sideKey='remove'
          side={transfer.remove}
          title='REMOVE FROM'
          subtitle='Taken from unit'
          icon='tabler:arrow-up-right'
          color='warning'
          projects={projects}
          equipments={removeEquipments}
          onChange={(field, value) => handleSide('remove', field, value)}
          onPatch={patch => handleSidePatch('remove', patch)}
          fieldErrors={fieldErrors}
        />
      </Grid>
      <Grid
        item
        xs={12}
        md={1}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: { xs: 0.5, md: 0 } }}
      >
        <Box
          sx={{
            display: 'flex',
            width: 36,
            height: 36,
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: 2,
            transform: { xs: 'rotate(90deg)', md: 'none' }
          }}
        >
          <Icon icon='tabler:arrow-right' fontSize='1.125rem' />
        </Box>
      </Grid>
      <Grid item xs={12} md={5.5}>
        <TransferSideForm
          sideKey='install'
          side={transfer.install}
          title='INSTALL TO'
          subtitle='Installed to unit'
          icon='tabler:arrow-down-left'
          color='success'
          projects={projects}
          equipments={installEquipments}
          onChange={(field, value) => handleSide('install', field, value)}
          onPatch={patch => handleSidePatch('install', patch)}
          fieldErrors={fieldErrors}
        />
      </Grid>
    </Grid>
  )
}

export default CannibalTransferForm
