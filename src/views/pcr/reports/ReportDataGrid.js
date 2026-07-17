/**
 * Report DataGrid wrapper — horizontal scroll with wide column layout.
 * `stickyColumns` pins left columns via CSS sticky.
 * Community DataGrid has no pinnedColumns; column virtualization + render-zone
 * transform must be disabled or sticky cells unmount / detach mid-scroll.
 */
import { useCallback, useEffect, useRef } from 'react'

import Box from '@mui/material/Box'
import { DataGrid } from '@mui/x-data-grid'

export const REPORT_GRID_MIN_WIDTH = 3200

const ReportDataGrid = ({ sx, minWidth = REPORT_GRID_MIN_WIDTH, stickyColumns = false, ...props }) => {
  const rootRef = useRef(null)

  const syncHeaderScroll = useCallback(scroller => {
    const root = rootRef.current
    if (!root || !scroller) return

    const headers = root.querySelector('.MuiDataGrid-columnHeaders')
    const headersInner = root.querySelector('.MuiDataGrid-columnHeadersInner')
    const renderZone = root.querySelector('.MuiDataGrid-virtualScrollerRenderZone')

    if (headersInner) headersInner.style.transform = 'none'
    if (renderZone) renderZone.style.transform = 'none'
    if (headers) headers.scrollLeft = scroller.scrollLeft
  }, [])

  useEffect(() => {
    if (!stickyColumns) return undefined

    const root = rootRef.current
    if (!root) return undefined

    const onScroll = event => {
      const scroller = event.target
      if (!(scroller instanceof HTMLElement)) return
      if (!scroller.classList.contains('MuiDataGrid-virtualScroller')) return
      syncHeaderScroll(scroller)
    }

    root.addEventListener('scroll', onScroll, true)

    const scroller = root.querySelector('.MuiDataGrid-virtualScroller')
    if (scroller) syncHeaderScroll(scroller)

    return () => root.removeEventListener('scroll', onScroll, true)
  }, [stickyColumns, syncHeaderScroll, props.rows, props.loading, props.columns])

  return (
    <Box
      ref={rootRef}
      sx={{
        width: '100%',
        ...(stickyColumns
          ? {
              overflow: 'hidden',
              '& .MuiDataGrid-columnHeaders': {
                overflow: 'hidden !important'
              },
              '& .MuiDataGrid-columnHeadersInner, & .MuiDataGrid-virtualScrollerRenderZone': {
                transform: 'none !important'
              },
              '& .MuiDataGrid-virtualScroller': {
                overflowX: 'auto !important'
              },
              '& .MuiDataGrid-virtualScrollerContent, & .MuiDataGrid-columnHeadersInner': {
                minWidth: `${minWidth}px !important`
              }
            }
          : {
              overflowX: 'auto'
            }),
        '& .MuiDataGrid-columnHeaders': {
          borderRadius: 0
        }
      }}
    >
      <DataGrid
        autoHeight
        disableRowSelectionOnClick
        {...props}
        disableVirtualization={stickyColumns || props.disableVirtualization}
        sx={{
          ...(stickyColumns ? { width: '100%', minWidth: 0 } : { minWidth }),
          border: 0,
          '& .MuiDataGrid-cell': {
            whiteSpace: 'nowrap'
          },
          ...sx
        }}
      />
    </Box>
  )
}

export default ReportDataGrid
