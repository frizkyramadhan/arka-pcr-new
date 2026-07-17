// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'

// ** Custom Component Import
import CustomTextField from 'src/@core/components/mui/text-field'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

/**
 * Toolbar user list — dua baris seperti template Vuexy: Search Filters + Search/Add.
 */
const TableHeader = props => {
  const {
    value,
    roleFilter,
    projectFilter,
    statusFilter,
    roles,
    projects,
    handleFilter,
    handleRoleChange,
    handleProjectChange,
    handleStatusChange,
    toggle
  } = props

  return (
    <Box>
      <CardContent>
        <Typography variant='body2' sx={{ mb: 4, fontWeight: 600, color: 'text.primary' }}>
          Search Filters
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              select
              fullWidth
              value={roleFilter}
              label='Select Role'
              SelectProps={{
                displayEmpty: true,
                value: roleFilter,
                onChange: e => handleRoleChange(e.target.value),
                renderValue: selected => selected || 'Select Role'
              }}
            >
              <MenuItem value=''>Select Role</MenuItem>
              {roles.map(role => (
                <MenuItem key={role.idRole} value={role.name}>
                  {role.name}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              select
              fullWidth
              value={projectFilter}
              label='Select Project'
              SelectProps={{
                displayEmpty: true,
                value: projectFilter,
                onChange: e => handleProjectChange(e.target.value),
                renderValue: selected => {
                  if (!selected) return 'Select Project'
                  const project = projects.find(item => item.project_code === selected)

                  return project ? `${project.project_code} - ${project.bowheer}` : selected
                }
              }}
            >
              <MenuItem value=''>Select Project</MenuItem>
              {projects.map(project => (
                <MenuItem key={project.project_code} value={project.project_code}>
                  {project.project_code} - {project.bowheer}
                </MenuItem>
              ))}
            </CustomTextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <CustomTextField
              select
              fullWidth
              value={statusFilter}
              label='Select Status'
              SelectProps={{
                displayEmpty: true,
                value: statusFilter,
                onChange: e => handleStatusChange(e.target.value),
                renderValue: selected => {
                  if (!selected) return 'Select Status'
                  if (selected === 'active') return 'Active'
                  if (selected === 'inactive') return 'Inactive'

                  return selected
                }
              }}
            >
              <MenuItem value=''>Select Status</MenuItem>
              <MenuItem value='active'>Active</MenuItem>
              <MenuItem value='inactive'>Inactive</MenuItem>
            </CustomTextField>
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
          sx={{ mr: 4 }}
          placeholder='Search User'
          onChange={e => handleFilter(e.target.value)}
        />
        <Button onClick={toggle} variant='contained' sx={{ '& svg': { mr: 2 } }}>
          <Icon fontSize='1.125rem' icon='tabler:plus' />
          Add New User
        </Button>
      </Box>
    </Box>
  )
}

export default TableHeader
