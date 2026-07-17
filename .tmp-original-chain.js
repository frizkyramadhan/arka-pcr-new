/**
 * SAP document detail drawer — WO/MR/PR/PO/MI from Service Layer.
 * MR drawer integrates related MI (Delivery) documents in one view.
 */
import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'

import { formatDisplayDate } from 'src/utils/date-format'

import SapDocumentBadge from './SapDocumentBadge'
import {
  fetchSapDocument,
  SAP_DOCUMENT_LABELS,
  statusChipColor
} from './sap-document-utils'

const DetailRow = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1 }}>
    <Typography variant='body2' sx={{ color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontWeight: 600, textAlign: 'right' }}>
      {value ?? '—'}
    </Typography>
  </Box>
)

const RelatedList = ({ title, type, items }) => {
  if (!items?.length) return null

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 1.5 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {items.map(item => (
          <SapDocumentBadge key={`${type}-${item.docNum}`} type={type} docNum={item.docNum} label={item.label} />
        ))}
      </Box>
    </Box>
  )
}

const LineItemsTable = ({ lines, title = 'Line Items' }) => {
  if (!lines?.length) return null

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align='right'>Qty</TableCell>
              <TableCell align='right'>Open</TableCell>
              <TableCell align='right'>Price</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map(line => (
              <TableRow key={line.lineNum}>
                <TableCell>{line.itemCode || '—'}</TableCell>
                <TableCell>{line.itemDescription || '—'}</TableCell>
                <TableCell align='right'>{line.quantity ?? '—'}</TableCell>
                <TableCell align='right'>{line.openQty ?? '—'}</TableCell>
                <TableCell align='right'>
                  {line.price != null ? `${line.currency || ''} ${Number(line.price).toLocaleString('id-ID')}` : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}

const MiDeliverySection = ({ items, detailsByDocNum, loading, focusMiDocNum }) => {
  if (!items?.length) return null

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 0.5 }}>
        Material Issue (Delivery)
      </Typography>
      <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
        Delivery notes linked to this MR
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {items.map((mi, index) => {
          const full = detailsByDocNum?.[mi.docNum]
          const focused = String(focusMiDocNum ?? '') === String(mi.docNum)

          return (
            <Box
              key={`mi-detail-${mi.docNum}`}
              id={`sap-mi-${mi.docNum}`}
              sx={{
                p: 2,
                borderRadius: 1,
                border: theme => `1px solid ${focused ? theme.palette.secondary.main : theme.palette.divider}`,
                boxShadow: focused ? theme => `0 0 0 1px ${theme.palette.secondary.main}33` : 'none',
                bgcolor: 'background.paper'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      minWidth: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'secondary.main',
                      color: 'secondary.contrastText',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Box>
                    <Typography variant='body2' sx={{ fontWeight: 700 }}>
                      MI {mi.docNum}
                    </Typography>
                    <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                      {formatDisplayDate(mi.docDate)}
                    </Typography>
                  </Box>
                </Box>
                <CustomChip
                  rounded
                  skin='light'
                  size='small'
                  color={statusChipColor(mi.docStatusLabel)}
                  label={mi.docStatusLabel || '—'}
                />
              </Box>

              {loading && !full ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                    Loading delivery lines…
                  </Typography>
                </Box>
              ) : null}

              {full ? (
                <>
                  <DetailRow label='WO Ref' value={full.woNo || '—'} />
                  <LineItemsTable lines={full.lines} title='Delivery Lines' />
                </>
              ) : null}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

const renderDocumentBody = (data, type, miDetails, miDetailsLoading, focusMiDocNum) => {
  if (!data) return null

  if (type === 'mi') {
    return (
      <>
        <DetailRow label='Delivery Date' value={formatDisplayDate(data.docDate)} />
        <DetailRow label='WO Ref' value={data.woNo || '—'} />
        <LineItemsTable lines={data.lines} title='Delivery Lines' />
      </>
    )
  }

  if ('subject' in data) {
    return (
      <>
        <DetailRow label='Subject' value={data.subject || '—'} />
        <DetailRow label='WO Date' value={formatDisplayDate(data.woDate)} />
        <DetailRow label='Create Date' value={formatDisplayDate(data.createDate)} />
        <DetailRow label='Close Date' value={formatDisplayDate(data.closeDate)} />
        <RelatedList title='Related MR' type='mr' items={data.relatedMrs} />
      </>
    )
  }

  if ('cardName' in data && 'woNo' in data) {
    return (
      <>
        <DetailRow label='Customer' value={data.cardName || data.cardCode || '—'} />
        <DetailRow label='MR Date' value={formatDisplayDate(data.docDate)} />
        <DetailRow label='Required Date' value={formatDisplayDate(data.docDueDate)} />
        <DetailRow label='WO Ref' value={data.woNo || '—'} />
        <DetailRow label='Project' value={data.project || '—'} />
        <DetailRow label='Unit No' value={data.unitNo || '—'} />
        <DetailRow label='Model No' value={data.modelNo || '—'} />
        <DetailRow label='Serial No' value={data.serialNo || '—'} />
        <DetailRow label='Hour Meter' value={data.hourMeter || '—'} />
        <DetailRow label='Location' value={data.location || '—'} />
        <DetailRow label='Priority' value={data.priority || '—'} />
        <DetailRow label='Close Status' value={data.closeStatus || '—'} />
        <LineItemsTable lines={data.lines} title='MR Line Items' />
        <MiDeliverySection
          items={data.relatedMis}
          detailsByDocNum={miDetails}
          loading={miDetailsLoading}
          focusMiDocNum={focusMiDocNum}
        />
        <RelatedList title='Related PR' type='pr' items={data.relatedPrs} />
      </>
    )
  }

  if ('mrNo' in data) {
    return (
      <>
        <DetailRow label='PR Date' value={formatDisplayDate(data.docDate)} />
        <DetailRow label='Required Date' value={formatDisplayDate(data.requiredDate)} />
        <DetailRow label='MR Ref' value={data.mrNo || '—'} />
        <DetailRow label='Revision' value={data.revision || '—'} />
        <DetailRow label='Exp Status' value={data.expStatus || '—'} />
        <DetailRow label='Expired' value={data.expiredLabel || '—'} />
        <LineItemsTable lines={data.lines} />
        <RelatedList title='Related PO' type='po' items={data.relatedPos} />
      </>
    )
  }

  return (
    <>
      <DetailRow label='Vendor' value={data.cardName || data.cardCode || '—'} />
      <DetailRow label='PO Date' value={formatDisplayDate(data.docDate)} />
      <DetailRow label='Due Date' value={formatDisplayDate(data.docDueDate)} />
      <DetailRow label='Est. Arrival' value={formatDisplayDate(data.estArrival)} />
      <DetailRow label='Required Date' value={formatDisplayDate(data.requiredDate)} />
      <DetailRow label='Exp Status' value={data.expStatus || '—'} />
      <DetailRow label='Expired' value={data.expiredLabel || '—'} />
      <LineItemsTable lines={data.lines} />
    </>
  )
}

const SapDocumentDetailDrawer = ({ open, onClose, type, docNum, focusMiDocNum = null }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [miDetails, setMiDetails] = useState({})
  const [miDetailsLoading, setMiDetailsLoading] = useState(false)

  useEffect(() => {
    if (!open || !type || !docNum) {
      setData(null)
      setError('')
      setMiDetails({})

      return
    }

    const controller = new AbortController()
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const payload = await fetchSapDocument(type, docNum, controller.signal)
        if (!active) return
        setData(payload)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (!active) return
        setData(null)
        setError(err instanceof Error ? err.message : 'Failed to load document')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
      controller.abort()
    }
  }, [open, type, docNum])

  const relatedMis = data?.relatedMis ?? []

  useEffect(() => {
    if (!open || type !== 'mr' || !relatedMis.length) {
      setMiDetails({})
      setMiDetailsLoading(false)

      return
    }

    const controller = new AbortController()
    let active = true

    const loadMiDetails = async () => {
      setMiDetailsLoading(true)

      try {
        const entries = await Promise.all(
          relatedMis.map(async mi => {
            try {
              const detail = await fetchSapDocument('mi', mi.docNum, controller.signal)

              return [mi.docNum, detail]
            } catch {
              return [mi.docNum, null]
            }
          })
        )

        if (!active) return

        setMiDetails(Object.fromEntries(entries.filter(([, detail]) => detail)))
      } finally {
        if (active) setMiDetailsLoading(false)
      }
    }

    loadMiDetails()

    return () => {
      active = false
      controller.abort()
    }
  }, [open, type, relatedMis])

  useEffect(() => {
    if (!open || !focusMiDocNum) return

    const timer = window.setTimeout(() => {
      document.getElementById(`sap-mi-${focusMiDocNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 250)

    return () => window.clearTimeout(timer)
  }, [open, focusMiDocNum, miDetails, loading])

  const drawerTitle = useMemo(() => {
    if (type === 'mr' && focusMiDocNum) {
      return `MR ${docNum} · MI ${focusMiDocNum}`
    }

    return docNum ?? '—'
  }, [docNum, focusMiDocNum, type])

  const drawerLabel = useMemo(() => {
    if (type === 'mr' && data?.relatedMis?.length) {
      return 'Material Request + Delivery'
    }

    return SAP_DOCUMENT_LABELS[type] ?? type?.toUpperCase()
  }, [data?.relatedMis?.length, type])

  const statusLabel = data?.statusLabel ?? data?.docStatusLabel ?? ''

  return (
    <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}>
      <Box sx={{ p: { xs: 3, sm: 4 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='overline' sx={{ color: 'text.secondary' }}>
              SAP {drawerLabel}
            </Typography>
            <Typography variant='h5' sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
              {drawerTitle}
            </Typography>
            {statusLabel ? (
              <CustomChip
                rounded
                skin='light'
                size='small'
                label={statusLabel}
                color={statusChipColor(statusLabel)}
                sx={{ mt: 1.5 }}
              />
            ) : null}
          </Box>
          <IconButton onClick={onClose} aria-label='Close document drawer'>
            <Icon icon='tabler:x' />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={28} />
            </Box>
          ) : null}

          {!loading && error ? (
            <Typography variant='body2' color='error'>
              {error}
            </Typography>
          ) : null}

          {!loading && !error
            ? renderDocumentBody(data, type, miDetails, miDetailsLoading, focusMiDocNum)
            : null}
        </Box>
      </Box>
    </Drawer>
  )
}

export default SapDocumentDetailDrawer
