// ** MUI Imports
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomTextField from 'src/@core/components/mui/text-field'
import Icon from 'src/@core/components/icon'
import { formatPermissionModuleLabel } from 'src/utils/permission-groups'

/**
 * Toolbar role list — layout sama dengan user list (Search Filters + search/add).
 */
const TableHeader = props => {
  const {
    value,
    moduleFilter,
    statusFilter,
    modules,
    handleFilter,
    handleModuleChange,
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
            <SearchableSelect
              fullWidth
              value={moduleFilter}
              label='Select Module'
              onChange={e => handleModuleChange(e.target.value)}
              options={[
                { value: '', label: 'Select Module' },
                ...modules.map(moduleKey => ({
                  value: moduleKey,
                  label: formatPermissionModuleLabel(moduleKey)
                }))
              ]}
            />
          </Grid>
          <Grid item xs={12} sm={4} />
          <Grid item xs={12} sm={4}>
            <SearchableSelect
              fullWidth
              value={statusFilter}
              label='Select Status'
              onChange={e => handleStatusChange(e.target.value)}
              options={[
                { value: '', label: 'Select Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
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
          sx={{ mr: 4 }}
          placeholder='Search Role'
          onChange={e => handleFilter(e.target.value)}
        />
        <Button onClick={toggle} variant='contained' sx={{ '& svg': { mr: 2 } }}>
          <Icon fontSize='1.125rem' icon='tabler:plus' />
          Add New Role
        </Button>
      </Box>
    </Box>
  )
}

export default TableHeader
