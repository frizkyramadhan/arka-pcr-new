/**
 * SAP B1 procurement documents — WO (ServiceCalls), MR (Orders), PR, PO lookup.
 * Relations use UDF fields: ORDR.U_MIS_WoNo, OPRQ.U_MIS_MRNo.
 *
 * Note: this SAP instance does not support $expand=DocumentLines on filtered list queries.
 * Lines are loaded via full GET /Entity(DocEntry) after resolving DocEntry from DocNum.
 */
import {
  isSapB1Configured,
  isSapB1Enabled,
  SapB1DisabledError,
  SapB1UnavailableError
} from '@/lib/sap-b1/config'
import {
  mapDeliveryNote,
  mapDeliverySummary,
  mapOrder,
  mapOrderSummary,
  mapPurchaseOrder,
  mapPurchaseOrderSummary,
  mapPurchaseRequest,
  mapPurchaseRequestSummary,
  mapServiceCall,
  mapServiceCallSummary
} from '@/lib/sap-b1/document-mappers'
import { buildDocCacheKey, withCache } from '@/lib/sap-b1/cache'
import { escapeODataString } from '@/lib/sap-b1/odata'
import { sapB1AuthorizedJson } from '@/lib/sap-b1/session'
import type {
  SapB1DeliveryRaw,
  SapB1ODataListResponse,
  SapB1OrderRaw,
  SapB1PurchaseOrderRaw,
  SapB1PurchaseRequestRaw,
  SapB1ServiceCallRaw,
  SapDeliveryNote,
  SapDocument,
  SapDocumentChainBranch,
  SapDocumentChainMrNode,
  SapDocumentChainPath,
  SapDocumentChainPrBranch,
  SapDocumentChainResult,
  SapDocumentChainWoLane,
  SapDocumentLine,
  SapDocumentSummary,
  SapDocumentType,
  SapOrder,
  SapPurchaseOrder,
  SapPurchaseRequest,
  SapServiceCall
} from '@/types/sap-b1'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50
const CHAIN_RELATED_LIMIT = 50
const DOC_NUM_MAX_LEN = 10

const WO_SELECT =
  'DocNum,ServiceCallID,Subject,Status,CreationDate,ClosingDate,U_MIS_WODate,U_MIS_UnitNo,U_MIS_HoursMeter,U_MIS_ModeNo,U_MIS_SerialNo,U_MIS_Project,U_MIS_JobCode,U_MIS_ComponentNo,U_MIS_SubCompNo,U_MIS_Damage,U_MIS_FailCause,U_MIS_MalStartDt,U_MIS_MalStartTm'

const MR_HEADER_SELECT =
  'DocNum,DocEntry,DocDate,DocDueDate,DocumentStatus,CardCode,CardName,U_MIS_WoNo,U_MIS_Project,U_MIS_UnitNo,U_MIS_ModeNo,U_MIS_SerialNo,U_MIS_HoursMeter,U_MIS_KiloMeter,U_MIS_Location,U_MIS_Priority2,U_MIS_CLOSESTAT'

const MR_SUMMARY_SELECT =
  'DocNum,DocEntry,DocDate,DocDueDate,DocumentStatus,CardName,U_MIS_CLOSESTAT'
const PR_SUMMARY_SELECT = 'DocNum,DocEntry,DocDate,DocumentStatus,U_MIS_ExpStatus'

const PO_SUMMARY_SELECT =
  'DocNum,DocDate,DocumentStatus,Cancelled,CardName,U_MIS_ExpStatus,U_MIS_ValidTo'
const MI_SUMMARY_SELECT = 'DocNum,DocEntry,DocDate,DocumentStatus,U_MIS_ExpStatus,U_MIS_ValidTo'

export type SearchSapDocumentsInput = {
  type: SapDocumentType
  query: string
  limit?: number
  relatedWo?: string
  relatedMr?: string
}

export type SapDocumentChainInput = {
  woNo?: string | number | null
  woNos?: Array<string | number | null>
  woRemoveNo?: string | number | null
  woInstallNo?: string | number | null
  mrNo?: string | number | null
  prNo?: string | number | null
  poNo?: string | number | null
}

