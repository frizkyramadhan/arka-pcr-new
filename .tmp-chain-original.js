/**
 * SAP document chain — responsive WO → MR/MI → PR → PO flow.
 * MR and MI share one combined card and one integrated drawer view.
 */
import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'

import Icon from 'src/@core/components/icon'
import CustomChip from 'src/@core/components/mui/chip'

import { formatDisplayDate } from 'src/utils/date-format'

import SapDocumentDetailDrawer from './SapDocumentDetailDrawer'
import {
  fetchSapDocumentChain,
  hasDocNumValue,
  normalizeDocNumValue,
  SAP_DOCUMENT_SHORT_LABELS,
  statusChipColor
} from './sap-document-utils'

const COLUMN_META = {
  wo: { color: 'info', icon: 'tabler:tool' },
  mr: { color: 'primary', icon: 'tabler:file-invoice' },
  pr: { color: 'warning', icon: 'tabler:clipboard-list' },
  po: { color: 'success', icon: 'tabler:shopping-cart' }
}

const GRID_COLUMNS = 'repeat(4, minmax(0, 1fr))'

const KanbanColumnHeader = ({ type, count, label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25, px: 0.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      <Icon icon={COLUMN_META[type].icon} fontSize='1rem' />
      <Typography variant='caption' sx={{ fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {label ?? SAP_DOCUMENT_SHORT_LABELS[type]}
      </Typography>
    </Box>
    <CustomChip rounded skin='light' size='small' color={COLUMN_META[type].color} label={count} />
  </Box>
)

const MobileStepLabel = ({ label, color = 'text.secondary' }) => (
  <Typography
    variant='caption'
    sx={{
      display: { xs: 'flex', md: 'none' },
      alignItems: 'center',
      gap: 0.5,
      color,
      fontWeight: 700,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      mb: 0.75
    }}
  >
    {label}
  </Typography>
)

const FlowArrow = () => (
  <Box
    sx={{
      display: { xs: 'flex', md: 'none' },
      justifyContent: 'center',
      py: 0.25,
      color: 'text.disabled'
    }}
  >
    <Icon icon='tabler:arrow-down' fontSize='1rem' />
  </Box>
)

const ExpiredBadge = ({ label }) => {
  if (!label) return null

  return (
    <CustomChip
      rounded
      skin='light'
      size='small'
      color='error'
      label={label}
      icon={<Icon icon='tabler:clock-exclamation' fontSize='0.85rem' />}
    />
  )
}

const EmptyCell = () => (
  <Box
    sx={{
      minHeight: 56,
      borderRadius: 1,
      border: theme => `1px dashed ${theme.palette.divider}`,
      bgcolor: 'action.hover',
      opacity: 0.45
    }}
  />
)

const DocCard = ({ type, item, highlighted, onOpen, subtitle }) => {
  if (!item) return <EmptyCell />

  return (
    <Box
      onClick={() => onOpen(type, item.docNum)}
      sx={{
        px: 1.5,
        py: 1.25,
        borderRadius: 1,
        border: theme => `1px solid ${highlighted ? theme.palette.primary.main : theme.palette.divider}`,
        boxShadow: highlighted ? theme => `0 0 0 1px ${theme.palette.primary.main}33` : 'none',
        bgcolor: 'background.paper',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        '&:hover': {
          boxShadow: 2,
          transform: 'translateY(-1px)'
        }
      }}
    >
      {subtitle ? (
        <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
          {subtitle}
        </Typography>
      ) : null}
      <Typography variant='body2' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
        {item.docNum}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
        <CustomChip
          rounded
          skin='light'
          size='small'
          color={statusChipColor(item.docStatusLabel)}
          label={item.docStatusLabel || '—'}
        />
        {highlighted ? <CustomChip rounded skin='light' size='small' color='primary' label='PCR' /> : null}
        {type === 'pr' || type === 'po' ? <ExpiredBadge label={item.expiredLabel} /> : null}
      </Box>
      {item.docDate ? (
        <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
          {formatDisplayDate(item.docDate)}
        </Typography>
      ) : null}
    </Box>
  )
}

/** Single bordered card: MR header + sequential MI delivery rows. */
const MrMiCombinedCard = ({ mr, highlighted, focusMiDocNum, onOpenMrMi, showMr }) => {
  if (!showMr || !mr) return <EmptyCell />

  const mis = mr.mis ?? []

  return (
    <Box
      sx={{
        borderRadius: 1,
        border: theme => `1px solid ${highlighted ? theme.palette.primary.main : theme.palette.divider}`,
        boxShadow: highlighted ? theme => `0 0 0 1px ${theme.palette.primary.main}33` : 'none',
        bgcolor: 'background.paper',
        overflow: 'hidden'
      }}
    >
      <Box
        onClick={() => onOpenMrMi(mr.docNum)}
        sx={{
          px: 1.5,
          py: 1.25,
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
          '&:hover': { bgcolor: 'action.hover' }
        }}
      >
        <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}>
          Material Request
        </Typography>
        <Typography variant='body2' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {mr.docNum}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75, flexWrap: 'wrap' }}>
          <CustomChip
            rounded
            skin='light'
            size='small'
            color={statusChipColor(mr.docStatusLabel)}
            label={mr.docStatusLabel || '—'}
          />
          {highlighted ? <CustomChip rounded skin='light' size='small' color='primary' label='PCR' /> : null}
        </Box>
        {mr.docDate ? (
          <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
            {formatDisplayDate(mr.docDate)}
          </Typography>
        ) : null}
      </Box>

      {mis.length > 0 ? (
        <>
          <Divider />
          <Box sx={{ px: 1.5, py: 1.25, bgcolor: theme => theme.palette.action.hover }}>
            <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.3, display: 'block', mb: 1 }}>
              Material Issue (Delivery)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {mis.map((mi, index) => {
                const miFocused = String(focusMiDocNum ?? '') === String(mi.docNum)

                return (
                  <Box
                    key={`mi-${mi.docNum}`}
                    onClick={event => {
                      event.stopPropagation()
                      onOpenMrMi(mr.docNum, mi.docNum)
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      px: 1,
                      py: 0.75,
                      borderRadius: 1,
                      border: theme => `1px solid ${miFocused ? theme.palette.secondary.main : theme.palette.divider}`,
                      bgcolor: 'background.paper',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s ease',
                      '&:hover': { boxShadow: 1 }
                    }}
                  >
                    <Box
                      sx={{
                        minWidth: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'secondary.main',
                        color: 'secondary.contrastText',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        mt: 0.25
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant='body2' sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                        {mi.docNum}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5, flexWrap: 'wrap' }}>
                        <CustomChip
                          rounded
                          skin='light'
                          size='small'
                          color={statusChipColor(mi.docStatusLabel)}
                          label={mi.docStatusLabel || '—'}
                        />
                      </Box>
                      {mi.docDate ? (
                        <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                          {formatDisplayDate(mi.docDate)}
                        </Typography>
                      ) : null}
                    </Box>
                    <Icon icon='tabler:chevron-right' fontSize='1rem' style={{ opacity: 0.45, marginTop: 4 }} />
                  </Box>
                )
              })}
            </Box>
          </Box>
        </>
      ) : null}
    </Box>
  )
}

