/**
 * SAP document detail drawer — WO/MR/PR/PO/MI from Service Layer.
 * MR drawer integrates related MI (Delivery) documents in one view.
 */
import { useEffect, useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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
  formatDocNumLabel,
  formatSapMoney,
  getReferenceLabels,
  hasDocNumValue,
  normalizeDocNumValue,
  SAP_DOCUMENT_LABELS,
  statusChipColor,
  toFriendlySapErrorMessage
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
          <SapDocumentBadge
            key={`${type}-${item.docNum}`}
            type={type}
            docNum={item.docNum}
            label={type === 'mr' ? undefined : item.label}
          />
        ))}
      </Box>
    </Box>
  )
}

const lineTableShellSx = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'background.paper'
}

const lineTableScrollSx = {
  width: '100%',
  maxWidth: '100%',
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch'
}

const lineTableHeaderCellSx = {
  fontWeight: 700,
  fontSize: '0.75rem',
  color: 'text.secondary',
  bgcolor: 'action.hover',
  borderBottom: 1,
  borderColor: 'divider',
  py: 1,
  px: 1.5,
  whiteSpace: 'nowrap'
}

const lineTableBodyCellSx = {
  fontSize: '0.8125rem',
  py: 1.25,
  px: 1.5,
  borderBottom: 1,
  borderColor: 'divider',
  verticalAlign: 'top'
}