export type GetSapDocumentResult = {
  data: SapDocument | null
  source: 'sap-b1'
}

export type SearchSapDocumentsResult = {
  data: SapDocumentSummary[]
  source: 'sap-b1'
}

function assertSapReady(): void {
  if (!isSapB1Enabled()) throw new SapB1DisabledError()
  if (!isSapB1Configured()) throw new SapB1UnavailableError('SAP B1 is not configured')
}

function clampLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit)) return DEFAULT_LIMIT

  return Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT)
}

export function normalizeDocNumQuery(raw: string): string {
  return String(raw ?? '').trim().replace(/\D/g, '')
}

function parseDocNum(raw: string): number | null {
  const normalized = normalizeDocNumQuery(raw)
  if (!normalized) return null

  const num = Number(normalized)

  return Number.isFinite(num) && num > 0 ? num : null
}

/** Prefix range filter — covers DocNum lengths from query length up to DOC_NUM_MAX_LEN. */
function buildDocNumSearchFilter(query: string): string | null {
  const normalized = normalizeDocNumQuery(query)
  const num = parseDocNum(query)
  if (num == null) return null

  const digits = normalized.length

  if (digits >= DOC_NUM_MAX_LEN) {
    return `DocNum eq ${num}`
  }

  const ranges: string[] = []

  for (let length = digits; length <= DOC_NUM_MAX_LEN; length += 1) {
    const suffixDigits = length - digits
    const multiplier = 10 ** suffixDigits
    const lowerBound = num * multiplier
    const upperBound = lowerBound + multiplier - 1

    if (suffixDigits === 0) {
      ranges.push(`DocNum eq ${num}`)
    } else {
      ranges.push(`(DocNum ge ${lowerBound} and DocNum le ${upperBound})`)
    }
  }

  return ranges.join(' or ')
}

function buildListPath(entity: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params)

  return `/${entity}?${search.toString()}`
}

async function fetchList<T>(
  entity: string,
  filter: string,
  select: string,
  limit: number,
  orderBy = 'DocNum desc'
): Promise<T[]> {
  const params: Record<string, string> = {
    $filter: filter,
    $select: select,
    $top: String(limit)
  }

  if (orderBy) params.$orderby = orderBy

  const payload = await sapB1AuthorizedJson<SapB1ODataListResponse<T>>(buildListPath(entity, params))

  return payload.value ?? []
}

async function resolveDocEntry(entity: string, docNum: number): Promise<number | null> {
  const payload = await sapB1AuthorizedJson<SapB1ODataListResponse<{ DocEntry?: number | null }>>(
    buildListPath(entity, {
      $filter: `DocNum eq ${docNum}`,
      $select: 'DocEntry',
      $top: '1'
    })
  )

  const docEntry = payload.value?.[0]?.DocEntry
  if (docEntry == null) return null

  const parsed = Number(docEntry)

  return Number.isFinite(parsed) ? parsed : null
}

async function fetchDocumentByDocNum<T>(entity: string, docNum: number): Promise<T | null> {
  return withCache(buildDocCacheKey(entity, docNum), async () => {
    const docEntry = await resolveDocEntry(entity, docNum)
    if (docEntry == null) return null

    return sapB1AuthorizedJson<T>(`/${entity}(${docEntry})`)
  })
}

type SapB1ItemUomRaw = {
  ItemCode?: string | null
  InventoryUOM?: string | null
  SalesUnit?: string | null
  PurchaseUnit?: string | null
}

async function enrichPurchaseOrderCostCenter(doc: SapPurchaseOrder | null): Promise<SapPurchaseOrder | null> {
  if (!doc) return null

  const code = String(doc.costCenter ?? '').trim()
  if (!code) return doc

  try {
    const rows = await fetchList<{ FactorCode?: string | null; FactorDescription?: string | null }>(
      'DistributionRules',
      `FactorCode eq '${escapeODataString(code)}'`,
      'FactorCode,FactorDescription',
      1,
      ''
    )
    const name = String(rows[0]?.FactorDescription ?? '').trim()

    return {
      ...doc,
      costCenterName: name || null,
      costCenterLabel: name ? `${code} - ${name}` : code
    }
  } catch {
    return { ...doc, costCenterLabel: code }
  }
}