function flattenLanesToRows(lanes) {
  const shown = { wo: new Set(), mr: new Set(), pr: new Set(), po: new Set() }
  const rows = []

  for (const lane of lanes ?? []) {
    const paths = lane.paths?.length ? lane.paths : [{ mr: null, pr: null, po: null }]

    for (const path of paths) {
      const woDocNum = lane.wo?.docNum
      const mrDocNum = path.mr?.docNum
      const prDocNum = path.pr?.docNum
      const poDocNum = path.po?.docNum

      const row = {
        woLabel: lane.label,
        wo: lane.wo,
        mr: path.mr,
        pr: path.pr,
        po: path.po,
        showWo: Boolean(woDocNum && !shown.wo.has(woDocNum)),
        showMr: Boolean(mrDocNum && !shown.mr.has(mrDocNum)),
        showPr: Boolean(prDocNum && !shown.pr.has(prDocNum)),
        showPo: Boolean(poDocNum && !shown.po.has(poDocNum))
      }

      if (woDocNum && row.showWo) shown.wo.add(woDocNum)
      if (mrDocNum && row.showMr) shown.mr.add(mrDocNum)
      if (prDocNum && row.showPr) shown.pr.add(prDocNum)
      if (poDocNum && row.showPo) shown.po.add(poDocNum)

      rows.push(row)
    }
  }

  return rows
}

