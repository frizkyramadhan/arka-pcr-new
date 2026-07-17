/**
 * SAP Integration (admin) — histori health check SAP B1 + review selisih status WO/PO vs PCR
 * (sap_health_check_log & sap_reconciliation_log, diisi scripts/sap-health-check.ts &
 * scripts/reconcile-sap-pcr-status.ts). Read-only terhadap SAP; "Mark Reviewed" hanya menandai
 * baris di PCR, tidak menulis balik ke SAP.
 */
import { useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import toast from 'react-hot-toast'

import CustomChip from 'src/@core/components/mui/chip'
import PageHeader from 'src/@core/components/page-header'

import useCan from 'src/hooks/useCan'
import arkaApi from 'src/utils/arka-api'
import { notifyApiError } from 'src/utils/api-error-alert'

const formatDateTime = value => (value ? new Date(value).toLocaleString() : '-')

const SapIntegrationPage = () => {
  const { can } = useCan()
  const isAdmin = can('system.admin')

  const [healthRows, setHealthRows] = useState([])
  const [reconRows, setReconRows] = useState([])
  const [statusFilter, setStatusFilter] = useState('open')
  const [loading, setLoading] = useState(false)
  const [resolvingId, setResolvingId] = useState(null)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await arkaApi.get('/sap/health-status')
      setHealthRows(res.data?.data ?? [])
    } catch (error) {
      await notifyApiError(error, 'Failed to load SAP health history', toast.error)
    }
  }, [])

  const fetchReconciliation = useCallback(async status => {
    setLoading(true)
    try {
      const res = await arkaApi.get('/sap/reconciliation', { params: { status } })
      setReconRows(res.data?.data ?? [])
    } catch (error) {
      await notifyApiError(error, 'Failed to load SAP reconciliation log', toast.error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetchHealth()
  }, [isAdmin, fetchHealth])

  useEffect(() => {
    if (!isAdmin) return
    fetchReconciliation(statusFilter)
  }, [isAdmin, statusFilter, fetchReconciliation])

  const handleResolve = async row => {
    setResolvingId(row.id)
    try {
      await arkaApi.post(`/sap/reconciliation/${row.id}/resolve`)
      toast.success('Marked as reviewed')
      fetchReconciliation(statusFilter)
    } catch (error) {
      await notifyApiError(error, 'Failed to mark as reviewed', toast.error)
    } finally {
      setResolvingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <Grid container spacing={6}>
        <Grid item xs={12}>
          <Typography variant='h5'>Access denied. Admin only.</Typography>
        </Grid>
      </Grid>
    )
  }

  const latestHealth = healthRows[0]

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <PageHeader
          title={<Typography variant='h4'>SAP Integration</Typography>}
          subtitle={
            <Typography sx={{ color: 'text.secondary' }}>
              Health check history &amp; reconciliation status WO/PO SAP vs PCR (read-only)
            </Typography>
          }
        />
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader
            title='Health Check History'
            subheader={
              latestHealth
                ? `Latest: ${latestHealth.isHealthy ? 'Healthy' : 'Unhealthy'} at ${formatDateTime(latestHealth.checkedAt)}`
                : 'No health check recorded yet'
            }
          />
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Checked At</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Latency (ms)</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {healthRows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDateTime(row.checkedAt)}</TableCell>
                    <TableCell>
                      <CustomChip
                        skin='light'
                        size='small'
                        label={row.isHealthy ? 'Healthy' : 'Unhealthy'}
                        color={row.isHealthy ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>{row.latencyMs ?? '-'}</TableCell>
                    <TableCell>{row.errorMessage ?? '-'}</TableCell>
                  </TableRow>
                ))}
                {healthRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align='center'>
                      No data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader title='Reconciliation — WO/PO status SAP vs PCR' />
          <Box sx={{ px: 4 }}>
            <Tabs value={statusFilter} onChange={(_e, value) => setStatusFilter(value)}>
              <Tab value='open' label='Open' />
              <Tab value='resolved' label='Resolved' />
              <Tab value='all' label='All' />
            </Tabs>
          </Box>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Detected At</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>SAP Doc No</TableCell>
                  <TableCell>PCR Status</TableCell>
                  <TableCell>SAP Status</TableCell>
                  <TableCell>Resolved</TableCell>
                  <TableCell align='right'>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reconRows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDateTime(row.detectedAt)}</TableCell>
                    <TableCell>
                      <CustomChip skin='light' size='small' label={row.entityType} color='info' />
                    </TableCell>
                    <TableCell>{row.replacement?.unitNo ?? '-'}</TableCell>
                    <TableCell>{row.sapDocNum}</TableCell>
                    <TableCell>{row.pcrStatus}</TableCell>
                    <TableCell>{row.sapStatus}</TableCell>
                    <TableCell>
                      {row.resolvedAt ? (
                        <CustomChip
                          skin='light'
                          size='small'
                          color='success'
                          label={`${formatDateTime(row.resolvedAt)}${row.resolver?.fullName ? ` — ${row.resolver.fullName}` : ''}`}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align='right'>
                      {!row.resolvedAt && (
                        <Button
                          size='small'
                          variant='outlined'
                          disabled={resolvingId === row.id}
                          onClick={() => handleResolve(row)}
                        >
                          Mark Reviewed
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && reconRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align='center'>
                      No mismatches
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Grid>
    </Grid>
  )
}

SapIntegrationPage.authGuard = true

export default SapIntegrationPage
