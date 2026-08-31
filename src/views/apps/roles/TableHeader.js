// ** MUI Imports
import Box from '@mui/material/Box'

// ** Custom Component Import
import SearchableSelect from 'src/@core/components/mui/searchable-select'
import CustomTextField from 'src/@core/components/mui/text-field'

const TableHeader = props => {
  // ** Props
  const { plan, handlePlanChange, handleFilter, value } = props

  return (
    <Box
      sx={{
        p: 5,
        pb: 3,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        flexDirection: 'row-reverse',
        justifyContent: 'space-between'
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
        <CustomTextField
          value={value}
          sx={{ mr: 4, mb: 2 }}
          placeholder='Search User'
          onChange={e => handleFilter(e.target.value)}
        />
        <SearchableSelect
          value={plan}
          sx={{ mb: 2 }}
          onChange={e => handlePlanChange(e)}
          options={[
            { value: '', label: 'Select Plan' },
            { value: 'basic', label: 'Basic' },
            { value: 'company', label: 'Company' },
            { value: 'enterprise', label: 'Enterprise' },
            { value: 'team', label: 'Team' }
          ]}
        />
      </Box>
    </Box>
  )
}

export default TableHeader
