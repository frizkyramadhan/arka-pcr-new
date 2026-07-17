/**
 * Cannibal operational panels — approval backlog + recent open BA.
 */

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from 'src/@core/components/mui/chip'
import { CANNIBAL_APPROVAL_LEVEL_ORDER } from 'src/utils/approval-registry'

const statusColor = status => {
  if (status === 'APPROVED' || status === 'CLOSED') return 'success'
  if (status === 'REJECTED' || status === 'CANCELLED') return 'error'
  if (status === 'SUBMITTED' || status === 'OPEN') return 'warning'
  if (status === 'PENDING_LOGISTICS') return 'info'

  return 'secondary'
}

/**
 * @param {{
 *   loading?: boolean
 *   stats: object | null
 * }} props
 */
const CannibalOperationalPanels = ({ loading = false, stats }) => {
  const levels = CANNIBAL_APPROVAL_LEVEL_ORDER
  const awaiting = stats?.cannibalAwaitingApproval ?? 0
  const recent = stats?.recentOpen ?? []

  return (
    <>
      <Grid item xs={12} md={5}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 4 }}>
              Pending Approvals by Level
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
              {levels.map(level => (
                <CustomChip
                  key={level}
                  rounded
                  skin='light'
                  color='warning'
                  label={`${level}: ${stats?.pendingBaApprovals?.[level] ?? 0}`}
                />
              ))}
              <CustomChip rounded skin='light' color='secondary' label={`Awaiting: ${awaiting}`} />
            </Box>
            <Button component={Link} href='/cannibals-approvals' variant='tonal' size='small'>
              Open Approval Queue
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={7}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant='h6' sx={{ mb: 4 }}>
              Recent Active BA
            </Typography>
            {recent.length === 0 ? (
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                {loading ? 'Loading…' : 'No active cannibal BA found'}
              </Typography>
            ) : (
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>BA No</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Posting</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recent.map(row => (
                    <TableRow key={row.idBa} hover>
                      <TableCell>
                        <Typography
                          component={Link}
                          href={`/cannibals/${row.idBa}`}
                          variant='body2'
                          sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}
                        >
                          {row.noBa || `#${row.idBa}`}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.projectCode}</TableCell>
                      <TableCell>{row.postingDate || '—'}</TableCell>
                      <TableCell>
                        <CustomChip
                          rounded
                          skin='light'
                          size='small'
                          color={statusColor(row.statusBa)}
                          label={row.statusBa}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Button component={Link} href='/cannibals' variant='tonal' size='small' sx={{ mt: 4 }}>
              View All Cannibals
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </>
  )
}

export default CannibalOperationalPanels