async function enrichPurchaseOrderBuyer(
  doc: SapPurchaseOrder | null,
  salesPersonCode?: number | string | null
): Promise<SapPurchaseOrder | null> {
  if (!doc) return null

  const code = salesPersonCode
  if (code == null || code === '' || Number(code) < 0) return doc

  try {
    const slp = await sapB1AuthorizedJson<{ SalesEmployeeName?: string | null; SlpName?: string | null }>(
      `/SalesPersons(${code})`
    )

    return { ...doc, buyer: slp.SalesEmployeeName ?? slp.SlpName ?? null }
  } catch {
    return doc
  }
}

/** Fill missing line UoM from item master (InventoryUOM / SalesUnit / PurchaseUnit). */
async function enrichDocumentLinesWithUom<T extends { lines?: SapDocumentLine[] }>(
  doc: T | null
): Promise<T | null> {
  if (!doc?.lines?.length) return doc

  const codes = [...new Set(doc.lines.filter(line => !line.uom && line.itemCode).map(line => line.itemCode))]
  if (!codes.length) return doc

  const filter = codes.map(code => `ItemCode eq '${escapeODataString(code)}'`).join(' or ')

  try {
    const items = await fetchList<SapB1ItemUomRaw>(
      'Items',
      filter,
      'ItemCode,InventoryUOM,SalesUnit,PurchaseUnit',
      codes.length,
      ''
    )
    const uomByItem = new Map<string, string>()

    for (const item of items) {
      const code = String(item.ItemCode ?? '').trim()
      const uom = item.InventoryUOM ?? item.SalesUnit ?? item.PurchaseUnit ?? null
      if (code && uom) uomByItem.set(code, String(uom).trim())
    }

    return {
      ...doc,
      lines: doc.lines.map(line => ({
        ...line,
        uom: line.uom || uomByItem.get(line.itemCode) || null
      }))
    }
  } catch {
    return doc
  }
}

export async function getServiceCall(docNum: number): Promise<SapServiceCall | null> {
  assertSapReady()

  const payload = await sapB1AuthorizedJson<SapB1ODataListResponse<SapB1ServiceCallRaw>>(
    buildListPath('ServiceCalls', {
      $filter: `DocNum eq ${docNum}`,
      $select: WO_SELECT,
      $top: '1'
    })
  )

  const raw = payload.value?.[0] ?? null

  return raw ? mapServiceCall(raw) : null
}

export async function getSalesOrder(docNum: number): Promise<SapOrder | null> {
  assertSapReady()

  const raw = await fetchDocumentByDocNum<SapB1OrderRaw>('Orders', docNum)

  return enrichDocumentLinesWithUom(raw ? mapOrder(raw) : null)
}

export async function getPurchaseRequest(docNum: number): Promise<SapPurchaseRequest | null> {
  assertSapReady()

  const raw = await fetchDocumentByDocNum<SapB1PurchaseRequestRaw>('PurchaseRequests', docNum)

  return enrichDocumentLinesWithUom(raw ? mapPurchaseRequest(raw) : null)
}

export async function getPurchaseOrder(docNum: number): Promise<SapPurchaseOrder | null> {
  assertSapReady()

  const raw = await fetchDocumentByDocNum<SapB1PurchaseOrderRaw>('PurchaseOrders', docNum)
  if (!raw) return null

  const mapped = mapPurchaseOrder(raw)
  const withUom = await enrichDocumentLinesWithUom(mapped)
  const withBuyer = await enrichPurchaseOrderBuyer(withUom, raw.SalesPersonCode)

  return enrichPurchaseOrderCostCenter(withBuyer)
}

export async function getDeliveryNote(docNum: number): Promise<SapDeliveryNote | null> {
  assertSapReady()

  const raw = await fetchDocumentByDocNum<SapB1DeliveryRaw>('DeliveryNotes', docNum)

  return enrichDocumentLinesWithUom(raw ? mapDeliveryNote(raw) : null)
}