function countUniqueDocs(lanes) {
  const wo = new Set()
  const mr = new Set()
  const pr = new Set()
  const po = new Set()
  const mi = new Set()

  for (const lane of lanes ?? []) {
    if (lane.wo?.docNum) wo.add(lane.wo.docNum)

    for (const path of lane.paths ?? []) {
      if (path.mr?.docNum) mr.add(path.mr.docNum)
      if (path.pr?.docNum) pr.add(path.pr.docNum)
      if (path.po?.docNum) po.add(path.po.docNum)
      for (const item of path.mr?.mis ?? []) {
        if (item.docNum) mi.add(item.docNum)
      }
    }
  }

  return { wo: wo.size, mr: mr.size, pr: pr.size, po: po.size, mi: mi.size }
}

function normalizeChainLanes(chain) {
  if (!chain) return []
  if (chain.lanes?.length) return chain.lanes

  const paths = []

  for (const branch of chain.branches ?? []) {
    if (!branch.prs?.length) {
      paths.push({ mr: branch.mr, pr: null, po: null })
      continue
    }

    for (const prBranch of branch.prs) {
      if (!prBranch.pos?.length) {
        paths.push({ mr: branch.mr, pr: prBranch.pr, po: null })
        continue
      }

      for (const po of prBranch.pos) {
        paths.push({ mr: branch.mr, pr: prBranch.pr, po })
      }
    }
  }

  if (!paths.length && !chain.wo) return []

  return [{ wo: chain.wo ?? null, paths }]
}

const ChainRow = ({ row, isHighlighted, onOpenDoc, onOpenMrMi, focusMiDocNum }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: GRID_COLUMNS },
      gap: { xs: 0, md: 1.5 },
      alignItems: 'start',
      p: { xs: 1.25, md: 1.5 },
      borderRadius: 1,
      border: theme => `1px solid ${theme.palette.divider}`,
      bgcolor: 'background.paper'
    }}
  >
    <Box>
      <MobileStepLabel label={row.woLabel ? `WO — ${row.woLabel}` : 'WO'} />
      {row.showWo && row.wo ? (
        <DocCard
          type='wo'
          item={row.wo}
          highlighted={isHighlighted('wo', row.wo.docNum)}
          onOpen={onOpenDoc}
        />
      ) : (
        <EmptyCell />
      )}
    </Box>

    <FlowArrow />

    <Box>
      <MobileStepLabel label='MR / MI' />
      <MrMiCombinedCard
        mr={row.mr}
        showMr={row.showMr}
        highlighted={isHighlighted('mr', row.mr?.docNum)}
        focusMiDocNum={focusMiDocNum}
        onOpenMrMi={onOpenMrMi}
      />
    </Box>

    <FlowArrow />

    <Box>
      <MobileStepLabel label='PR' />
      {row.showPr ? (
        <DocCard type='pr' item={row.pr} highlighted={isHighlighted('pr', row.pr?.docNum)} onOpen={onOpenDoc} />
      ) : (
        <EmptyCell />
      )}
    </Box>

    <FlowArrow />

    <Box>
      <MobileStepLabel label='PO' />
      {row.showPo ? (
        <DocCard type='po' item={row.po} highlighted={isHighlighted('po', row.po?.docNum)} onOpen={onOpenDoc} />
      ) : (
        <EmptyCell />
      )}
    </Box>
  </Box>
)

