/**
 * Shared shell for unit detail tab panels — toolbar + compact DataGrid.
 */
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'
import { DataGrid } from '@mui/x-data-grid'

import Link from 'next/link'

import Icon from 'src/@core/components/icon'
import CustomTextField from 'src/@core/components/mui/text-field'

const gridSx = {
  '& .MuiDataGrid-columnHeaders': { borderRadius: 0 },
  '& .MuiDataGrid-cell': { py: 1 }
}

const UnitTabPanelShell = ({
  gridKey,
  title,
  subtitle,
  fullPageHref,
  fullPageLabel = 'Open full page',
  onExport,
  toolbarExtra,
  searchInput,
  onSearchInputChange,
  searchPlaceholder = 'Search all columns…',
  rows,
  columns,
  loading,
  rowCount,
  paginationModel,
  onPaginationModelChange,
  getRowId,
  paginationMode = 'server',
  emptyMessage = 'No records for this unit.',
  noSearchResultsMessage = 'No rows match your search.',
  gridSx: gridSxOverride
}) => {
  const searchActive = Boolean(searchInput?.trim())
  const showEmpty = !loading && rows.length === 0
  const emptyText = searchActive ? noSearchResultsMessage : emptyMessage

  return (
    <Box sx={{ px: { xs: 4, sm: 5 }, py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          mb: 3
        }}
      >
        <Box>
          <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          {toolbarExtra}
          {onExport ? (
            <Button variant='tonal' startIcon={<Icon icon='tabler:download' />} onClick={onExport}>
              Export
            </Button>
          ) : null}
          {fullPageHref ? (
            <Button
              variant='outlined'
              component={Link}
              href={fullPageHref}
              endIcon={<Icon icon='tabler:external-link' />}
            >
              {fullPageLabel}
            </Button>
          ) : null}
        </Box>
      </Box>

      {onSearchInputChange ? (
        <Box sx={{ mb: 3, maxWidth: 360 }}>
          <CustomTextField
            fullWidth
            size='small'
            value={searchInput ?? ''}
            placeholder={searchPlaceholder}
            onChange={event => onSearchInputChange(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position='start'>
                  <Icon icon='tabler:search' fontSize='1.25rem' />
                </InputAdornment>
              ),
              endAdornment: searchInput ? (
                <InputAdornment position='end'>
                  <IconButton size='small' aria-label='Clear search' onClick={() => onSearchInputChange('')}>
                    <Icon icon='tabler:x' fontSize='1.125rem' />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />
        </Box>
      ) : null}

      {showEmpty ? (
        <Typography variant='body2' sx={{ color: 'text.secondary', py: 6, textAlign: 'center' }}>
          {emptyText}
        </Typography>
      ) : (
        <DataGrid
          key={gridKey ?? title}
          autoHeight
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={getRowId}
          rowCount={rowCount}
          paginationMode={paginationMode}
          paginationModel={paginationModel}
          onPaginationModelChange={onPaginationModelChange}
          pageSizeOptions={[10, 25]}
          disableRowSelectionOnClick
          rowHeight={44}
          sx={{ ...gridSx, ...gridSxOverride }}
        />
      )}
    </Box>
  )
}

export default UnitTabPanelShell