export async function getSapDocument(type: SapDocumentType, docNum: number): Promise<SapDocument | null> {
  switch (type) {
    case 'wo':
      return getServiceCall(docNum)
    case 'mr':
      return getSalesOrder(docNum)
    case 'pr':
      return getPurchaseRequest(docNum)
    case 'po':
      return getPurchaseOrder(docNum)
    case 'mi':
      return getDeliveryNote(docNum)
    default:
      return null
  }
}

export async function getMrsForWo(woDocNum: number | string, limit = DEFAULT_LIMIT): Promise<SapDocumentSummary[]> {
  assertSapReady()

  const woRef = escapeODataString(String(woDocNum).trim())

  const rows = await fetchList<SapB1OrderRaw>(
    'Orders',
    `U_MIS_WoNo eq '${woRef}'`,
    MR_SUMMARY_SELECT,
    clampLimit(limit)
  )

  return rows.map(mapOrderSummary).filter((row): row is SapDocumentSummary => row !== null)
}

export async function getPrsForMr(mrDocNum: number | string, limit = DEFAULT_LIMIT): Promise<SapDocumentSummary[]> {
  assertSapReady()

  const mrRef = escapeODataString(String(mrDocNum).trim())

  const rows = await fetchList<SapB1PurchaseRequestRaw>(
    'PurchaseRequests',
    `U_MIS_MRNo eq '${mrRef}'`,
    PR_SUMMARY_SELECT,
    clampLimit(limit)
  )

  return rows.map(mapPurchaseRequestSummary).filter((row): row is SapDocumentSummary => row !== null)
}

export async function getPosForPr(prDocEntry: number, limit = DEFAULT_LIMIT): Promise<SapDocumentSummary[]> {
  assertSapReady()

  try {
    const rows = await fetchList<SapB1PurchaseOrderRaw>(
      'PurchaseOrders',
      `DocumentLines/any(l: l/BaseEntry eq ${prDocEntry})`,
      PO_SUMMARY_SELECT,
      clampLimit(limit)
    )

    return rows.map(mapPurchaseOrderSummary).filter((row): row is SapDocumentSummary => row !== null)
  } catch {
    return []
  }
}

export async function getPosForPrDocNum(prDocNum: number | string, limit = DEFAULT_LIMIT): Promise<SapDocumentSummary[]> {
  assertSapReady()

  const prRef = escapeODataString(String(prDocNum).trim())

  const rows = await fetchList<SapB1PurchaseOrderRaw>(
    'PurchaseOrders',
    `U_MIS_PRNo eq '${prRef}'`,
    PO_SUMMARY_SELECT,
    clampLimit(limit)
  )

  return rows.map(mapPurchaseOrderSummary).filter((row): row is SapDocumentSummary => row !== null)
}

/** Delivery notes (MI / ODLN) linked to a WO via U_MIS_WoNo. */
export async function getMisForWo(woDocNum: number | string, limit = DEFAULT_LIMIT): Promise<SapDocumentSummary[]> {
  assertSapReady()

  const woRef = escapeODataString(String(woDocNum).trim())

  const rows = await fetchList<SapB1DeliveryRaw>(
    'DeliveryNotes',
    `U_MIS_WoNo eq '${woRef}'`,
    MI_SUMMARY_SELECT,
    clampLimit(limit)
  )

  return rows.map(mapDeliverySummary).filter((row): row is SapDocumentSummary => row !== null)
}

/**
 * Delivery notes whose lines reference the MR (Order) DocEntry.
 * `preFetchedCandidates` — daftar MI kandidat WO yang sudah di-fetch sekali di level lane
 * (buildLaneForWo), supaya tidak query getMisForWo berulang per MR di WO yang sama.
 */
export async function getMisForMr(
  mrDocEntry: number,
  woDocNum?: number | string | null,
  limit = DEFAULT_LIMIT,
  preFetchedCandidates?: SapDocumentSummary[]
): Promise<SapDocumentSummary[]> {
  if (!mrDocEntry) return []

  const woRef = woDocNum != null ? String(woDocNum).trim() : ''
  if (!woRef && !preFetchedCandidates) return []

  const candidates = preFetchedCandidates ?? (await getMisForWo(woRef, limit))
  const matched: SapDocumentSummary[] = []

  for (const candidate of candidates) {
    const raw = await fetchDocumentByDocNum<SapB1DeliveryRaw>('DeliveryNotes', candidate.docNum)
    const linked = (raw?.DocumentLines ?? []).some(line => Number(line.BaseEntry ?? 0) === mrDocEntry)
    if (linked) matched.push(candidate)
  }

  return matched
}