const SapDocumentChain = ({
  woNo,
  woRemoveNo,
  woInstallNo,
  mrNo,
  prNo,
  poNo,
  title = 'SAP Document Chain',
  hideWhenEmpty = true
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chain, setChain] = useState(null)
  const [drawer, setDrawer] = useState({ open: false, type: null, docNum: null, focusMiDocNum: null })

  const anchors = useMemo(
    () => ({
      wo: normalizeDocNumValue(woNo),
      woRemove: normalizeDocNumValue(woRemoveNo),
      woInstall: normalizeDocNumValue(woInstallNo),
      mr: normalizeDocNumValue(mrNo),
      pr: normalizeDocNumValue(prNo),
      po: normalizeDocNumValue(poNo)
    }),
    [mrNo, poNo, prNo, woInstallNo, woNo, woRemoveNo]
  )

  const hasSeed =
    hasDocNumValue(anchors.wo) ||
    hasDocNumValue(anchors.woRemove) ||
    hasDocNumValue(anchors.woInstall) ||
    hasDocNumValue(anchors.mr) ||
    hasDocNumValue(anchors.pr) ||
    hasDocNumValue(anchors.po)

  useEffect(() => {
    if (!hasSeed) {
      setChain(null)
      setError('')

      return
    }

    const controller = new AbortController()
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await fetchSapDocumentChain({
          woNo: anchors.wo,
          woRemoveNo: anchors.woRemove,
          woInstallNo: anchors.woInstall,
          mrNo: anchors.mr,
          prNo: anchors.pr,
          poNo: anchors.po,
          signal: controller.signal
        })

        if (!active) return
        setChain(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (!active) return
        setChain(null)
        setError(err instanceof Error ? err.message : 'Failed to load SAP document chain')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
      controller.abort()
    }
  }, [anchors.mr, anchors.po, anchors.pr, anchors.wo, anchors.woInstall, anchors.woRemove, hasSeed])

  const lanes = useMemo(() => normalizeChainLanes(chain), [chain])
  const rows = useMemo(() => flattenLanesToRows(lanes), [lanes])
  const totals = useMemo(() => countUniqueDocs(lanes), [lanes])

  if (hideWhenEmpty && !hasSeed) return null

  const openDocDrawer = (type, docNum) => {
    setDrawer({ open: true, type, docNum: normalizeDocNumValue(docNum), focusMiDocNum: null })
  }

  const openMrMiDrawer = (mrDocNum, focusMiDocNum = null) => {
    setDrawer({
      open: true,
      type: 'mr',
      docNum: normalizeDocNumValue(mrDocNum),
      focusMiDocNum: focusMiDocNum ? normalizeDocNumValue(focusMiDocNum) : null
    })
  }

  const isHighlighted = (type, docNum) => {
    if (!docNum) return false

    if (type === 'wo') {
      return [anchors.wo, anchors.woRemove, anchors.woInstall].some(value => String(value) === String(docNum))
    }

    return String(anchors[type] ?? '') === String(docNum)
  }

  const mrMiHeaderCount = totals.mi > 0 ? `${totals.mr} + ${totals.mi} MI` : String(totals.mr)

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 1,
        border: theme => `1px solid ${theme.palette.divider}`,
        bgcolor: 'action.hover'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            WO → MR/MI → PR → PO — live chain from SAP
          </Typography>
        </Box>
        {chain ? (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <CustomChip rounded skin='light' size='small' color='info' label={`WO ${totals.wo}`} />
            <CustomChip rounded skin='light' size='small' color='primary' label={`MR/MI ${mrMiHeaderCount}`} />
            <CustomChip rounded skin='light' size='small' color='warning' label={`PR ${totals.pr}`} />
            <CustomChip rounded skin='light' size='small' color='success' label={`PO ${totals.po}`} />
          </Box>
        ) : null}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {!loading && error ? (
        <Alert severity='warning' sx={{ mb: 0 }}>
          {error}
        </Alert>
      ) : null}

      {!loading && !error && chain ? (
        rows.length === 0 ? (
          <Alert severity='info' sx={{ py: 0.5 }}>
            No related documents found in SAP for this chain.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box
              sx={{
                display: { xs: 'none', md: 'grid' },
                gridTemplateColumns: GRID_COLUMNS,
                gap: 1.5,
                px: 0.5
              }}
            >
              <KanbanColumnHeader type='wo' count={totals.wo} />
              <KanbanColumnHeader type='mr' count={mrMiHeaderCount} label='MR / MI' />
              <KanbanColumnHeader type='pr' count={totals.pr} />
              <KanbanColumnHeader type='po' count={totals.po} />
            </Box>

            {rows.map((row, index) => (
              <ChainRow
                key={`chain-row-${index}-${row.wo?.docNum ?? 'wo'}-${row.mr?.docNum ?? 'mr'}-${row.pr?.docNum ?? 'pr'}-${row.po?.docNum ?? 'po'}`}
                row={row}
                isHighlighted={isHighlighted}
                onOpenDoc={openDocDrawer}
                onOpenMrMi={openMrMiDrawer}
                focusMiDocNum={drawer.focusMiDocNum}
              />
            ))}
          </Box>
        )
      ) : null}

      <SapDocumentDetailDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, type: null, docNum: null, focusMiDocNum: null })}
        type={drawer.type}
        docNum={drawer.docNum}
        focusMiDocNum={drawer.focusMiDocNum}
      />
    </Box>
  )
}

export default SapDocumentChain
