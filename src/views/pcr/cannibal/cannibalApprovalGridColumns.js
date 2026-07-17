/**
 * DataGrid columns for cannibal BA approval queue — selaras dengan cannibal list.
 */
import Box from '@mui/material/Box'

import TableRowActions from 'src/@core/components/table-row-actions'

import { buildCannibalDataColumns } from 'src/views/pcr/cannibal/cannibalGridColumns'
import { getLatestCannibalApprovalRemark } from 'src/utils/cannibal-approval-workflow'

export function buildCannibalApprovalGridColumns({ onReview }) {
  return [
    ...buildCannibalDataColumns(),
    {
      flex: 0.16,
      minWidth: 160,
      field: 'approvalRemark',
      headerName: 'Note / Remarks',
      sortable: false,
      valueGetter: ({ row }) => {
        const remark = getLatestCannibalApprovalRemark(row)

        return remark || '—'
      }
    },
    {
      flex: 0.18,
      minWidth: 200,
      sortable: false,
      field: 'actions',
      headerName: 'Action',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TableRowActions
            buttonSize='medium'
            actions={[
              {
                key: 'review',
                label: 'Review Approval',
                onClick: () => onReview(row)
              }
            ]}
          />
        </Box>
      )
    }
  ]
}