export async function getPosForMr(mrDocNum: number | string, limit = DEFAULT_LIMIT): Promise<SapDocumentSummary[]> {
  assertSapReady()

  const mrRef = escapeODataString(String(mrDocNum).trim())

  const rows = await fetchList<SapB1PurchaseOrderRaw>(
    'PurchaseOrders',
    `U_MIS_MRNo eq '${mrRef}'`,
    PO_SUMMARY_SELECT,
    clampLimit(limit)
  )

  return rows.map(mapPurchaseOrderSummary).filter((row): row is SapDocumentSummary => row !== null)
}

export async function getSapDocumentWithRelations(
  type: SapDocumentType,
  docNum: number
): Promise<SapDocument | null> {
  const doc = await getSapDocument(type, docNum)
  if (!doc) return null

  if (type === 'wo') {
    const relatedMrs = await getMrsForWo(docNum).catch(() => [])

    return { ...doc, relatedMrs } as SapServiceCall
  }

  if (type === 'mr') {
    const relatedPrs = await getPrsForMr(docNum).catch(() => [])
    const mr = doc as SapOrder

    const relatedMis = mr.docEntry
      ? await getMisForMr(mr.docEntry, mr.woNo).catch(() => [])
      : []

    return { ...mr, relatedPrs, relatedMis }
  }

  if (type === 'pr') {
    const pr = doc as SapPurchaseRequest

    const relatedPos = mergeSummaries(
      pr.docEntry ? await getPosForPr(pr.docEntry).catch(() => []) : [],
      await getPosForPrDocNum(pr.docNum).catch(() => [])
    )

    return { ...pr, relatedPos }
  }

  return doc
}

async function searchByType(type: SapDocumentType, filter: string, limit: number): Promise<SapDocumentSummary[]> {
  const orderBy = 'DocNum asc'

  switch (type) {
    case 'wo': {
      const rows = await fetchList<SapB1ServiceCallRaw>('ServiceCalls', filter, WO_SELECT, limit, orderBy)

      return rows.map(mapServiceCallSummary).filter((row): row is SapDocumentSummary => row !== null)
    }
    case 'mr': {
      const rows = await fetchList<SapB1OrderRaw>('Orders', filter, MR_SUMMARY_SELECT, limit, orderBy)

      return rows.map(mapOrderSummary).filter((row): row is SapDocumentSummary => row !== null)
    }
    case 'pr': {
      const rows = await fetchList<SapB1PurchaseRequestRaw>(
        'PurchaseRequests',
        filter,
        PR_SUMMARY_SELECT,
        limit,
        orderBy
      )

      return rows.map(mapPurchaseRequestSummary).filter((row): row is SapDocumentSummary => row !== null)
    }
    case 'po': {
      const rows = await fetchList<SapB1PurchaseOrderRaw>('PurchaseOrders', filter, PO_SUMMARY_SELECT, limit, orderBy)

      return rows.map(mapPurchaseOrderSummary).filter((row): row is SapDocumentSummary => row !== null)
    }
    case 'mi': {
      const rows = await fetchList<SapB1DeliveryRaw>('DeliveryNotes', filter, MI_SUMMARY_SELECT, limit, orderBy)

      return rows.map(mapDeliverySummary).filter((row): row is SapDocumentSummary => row !== null)
    }
    default:
      return []
  }
}