const LineItemsTable = ({ lines, title = 'Line Items', showPrice = false, showLineRemarks = false }) => {
  if (!lines?.length) return null

  const tableMinWidth = showPrice ? 720 : 560

  return (
    <Box sx={{ mt: 2, width: '100%', maxWidth: '100%' }}>
      <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ ...lineTableScrollSx, ...lineTableShellSx }}>
        <Table size='small' sx={{ minWidth: tableMinWidth, width: 'max-content' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...lineTableHeaderCellSx, minWidth: 140 }}>Item No</TableCell>
              <TableCell sx={{ ...lineTableHeaderCellSx, minWidth: 220 }}>Description</TableCell>
              <TableCell align='right' sx={{ ...lineTableHeaderCellSx, minWidth: 72 }}>
                Qty
              </TableCell>
              <TableCell sx={{ ...lineTableHeaderCellSx, minWidth: 72 }}>UoM</TableCell>
              {showPrice ? (
                <TableCell align='right' sx={{ ...lineTableHeaderCellSx, minWidth: 120 }}>
                  Price
                </TableCell>
              ) : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow
                key={line.lineNum ?? index}
                sx={{
                  '&:last-child td': { borderBottom: 0 },
                  bgcolor: index % 2 === 1 ? 'action.hover' : 'transparent'
                }}
              >
                <TableCell sx={{ ...lineTableBodyCellSx, fontWeight: 600, wordBreak: 'break-word' }}>
                  {line.itemCode || '—'}
                </TableCell>
                <TableCell sx={{ ...lineTableBodyCellSx, wordBreak: 'break-word' }}>
                  <Typography variant='body2' sx={{ fontSize: 'inherit' }}>
                    {line.itemDescription || '—'}
                  </Typography>
                  {showLineRemarks && line.lineRemarks ? (
                    <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                      {line.lineRemarks}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell align='right' sx={{ ...lineTableBodyCellSx, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {line.quantity ?? '—'}
                </TableCell>
                <TableCell sx={{ ...lineTableBodyCellSx, whiteSpace: 'nowrap' }}>{line.uom || '—'}</TableCell>
                {showPrice ? (
                  <TableCell align='right' sx={{ ...lineTableBodyCellSx, whiteSpace: 'nowrap' }}>
                    {line.price != null
                      ? `${line.currency || ''} ${Number(line.price).toLocaleString('id-ID')}`.trim()
                      : '—'}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}

const MiDetailBody = ({ data }) => (
  <>
    <DetailRow label='WO Ref' value={data.woNo || '—'} />
    <DetailRow label='BA Old Core No' value={data.baOldCoreNo || '—'} />
    <DetailRow label='Remarks' value={data.remarks || '—'} />
    <LineItemsTable lines={data.lines} title='Line Items' />
    <Box sx={{ mt: 3 }}>
      <DetailRow label='Issued By' value={data.issuedBy || '—'} />
      <DetailRow label='Acknowledge By' value={data.acknowledgeBy || '—'} />
      <DetailRow label='Approved By' value={data.approvedBy || '—'} />
    </Box>
  </>
)

const MiDeliverySection = ({ items, detailsByDocNum, loading, focusMiDocNum }) => {
  if (!items?.length) return null

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant='subtitle2' sx={{ fontWeight: 700, mb: 0.5 }}>
        Material Issue
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
                      {formatDocNumLabel('mi', mi.docNum)}
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

              {full ? <MiDetailBody data={full} /> : null}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

const renderDocumentBody = (data, type, miDetails, miDetailsLoading, focusMiDocNum) => {
  if (!data) return null

  if (type === 'wo') {
    return (
      <>
        <DetailRow label='Subject' value={data.subject || '—'} />
        <DetailRow label='WO Status' value={data.statusLabel || '—'} />
        <DetailRow label='WO Date' value={formatDisplayDate(data.woDate)} />
        <DetailRow label='Create Date' value={formatDisplayDate(data.createDate)} />
        <DetailRow label='Close Date' value={formatDisplayDate(data.closeDate)} />
        <DetailRow label='Unit Code' value={data.unitNo || '—'} />
        <DetailRow label='Hour Meter' value={data.hourMeter || '—'} />
        <DetailRow label='Unit Model' value={data.modelNo || '—'} />
        <DetailRow label='Serial No' value={data.serialNo || '—'} />
        <DetailRow label='Project' value={data.project || '—'} />
        <DetailRow label='Job Code' value={data.jobCode || '—'} />
        <DetailRow label='Component' value={data.componentNo || '—'} />
        <DetailRow label='Sub Component' value={data.subComponentNo || '—'} />
        <DetailRow label='Damage' value={data.damageCode || '—'} />
        <DetailRow label='Cause' value={data.failCauseCode || '—'} />
        <DetailRow
          label='Malfunction Start'
          value={`${formatDisplayDate(data.malStartDate)} ${data.malStartTime ?? ''}`.trim() || '—'}
        />
        <RelatedList title='Related MR' type='mr' items={data.relatedMrs} />
      </>
    )
  }

  if (type === 'mr') {
    return (
      <>
        <DetailRow label='MR Date' value={formatDisplayDate(data.docDate)} />
        <DetailRow label='Required Date' value={formatDisplayDate(data.docDueDate)} />
        <DetailRow label='WO Ref' value={data.woNo || '—'} />
        <DetailRow label='Project' value={data.project || '—'} />
        <DetailRow label='Unit No' value={data.unitNo || '—'} />
        <DetailRow label='Model No' value={data.modelNo || '—'} />
        <DetailRow label='Serial No' value={data.serialNo || '—'} />
        <DetailRow label='Hour Meter' value={data.hourMeter || '—'} />
        <DetailRow label='Location' value={data.location || '—'} />
        <DetailRow label='Priority' value={data.priorityLabel || data.priority || '—'} />
        <DetailRow label='Job Category' value={data.jobCategoryLabel || data.jobCategory || '—'} />
        <DetailRow label='Remarks' value={data.remarks || '—'} />
        <LineItemsTable lines={data.lines} title='Line Items' />
        <Box sx={{ mt: 3 }}>
          <DetailRow label='RPL By' value={data.rplBy || '—'} />
          <DetailRow label='Checked By' value={data.checkedBy || '—'} />
          <DetailRow label='Acknowledge By' value={data.acknowledgeBy || '—'} />
          <DetailRow label='Received By' value={data.receivedBy || '—'} />
          <DetailRow label='MR Prepared By' value={data.mrPreparedBy || '—'} />
        </Box>
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

  if (type === 'pr') {
    return (
      <>
        <DetailRow label='PR Date' value={formatDisplayDate(data.docDate)} />
        <DetailRow label='Generated Date' value={formatDisplayDate(data.createDate)} />
        <DetailRow label='Required Date' value={formatDisplayDate(data.requiredDate)} />
        <DetailRow label='MR Ref' value={data.mrNo || '—'} />
        <DetailRow label='WO Ref' value={data.woNo || '—'} />
        <DetailRow label='Unit No' value={data.unitNo || '—'} />
        <DetailRow label='Hour Meter' value={data.hourMeter || '—'} />
        <DetailRow label='Priority' value={data.priorityLabel || data.priority || '—'} />
        <DetailRow label='PR Rev No' value={data.revision || '—'} />
        <DetailRow label='Closed Status' value={data.expStatus || '—'} />
        <DetailRow label='Requestor' value={data.requestor || '—'} />
        <DetailRow label='GOL Number' value={data.golNo || '—'} />
        <DetailRow label='GR Number' value={data.grNo || '—'} />
        <DetailRow label='Remarks' value={data.remarks || '—'} />
        <LineItemsTable lines={data.lines} showLineRemarks />
        <Box sx={{ mt: 3 }}>
          <DetailRow label='Prepared By' value={data.preparedBy || '—'} />
          <DetailRow label='Approved By' value={data.approvedBy || '—'} />
          <DetailRow label='Approved By 2' value={data.approvedBy2 || '—'} />
        </Box>
        <RelatedList title='Related PO' type='po' items={data.relatedPos} />
      </>
    )
  }

  if (type === 'po') {
    return (
      <>
        <DetailRow label='Vendor' value={data.cardName || data.cardCode || '—'} />
        <DetailRow label='PO Date' value={formatDisplayDate(data.docDate)} />
        <DetailRow label='Due Date' value={formatDisplayDate(data.docDueDate)} />
        <DetailRow label='ETA' value={formatDisplayDate(data.estArrival)} />
        <DetailRow label='Required Date' value={formatDisplayDate(data.requiredDate)} />
        <DetailRow label='WO Ref' value={data.woNo || '—'} />
        <DetailRow label='MR Ref' value={data.mrNo || '—'} />
        <DetailRow label='PR Ref' value={data.prNo || '—'} />
        <DetailRow label='Unit No' value={data.unitNo || '—'} />
        <DetailRow label='Buyer' value={data.buyer || '—'} />
        <DetailRow label='Budget Type' value={data.budgetType || '—'} />
        <DetailRow label='Order Type' value={data.orderType || '—'} />
        <DetailRow label='PO Rev No' value={data.poRevNo || '—'} />
        <DetailRow label='PO Delivery Status' value={data.deliveryStatusLabel || data.deliveryStatus || '—'} />
        <DetailRow label='PO Delivery Time' value={formatDisplayDate(data.deliveryTime)} />
        <DetailRow label='Cost Center' value={data.costCenterLabel || data.costCenter || '—'} />
        <DetailRow label='Lead Time (days)' value={data.leadTime ?? '—'} />
        <DetailRow label='Valid To' value={formatDisplayDate(data.validTo)} />
        <DetailRow label='Closed Status' value={data.expStatus || '—'} />
        <DetailRow label='Remarks' value={data.remarks || '—'} />
        <LineItemsTable lines={data.lines} showPrice showLineRemarks />
        <Box sx={{ mt: 2, p: 2, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 1 }}>
            Payment Summary
          </Typography>
          <DetailRow label='Total Before Discount' value={formatSapMoney(data.totalBeforeDiscount, data.docCurrency)} />
          <DetailRow
            label='Discount'
            value={
              data.totalDiscount != null && Number(data.totalDiscount) > 0
                ? `${formatSapMoney(data.totalDiscount, data.docCurrency)}${
                    data.discountPercent != null ? ` (${data.discountPercent}%)` : ''
                  }`
                : '—'
            }
          />
          <DetailRow label='Tax' value={formatSapMoney(data.taxAmount, data.docCurrency)} />
          <DetailRow label='Total Payment Due' value={formatSapMoney(data.totalPaymentDue, data.docCurrency)} />
        </Box>
        <Box sx={{ mt: 3 }}>
          <DetailRow label='Prepared By' value={data.preparedBy || '—'} />
          <DetailRow label='Approved By' value={data.approvedBy || '—'} />
        </Box>
      </>
    )
  }

  if (type === 'mi') {
    return (
      <>
        <DetailRow label='Delivery Date' value={formatDisplayDate(data.docDate)} />
        <MiDetailBody data={data} />
      </>
    )
  }

  return null
}

const BA_REFERENCE_FIELD = { mr: 'mrNo', pr: 'prNo', po: 'poNo' }
const BA_REFERENCE_LABEL = { mr: 'MR#', pr: 'PR#', po: 'PO#' }

/** Footer action — set or remove opened MR/PR/PO as the single BA reference for that document type. */
const BaReferenceAction = ({
  type,
  docNum,
  baReference,
  canSetBaReference,
  onSetBaReference,
  onRemoveBaReference,
  referenceScope = 'ba'
}) => {
  const [saving, setSaving] = useState(false)
  const { prefix } = getReferenceLabels(referenceScope)

  if (!canSetBaReference || !['mr', 'pr', 'po'].includes(type) || !hasDocNumValue(docNum)) {
    return null
  }

  const field = BA_REFERENCE_FIELD[type]
  const currentValue = baReference?.[field]
  const isCurrent = normalizeDocNumValue(currentValue) === normalizeDocNumValue(docNum)

  const handleSet = async () => {
    if (!onSetBaReference || isCurrent) return

    if (hasDocNumValue(currentValue) && !isCurrent) {
      const confirmed = window.confirm(
        `Replace current ${prefix} ${BA_REFERENCE_LABEL[type]} (${currentValue}) with ${formatDocNumLabel(type, docNum)}?`
      )
      if (!confirmed) return
    }

    setSaving(true)
    try {
      await onSetBaReference(type, docNum)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!onRemoveBaReference || !isCurrent) return

    const confirmed = window.confirm(
      `Remove ${formatDocNumLabel(type, currentValue)} from ${prefix} ${BA_REFERENCE_LABEL[type]} reference?`
    )
    if (!confirmed) return

    setSaving(true)
    try {
      await onRemoveBaReference(type)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Button
        fullWidth
        variant={isCurrent ? 'tonal' : 'contained'}
        color={isCurrent ? 'success' : 'primary'}
        disabled={isCurrent || saving}
        startIcon={<Icon icon={isCurrent ? 'tabler:check' : 'tabler:link'} />}
        onClick={handleSet}
      >
        {isCurrent ? `Current ${prefix} ${BA_REFERENCE_LABEL[type]}` : `Set as ${prefix} ${BA_REFERENCE_LABEL[type]}`}
      </Button>
      {isCurrent ? (
        <Button
          fullWidth
          variant='outlined'
          color='error'
          disabled={saving}
          startIcon={<Icon icon='tabler:link-off' />}
          onClick={handleRemove}
        >
          {`Remove ${prefix} ${BA_REFERENCE_LABEL[type]}`}
        </Button>
      ) : null}
    </Box>
  )
}

const SapDocumentDetailDrawer = ({
  open,
  onClose,
  type,
  docNum,
  focusMiDocNum = null,
  baReference = null,
  canSetBaReference = false,
  onSetBaReference = null,
  onRemoveBaReference = null,
  referenceScope = 'ba'
}) => {
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
        setError(toFriendlySapErrorMessage(err, 'Failed to load SAP document.'))
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
  const relatedMiKey = useMemo(() => relatedMis.map(mi => mi.docNum).join(','), [relatedMis])

  useEffect(() => {
    if (!open || type !== 'mr' || !relatedMiKey) {
      setMiDetails({})
      setMiDetailsLoading(false)

      return
    }

    const miDocNums = relatedMiKey.split(',').filter(Boolean)
    const controller = new AbortController()
    let active = true

    const loadMiDetails = async () => {
      setMiDetailsLoading(true)

      try {
        const entries = await Promise.all(
          miDocNums.map(async docNum => {
            try {
              const detail = await fetchSapDocument('mi', docNum, controller.signal)

              return [Number(docNum), detail]
            } catch {
              return [Number(docNum), null]
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
  }, [open, type, relatedMiKey])

  useEffect(() => {
    if (!open || !focusMiDocNum) return

    const timer = window.setTimeout(() => {
      document.getElementById(`sap-mi-${focusMiDocNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 250)

    return () => window.clearTimeout(timer)
  }, [open, focusMiDocNum, miDetails, loading])

  const drawerTitle = useMemo(() => {
    if (type === 'mr' && focusMiDocNum) {
      return `${formatDocNumLabel('mr', docNum)} · ${formatDocNumLabel('mi', focusMiDocNum)}`
    }

    return formatDocNumLabel(type, docNum)
  }, [docNum, focusMiDocNum, type])

  const drawerLabel = useMemo(() => {
    if (type === 'mr' && data?.relatedMis?.length) {
      return 'Material Request + Material Issue'
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

          {!loading && !error ? renderDocumentBody(data, type, miDetails, miDetailsLoading, focusMiDocNum) : null}
        </Box>

        {!loading && !error && canSetBaReference && ['mr', 'pr', 'po'].includes(type) ? (
          <Box sx={{ pt: 2, mt: 2, borderTop: 1, borderColor: 'divider' }}>
            <BaReferenceAction
              type={type}
              docNum={docNum}
              baReference={baReference}
              canSetBaReference={canSetBaReference}
              onSetBaReference={onSetBaReference}
              onRemoveBaReference={onRemoveBaReference}
              referenceScope={referenceScope}
            />
          </Box>
        ) : null}
      </Box>
    </Drawer>
  )
}

export default SapDocumentDetailDrawer
