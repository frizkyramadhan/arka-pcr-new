/**

 * Filter bar for PCR forecast approval queue.

 */

import Box from '@mui/material/Box'

import MenuItem from '@mui/material/MenuItem'



import CustomTextField from 'src/@core/components/mui/text-field'

import {

  FORECAST_APPROVAL_STAGE_FILTER_OPTIONS,

  FORECAST_BA_PCR_STATUS_FILTER_OPTIONS

} from 'src/utils/forecast-approval-workflow'



const QUARTER_OPTIONS = ['', 'Q1', 'Q2', 'Q3', 'Q4']



const ForecastApprovalTableHeader = ({ filters, onFilterChange, projects, showProjectFilter }) => {

  return (

    <Box

      sx={{

        py: 4,

        px: 6,

        display: 'flex',

        flexWrap: 'wrap',

        gap: 3,

        alignItems: 'center'

      }}

    >

      <CustomTextField

        label='Unit No.'

        value={filters.unitNo}

        onChange={e => onFilterChange('unitNo', e.target.value)}

        sx={{ minWidth: 120 }}

      />

      <CustomTextField

        select

        label='Quarter'

        value={filters.quarter}

        onChange={e => onFilterChange('quarter', e.target.value)}

        sx={{ minWidth: 110 }}

      >

        {QUARTER_OPTIONS.map(q => (

          <MenuItem key={q || 'all'} value={q}>

            {q || 'All'}

          </MenuItem>

        ))}

      </CustomTextField>

      <CustomTextField

        select

        label='Status BA PCR'

        value={filters.baPcrStatus}

        onChange={e => onFilterChange('baPcrStatus', e.target.value)}

        sx={{ minWidth: 150 }}

      >

        {FORECAST_BA_PCR_STATUS_FILTER_OPTIONS.map(option => (

          <MenuItem key={option.value} value={option.value}>

            {option.label}

          </MenuItem>

        ))}

      </CustomTextField>

      <CustomTextField

        select

        label='Approval Stage'

        value={filters.statusBaPcr}

        onChange={e => onFilterChange('statusBaPcr', e.target.value)}

        sx={{ minWidth: 220 }}

      >

        {FORECAST_APPROVAL_STAGE_FILTER_OPTIONS.map(option => (

          <MenuItem key={option.value || 'all'} value={option.value}>

            {option.label}

          </MenuItem>

        ))}

      </CustomTextField>

      {showProjectFilter ? (

        <CustomTextField

          select

          label='Site'

          value={filters.projectCode}

          onChange={e => onFilterChange('projectCode', e.target.value)}

          sx={{ minWidth: 120 }}

        >

          <MenuItem value=''>All sites</MenuItem>

          {projects.map(project => (

            <MenuItem key={project.project_code} value={project.project_code}>

              {project.project_code}

            </MenuItem>

          ))}

        </CustomTextField>

      ) : null}

      <CustomTextField

        type='month'

        label='Plan Period'

        value={filters.planMonth}

        onChange={e => onFilterChange('planMonth', e.target.value)}

        InputLabelProps={{ shrink: true }}

        sx={{ minWidth: 160 }}

      />

    </Box>

  )

}



export default ForecastApprovalTableHeader