export async function searchSapDocuments(input: SearchSapDocumentsInput): Promise<SearchSapDocumentsResult> {
  assertSapReady()

  const limit = clampLimit(input.limit)

  if (input.relatedWo) {
    const data = await getMrsForWo(input.relatedWo, limit)

    return { data, source: 'sap-b1' }
  }

  if (input.relatedMr) {
    const data = await getPrsForMr(input.relatedMr, limit)

    return { data, source: 'sap-b1' }
  }

  const query = normalizeDocNumQuery(input.query)
  if (query.length < 4) {
    return { data: [], source: 'sap-b1' }
  }

  const exactNum = parseDocNum(query)

  // Exact lookup only when query looks like a full DocNum (>= 8 digits).
  if (exactNum != null && query.length >= 8) {
    const exact = await searchByType(input.type, `DocNum eq ${exactNum}`, 1)
    if (exact.length > 0) {
      return { data: exact, source: 'sap-b1' }
    }
  }

  const prefixFilter = buildDocNumSearchFilter(query)
  if (!prefixFilter) {
    return { data: [], source: 'sap-b1' }
  }

  const data = await searchByType(input.type, prefixFilter, limit)

  return {
    data: data.filter(item => String(item.docNum).startsWith(query)),
    source: 'sap-b1'
  }
}

function mergeSummaries(...lists: SapDocumentSummary[][]): SapDocumentSummary[] {
  const map = new Map<number, SapDocumentSummary>()

  for (const list of lists) {
    for (const item of list) {
      map.set(item.docNum, { ...map.get(item.docNum), ...item })
    }
  }

  return Array.from(map.values()).sort((a, b) => a.docNum - b.docNum)
}

async function getSummaryForDoc(type: SapDocumentType, docNum: number): Promise<SapDocumentSummary | null> {
  return withCache(buildDocCacheKey(`summary:${type}`, docNum), async () => {
    const rows = await searchByType(type, `DocNum eq ${docNum}`, 1)

    return rows[0] ?? null
  })
}

async function resolveWoFromMr(mrDocNum: number): Promise<{ wo: SapDocumentSummary | null; mrWoNo: string | null }> {
  const mr = await getSalesOrder(mrDocNum)
  const woRef = mr?.woNo ? normalizeDocNumQuery(String(mr.woNo)) : ''
  if (!woRef) return { wo: null, mrWoNo: null }

  const woNum = Number(woRef)
  if (!Number.isFinite(woNum)) return { wo: null, mrWoNo: woRef }

  const wo = await getSummaryForDoc('wo', woNum)

  return { wo, mrWoNo: woRef }
}

async function resolveMrFromPr(prDocNum: number): Promise<number | null> {
  const pr = await getPurchaseRequest(prDocNum)
  const mrRef = pr?.mrNo ? normalizeDocNumQuery(String(pr.mrNo)) : ''
  if (!mrRef) return null

  const mrNum = Number(mrRef)

  return Number.isFinite(mrNum) ? mrNum : null
}

/**
 * `preFetchedMiCandidates` — MI kandidat WO yang sudah di-fetch di level lane (buildLaneForWo),
 * dibagi ke semua MR di WO yang sama supaya getMisForWo tidak dipanggil berulang per MR.
 */
async function buildPathsForMr(
  mrDocNum: number,
  woDocNum: number | string | null | undefined,
  anchors: { pr?: number | null; po?: number | null },
  preFetchedMiCandidates?: SapDocumentSummary[]
): Promise<SapDocumentChainPath[]> {
  const mrSummary = await getSummaryForDoc('mr', mrDocNum)
  if (!mrSummary) return []

  const mrFull = await getSalesOrder(mrDocNum)
  const woRef = woDocNum ?? mrFull?.woNo ?? null

  const mis = mrFull?.docEntry
    ? await getMisForMr(mrFull.docEntry, woRef, CHAIN_RELATED_LIMIT, preFetchedMiCandidates).catch(() => [])
    : []

  const mr: SapDocumentChainMrNode = {
    ...mrSummary,
    docEntry: mrFull?.docEntry ?? mrSummary.docEntry,
    mis
  }

  let prs = await getPrsForMr(mrDocNum, CHAIN_RELATED_LIMIT)

  if (anchors.pr && !prs.some(item => item.docNum === anchors.pr)) {
    const anchoredPr = await getSummaryForDoc('pr', anchors.pr)
    if (anchoredPr) prs = mergeSummaries(prs, [anchoredPr])
  }

  if (prs.length === 0) {
    return [{ mr, pr: null, po: null }]
  }

  // getPosForMr result is identical for every PR under this MR — hoisted out of the loop below.
  const posForMr = await getPosForMr(mrDocNum, CHAIN_RELATED_LIMIT)

  const paths: SapDocumentChainPath[] = []

  for (const pr of prs) {
    const pos = mergeSummaries(
      pr.docEntry ? await getPosForPr(pr.docEntry, CHAIN_RELATED_LIMIT) : [],
      await getPosForPrDocNum(pr.docNum, CHAIN_RELATED_LIMIT),
      posForMr
    )

    let mergedPos = pos

    if (anchors.po && anchors.pr === pr.docNum && !mergedPos.some(item => item.docNum === anchors.po)) {
      const anchoredPo = await getSummaryForDoc('po', anchors.po)
      if (anchoredPo) mergedPos = mergeSummaries(mergedPos, [anchoredPo])
    }

    if (mergedPos.length === 0) {
      paths.push({ mr, pr, po: null })
      continue
    }

    for (const po of mergedPos) {
      paths.push({ mr, pr, po })
    }
  }

  return paths
}

