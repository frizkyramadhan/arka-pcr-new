/**
 * Toolbar hour meters — Search Filters (equipment, project, date range, HM unit) + search & actions.
 */
import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'
import { downloadExport } from 'src/utils/export-download'

import HmImportDialog from './HmImportDialog'

const HmTableHeader = ({
  value,
  handleFilter,
  fleetUnitId,
  handleEquipmentChange,
  projectCode,
  handleProjectChange,
  dateFrom,
  handleDateFromChange,
  dateTo,
  handleDateToChange,
  hmUnitMin,
  handleHmUnitMinChange,
  hmUnitMax,
  handleHmUnitMaxChange,
  projects,
  equipments,
  showProjectFilter,
  canEdit,
  canImport,
  exportParams,
  toggle,
  onImport
}) => {
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const handleExport = async () => {
    try {
      await downloadExport('hour-meters', exportParams, 'hour-meters.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadExport('hour-meters/template', {}, 'hour-meter-template.xlsx')
    } catch {
      toast.error('Failed to download template')
    }
  }

  return (
    <Box>
      <CardContent>
        <Typography variant='body2' sx={{ mb: 4, fontWeight: 600, color: 'text.primary' }}>
          Search Filters
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={showProjectFilter ? 6 : 12}>
            <CustomTextField
              select
              fullWidth
              value={fleetUnitId}
              label='Select Equipment'
              SelectProps={{
                displayEmpty: true,
                value: fleetUnitId,
                onChange: e => handleEquipmentChange(e.target.value),
                renderValue: selected => {
                  if (!selected) return 'All equipment'
                  const unit = equipments.find(item => String(item.id) === selected)

                  return unit ? `${unit.unit_no} — ${unit.description}` : selected
                }
              }}
            >
              <MenuItem value=''>All equipment</MenuItem>
              {equipments.map(item => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.unit_no} — {item.description}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          {showProjectFilter ? (
            <Grid item xs={12} sm={6}>
              <CustomTextField
                select
                fullWidth
                value={projectCode}
                label='Select Project'
                SelectProps={{
                  displayEmpty: true,
                  value: projectCode,
                  onChange: e => handleProjectChange(e.target.value),
                  renderValue: selected => {
                    if (!selected) return 'All projects'
                    const project = projects.find(item => item.project_code === selected)

                    return project ? `${project.project_code} - ${project.bowheer}` : selected
                  }
                }}
              >
                <MenuItem value=''>All projects</MenuItem>
                {projects.map(project => (
                  <MenuItem key={project.project_code} value={project.project_code}>
                    {project.project_code} - {project.bowheer}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
          ) : null}
          <Grid item xs={12} sm={6} md={3}>
            <CustomTextField
              fullWidth
              type='date'
              label='Date From'
              value={dateFrom}
              onChange={e => handleDateFromChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <CustomTextField
              fullWidth
              type='date'
              label='Date To'
              value={dateTo}
              onChange={e => handleDateToChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <CustomTextField
              fullWidth
              type='number'
              label='HM Unit Min'
              value={hmUnitMin}
              onChange={e => handleHmUnitMinChange(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <CustomTextField
              fullWidth
              type='number'
              label='HM Unit Max'
              value={hmUnitMax}
              onChange={e => handleHmUnitMaxChange(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
      <Box
        sx={{
          py: 4,
          px: 6,
          rowGap: 2,
          columnGap: 4,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-end'
        }}
      >
        <CustomTextField
          value={value}
          sx={{ mr: 'auto', maxWidth: 280 }}
          placeholder='Search unit no…'
          onChange={e => handleFilter(e.target.value)}
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant='tonal' color='secondary' onClick={handleExport}>
            Export Excel
          </Button>
          {canImport ? (
            <>
              <Button variant='tonal' color='secondary' onClick={handleDownloadTemplate}>
                Template
              </Button>
              <Button variant='tonal' color='secondary' onClick={() => setImportDialogOpen(true)}>
                Import Excel
              </Button>
              <HmImportDialog
                open={importDialogOpen}
                onClose={() => setImportDialogOpen(false)}
                onImport={onImport}
              />
            </>
          ) : null}
          {canEdit ? (
            <Button onClick={toggle} variant='contained' sx={{ '& svg': { mr: 2 } }}>
              <Icon fontSize='1.125rem' icon='tabler:plus' />
              Add Hour Meter
            </Button>
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}

export default HmTableHeader
