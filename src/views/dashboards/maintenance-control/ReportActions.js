/**
 * Output buttons for the Maintenance Control dashboard (spec section 14), using the active filters:
 * - Export Excel: GET /api/exports/maintenance-control (KPI summary, monthly trend, every detail list).
 * - Print / PDF: opens the print-friendly management report in a new tab; the browser saves it as PDF.
 */
import { useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Tooltip from '@mui/material/Tooltip'
import toast from 'react-hot-toast'

import Icon from 'src/@core/components/icon'
import { withBasePath } from 'src/utils/base-path'
import { downloadExport } from 'src/utils/export-download'

import { filtersToApiParams, filtersToQuery } from './FilterBar'

const ReportActions = ({ filters, disabled }) => {
  const [exporting, setExporting] = useState(false)

  const exportExcel = async () => {
    setExporting(true)
    try {
      const site = filters.projectId ? `-${filters.projectId}` : ''
      await downloadExport(
        'maintenance-control',
        { ...filtersToApiParams(filters), tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
        `maintenance-control-${filters.period}-${filters.mode}${site}.xlsx`
      )
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const openPrint = () => {
    const query = new URLSearchParams(filtersToQuery(filters)).toString()
    window.open(withBasePath(`/dashboards/maintenance-control/print/?${query}`), '_blank', 'noopener')
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <Tooltip title='KPI summary, monthly trend, and every detail list for the current filter' arrow>
        <span>
          <Button
            variant='tonal'
            color='success'
            disabled={disabled || exporting}
            onClick={exportExcel}
            startIcon={exporting ? <CircularProgress size={16} color='inherit' /> : <Icon icon='tabler:file-spreadsheet' />}
          >
            Export Excel
          </Button>
        </span>
      </Tooltip>
      <Tooltip title='Management report for printing or Save as PDF (A4 landscape)' arrow>
        <span>
          <Button variant='tonal' disabled={disabled} onClick={openPrint} startIcon={<Icon icon='tabler:printer' />}>
            Print / PDF
          </Button>
        </span>
      </Tooltip>
    </Box>
  )
}

export default ReportActions