async function buildBranchForMr(mrDocNum: number, anchors: { pr?: number | null; po?: number | null }): Promise<SapDocumentChainBranch | null> {
  const paths = await buildPathsForMr(mrDocNum, null, anchors)
  if (paths.length === 0) return null

  const mr = paths[0].mr
  const prBranches: SapDocumentChainPrBranch[] = []

  for (const path of paths) {
    if (!path.pr) continue

    const existing = prBranches.find(entry => entry.pr.docNum === path.pr?.docNum)
    if (existing) {
      if (path.po && !existing.pos.some(item => item.docNum === path.po?.docNum)) {
        existing.pos.push(path.po)
      }
      continue
    }

    prBranches.push({ pr: path.pr, pos: path.po ? [path.po] : [] })
  }

  if (prBranches.length === 0) {
    return { mr, prs: [] }
  }

  return { mr, prs: prBranches }
}

type WoRoot = { docNum: number; label?: string }

function dedupeWoRoots(roots: WoRoot[]): WoRoot[] {
  const map = new Map<number, WoRoot>()

  for (const root of roots) {
    const existing = map.get(root.docNum)
    if (!existing) {
      map.set(root.docNum, { ...root })
      continue
    }

    if (root.label && existing.label && existing.label !== root.label) {
      existing.label = `${existing.label} / ${root.label}`
    } else if (root.label && !existing.label) {
      existing.label = root.label
    }
  }

  return Array.from(map.values()).sort((a, b) => a.docNum - b.docNum)
}

function pathsToBranches(paths: SapDocumentChainPath[]): SapDocumentChainBranch[] {
  const byMr = new Map<number, SapDocumentChainBranch>()

  for (const path of paths) {
    let branch = byMr.get(path.mr.docNum)
    if (!branch) {
      branch = { mr: path.mr, prs: [] }
      byMr.set(path.mr.docNum, branch)
    }

    if (!path.pr) continue

    let prBranch = branch.prs.find(entry => entry.pr.docNum === path.pr?.docNum)
    if (!prBranch) {
      prBranch = { pr: path.pr, pos: [] }
      branch.prs.push(prBranch)
    }

    if (path.po && !prBranch.pos.some(item => item.docNum === path.po?.docNum)) {
      prBranch.pos.push(path.po)
    }
  }

  return Array.from(byMr.values()).sort((a, b) => a.mr.docNum - b.mr.docNum)
}

async function shouldIncludeAnchorMrForWo(mrDocNum: number, woDocNum: number): Promise<boolean> {
  const mr = await getSalesOrder(mrDocNum)
  const mrWo = mr?.woNo ? normalizeDocNumQuery(String(mr.woNo)) : ''
  if (!mrWo) return true

  return mrWo === String(woDocNum)
}

async function buildLaneForWo(
  woDocNum: number,
  label: string | undefined,
  anchors: { mr?: number | null; pr?: number | null; po?: number | null }
): Promise<SapDocumentChainWoLane> {
  const wo = await getSummaryForDoc('wo', woDocNum)
  const mrNums = new Set<number>()
  const relatedMrs = await getMrsForWo(woDocNum, CHAIN_RELATED_LIMIT)
  relatedMrs.forEach(item => mrNums.add(item.docNum))

  if (anchors.mr && (await shouldIncludeAnchorMrForWo(anchors.mr, woDocNum))) {
    mrNums.add(anchors.mr)
  }

  // Fetch MI candidates once per WO — shared across every MR in this lane (was: once per MR).
  const miCandidates = await getMisForWo(woDocNum, CHAIN_RELATED_LIMIT).catch(() => [])

  const paths: SapDocumentChainPath[] = []

  for (const mrDocNum of Array.from(mrNums).sort((a, b) => a - b)) {
    const mrPaths = await buildPathsForMr(mrDocNum, woDocNum, anchors, miCandidates)
    paths.push(...mrPaths)
  }

  return { label, wo, paths }
}

function collectWoRoots(input: SapDocumentChainInput): WoRoot[] {
  const roots: WoRoot[] = []

  const pushRoot = (raw: string | number | null | undefined, label?: string) => {
    const docNum = parseDocNum(String(raw ?? ''))
    if (docNum) roots.push(label ? { docNum, label } : { docNum })
  }

  pushRoot(input.woRemoveNo, 'Remove')
  pushRoot(input.woInstallNo, 'Install')
  pushRoot(input.woNo)

  for (const raw of input.woNos ?? []) {
    pushRoot(raw)
  }

  return dedupeWoRoots(roots)
}

/** Build full WO → MR → PR → PO tree from SAP UDF links + PCR anchor numbers. */
export async function buildSapDocumentChain(input: SapDocumentChainInput): Promise<SapDocumentChainResult> {
  assertSapReady()

  const anchors = {
    wo: parseDocNum(String(input.woNo ?? '')),
    woRemove: parseDocNum(String(input.woRemoveNo ?? '')),
    woInstall: parseDocNum(String(input.woInstallNo ?? '')),
    mr: parseDocNum(String(input.mrNo ?? '')),
    pr: parseDocNum(String(input.prNo ?? '')),
    po: parseDocNum(String(input.poNo ?? ''))
  }

  const pathAnchors = { pr: anchors.pr, po: anchors.po }
  let woRoots = collectWoRoots(input)

  if (woRoots.length === 0 && anchors.woRemove) {
    woRoots.push({ docNum: anchors.woRemove, label: 'Remove' })
  }
  if (woRoots.length === 0 && anchors.woInstall) {
    woRoots.push({ docNum: anchors.woInstall, label: 'Install' })
  }
  if (woRoots.length === 0 && anchors.wo) {
    woRoots.push({ docNum: anchors.wo })
  }

  if (woRoots.length === 0 && anchors.mr) {
    const resolved = await resolveWoFromMr(anchors.mr)
    if (resolved.wo?.docNum) {
      woRoots.push({ docNum: resolved.wo.docNum })
    }
  }

  if (woRoots.length === 0 && anchors.pr) {
    const mrFromPr = await resolveMrFromPr(anchors.pr)
    if (mrFromPr) {
      const resolved = await resolveWoFromMr(mrFromPr)
      if (resolved.wo?.docNum) woRoots.push({ docNum: resolved.wo.docNum })
    }
  }

  const lanes: SapDocumentChainWoLane[] = []

  if (woRoots.length > 0) {
    for (const root of woRoots) {
      lanes.push(await buildLaneForWo(root.docNum, root.label, { mr: anchors.mr, ...pathAnchors }))
    }
  } else if (anchors.mr) {
    const paths = await buildPathsForMr(anchors.mr, null, pathAnchors)
    const resolved = await resolveWoFromMr(anchors.mr)
    lanes.push({ wo: resolved.wo, paths })
  }

  const branches = lanes.flatMap(lane => pathsToBranches(lane.paths))
  const wo = lanes[0]?.wo ?? null

  return {
    lanes,
    wo,
    branches,
    anchors,
    source: 'sap-b1'
  }
}

export { DEFAULT_LIMIT as DOCUMENT_SEARCH_DEFAULT_LIMIT, MAX_LIMIT as DOCUMENT_SEARCH_MAX_LIMIT, CHAIN_RELATED_LIMIT }
