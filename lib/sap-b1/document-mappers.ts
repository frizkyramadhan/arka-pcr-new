/**
 * Map SAP B1 Service Layer document payloads to PCR-friendly shapes.
 */
import type {
  SapB1DeliveryRaw,
  SapB1OrderLineRaw,
  SapB1OrderRaw,
  SapB1PurchaseOrderLineRaw,
  SapB1PurchaseOrderRaw,
  SapB1PurchaseRequestLineRaw,
  SapB1PurchaseRequestRaw,
  SapB1ServiceCallRaw,
  SapDeliveryNote,
  SapDocumentLine,
  SapDocumentSummary,
  SapOrder,
  SapPurchaseOrder,
  SapPurchaseRequest,
  SapServiceCall
} from '@/types/sap-b1'

const WO_STATUS_LABELS: Record<string, string> = {
  '-1': 'Close',
  '-3': 'Open',
  '1': 'Cancel',
  '-2': 'Pending',
  '2': 'Surcharge'
}

const MR_PRIORITY_LABELS: Record<string, string> = {
  P1: 'Breakdown',
  P2: 'Backlog',
  P3: 'Stock'
}

const MR_JOB_CATEGORY_LABELS: Record<string, string> = {
  A: 'Schedule',
  B: 'Unschedule',
  C: 'Accident',
  D: 'Additional Job',
  E: 'Unit Rental'
}

/** Map ORDR.U_MIS_Priority2 to display label, e.g. P1 - Breakdown. */
export function decodeMrPriority(code: string | null | undefined): string | null {
  const key = String(code ?? '').trim().toUpperCase()
  if (!key) return null

  const label = MR_PRIORITY_LABELS[key]

  return label ? `${key} - ${label}` : key
}

/** Map ORDR.U_MIS_JobCategory to display label, e.g. B - Unschedule. */
export function decodeMrJobCategory(code: string | null | undefined): string | null {
  const key = String(code ?? '').trim().toUpperCase()
  if (!key) return null

  const label = MR_JOB_CATEGORY_LABELS[key]

  return label ? `${key} - ${label}` : key
}

/** PR status — Open / Closed / Canceled (matches MIS report query). */
export function decodePrDocStatus(raw: {
  DocStatus?: string | null
  DocumentStatus?: string | null
  Cancelled?: string | null
}): { code: 'O' | 'C'; label: string } {
  const cancelled = String(raw.Cancelled ?? '').toLowerCase()
  const isCancelled = cancelled === 'tyes' || cancelled === 'y' || cancelled === 'yes'
  const docStatus = decodeDocStatus(resolveRawDocStatus(raw))

  if (isCancelled && docStatus.code === 'C') return { code: 'C', label: 'Canceled' }
  if (docStatus.code === 'C') return { code: 'C', label: 'Closed' }

  return { code: 'O', label: 'Open' }
}

/** PR document type — Item or Service. */
export function decodePrDocType(docType: string | null | undefined): string | null {
  const raw = String(docType ?? '').trim()

  if (raw === 'dDocument_Items' || raw === 'I') return 'Item'
  if (raw === 'dDocument_Service' || raw === 'S') return 'Service'

  return raw || null
}

export function decodeWoStatus(status: number | string | null | undefined): string {
  const key = String(status ?? '').trim()

  return WO_STATUS_LABELS[key] ?? (key || 'Unknown')
}

export function decodeDocStatus(status: string | null | undefined): { code: 'O' | 'C'; label: string } {
  const raw = String(status ?? '').trim()
  const code = raw.toUpperCase()

  if (code === 'C' || code === 'BOST_CLOSE') return { code: 'C', label: 'Closed' }
  if (code === 'O' || code === 'BOST_OPEN') return { code: 'O', label: 'Open' }
  if (code === 'BOST_PAID') return { code: 'C', label: 'Paid' }

  return { code: 'O', label: raw || 'Open' }
}

function resolveRawDocStatus(raw: { DocStatus?: string | null; DocumentStatus?: string | null }): string {
  return raw.DocumentStatus ?? raw.DocStatus ?? ''
}

type ExpirationRaw = {
  U_MIS_ExpStatus?: string | null
  U_MIS_ValidTo?: string | null
  U_MIS_CLOSESTAT?: string | null
  U_MIS_RequiredDate?: string | null
  U_MIS_EstArrival?: string | null
  DocDueDate?: string | null
}

function resolveExpirationDate(raw: ExpirationRaw): string | null {
  return raw.U_MIS_ValidTo ?? raw.U_MIS_RequiredDate ?? raw.DocDueDate ?? raw.U_MIS_EstArrival ?? null
}

function isExpiredStatusText(value: string | null | undefined): boolean {
  const text = String(value ?? '').trim()
  if (!text) return false

  const upper = text.toUpperCase()
  if (upper === 'E') return true
  if (/not\s*expir/i.test(text) || /non[\s-]*expir/i.test(text)) return false

  return /\bexpir/i.test(text)
}

function toCalendarDateKey(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/)

    return match ? match[1] : null
  }

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

function isCalendarDateBeforeToday(value: string): boolean {
  const dateKey = toCalendarDateKey(value)
  const todayKey = toCalendarDateKey(new Date())

  if (!dateKey || !todayKey) return false

  return dateKey < todayKey
}

function formatIsoDateShort(value: string): string {
  return toCalendarDateKey(value) ?? String(value).slice(0, 10)
}

/** Derive human-readable expiration label from SAP UDF / due date fields. */
export function resolveExpiredLabel(raw: ExpirationRaw): string | null {
  const expStatus = String(raw.U_MIS_ExpStatus ?? raw.U_MIS_CLOSESTAT ?? '').trim()
  if (isExpiredStatusText(expStatus)) return expStatus || 'Expired'

  const validTo = resolveExpirationDate(raw)
  if (!validTo) return null

  if (!isCalendarDateBeforeToday(validTo)) return null

  return `Expired (${formatIsoDateShort(validTo)})`
}

/** PO expiration — U_MIS_ExpStatus, or Valid To only while PO is still Open. */
export function resolvePoExpiredLabel(raw: {
  U_MIS_ExpStatus?: string | null
  U_MIS_ValidTo?: string | null
  DocumentStatus?: string | null
  DocStatus?: string | null
  Cancelled?: string | null
}): string | null {
  const expStatus = String(raw.U_MIS_ExpStatus ?? '').trim()
  if (isExpiredStatusText(expStatus)) return expStatus || 'Expired'

  const docStatus = decodePrDocStatus(raw)
  if (docStatus.code === 'C') return null

  const validTo = raw.U_MIS_ValidTo ?? null
  if (!validTo) return null
  if (!isCalendarDateBeforeToday(validTo)) return null

  return `Expired (${formatIsoDateShort(validTo)})`
}

/** Normalize expired label for PR/PO UI badges. */
export function resolveDocumentExpiredLabel(
  item: { expiredLabel?: string | null; expStatus?: string | null; docStatusLabel?: string | null } | null | undefined
): string | null {
  if (!item) return null
  if (item.expiredLabel) return item.expiredLabel

  const expStatus = String(item.expStatus ?? '').trim()
  if (isExpiredStatusText(expStatus)) return expStatus || 'Expired'

  const statusLabel = String(item.docStatusLabel ?? '').trim()
  if (isExpiredStatusText(statusLabel)) return statusLabel || 'Expired'

  return null
}

function withPoExpiration<T extends SapDocumentSummary>(summary: T, raw: SapB1PurchaseOrderRaw): T {
  const expStatus = raw.U_MIS_ExpStatus ?? null
  const validTo = raw.U_MIS_ValidTo ?? null

  return {
    ...summary,
    expStatus: expStatus != null ? String(expStatus).trim() || null : null,
    validTo: validTo != null ? String(validTo) : null,
    expiredLabel: resolvePoExpiredLabel(raw)
  }
}

function withExpiration<T extends SapDocumentSummary>(summary: T, raw: ExpirationRaw): T {
  const expStatus = raw.U_MIS_ExpStatus ?? raw.U_MIS_CLOSESTAT ?? null
  const validTo = resolveExpirationDate(raw)

  return {
    ...summary,
    expStatus: expStatus != null ? String(expStatus).trim() || null : null,
    validTo: validTo != null ? String(validTo) : null,
    expiredLabel: resolveExpiredLabel(raw)
  }
}

function resolveLineUom(line: SapB1OrderLineRaw): string | null {
  const measureUnit = String(line.MeasureUnit ?? '').trim()
  if (measureUnit) return measureUnit

  const misUom = String(line.U_MIS_Uom ?? '').trim()
  if (misUom) return misUom

  const uomCode = String(line.UoMCode ?? '').trim()
  if (uomCode && uomCode.toLowerCase() !== 'manual') return uomCode

  return null
}

function mapDocumentLine(line: SapB1OrderLineRaw | SapB1PurchaseRequestLineRaw | SapB1PurchaseOrderLineRaw): SapDocumentLine {
  const openQtyRaw = line.OpenQty ?? line.OpenQuantity ?? line.RemainingOpenQuantity
  const priceRaw = line.Price ?? line.UnitPrice

  return {
    lineNum: Number(line.LineNum ?? 0),
    itemCode: String(line.ItemCode ?? '').trim(),
    itemDescription: String(line.ItemDescription ?? '').trim(),
    quantity: Number(line.Quantity ?? 0),
    openQty: openQtyRaw != null ? Number(openQtyRaw) : undefined,
    price: priceRaw != null ? Number(priceRaw) : 0,
    currency: String(line.Currency ?? '').trim(),
    uom: resolveLineUom(line),
    whsCode: line.WarehouseCode ? String(line.WarehouseCode).trim() : line.WhsCode ? String(line.WhsCode).trim() : undefined
  }
}

/** PO delivery status from U_ARK_DelivStat. */
export function decodePoDeliveryStatus(value: string | null | undefined): string | null {
  const code = String(value ?? '').trim().toUpperCase()
  if (code === 'Y') return 'Delivered'
  if (code === 'N') return 'Not Delivered'

  return String(value ?? '').trim() || null
}

function mapPurchaseOrderLine(line: SapB1PurchaseOrderLineRaw): SapDocumentLine {
  const base = mapDocumentLine(line)
  const remarkParts = [line.U_MIS_ConsRe1, line.U_MIS_ConsRe2].map(part => String(part ?? '').trim()).filter(Boolean)

  return {
    ...base,
    lineRemarks: remarkParts.length ? remarkParts.join(' / ') : null,
    lineTotal: base.quantity && base.price != null ? base.quantity * base.price : undefined,
    projectCode: line.ProjectCode ?? null
  }
}
function mapPurchaseRequestLine(line: SapB1PurchaseRequestLineRaw): SapDocumentLine {
  const base = mapDocumentLine(line)

  return {
    ...base,
    lineRemarks: line.U_MIS_LineRemarks ?? null,
    inStock: line.U_MIS_InStock ?? null,
    lineVendor: line.LineVendor ? String(line.LineVendor).trim() || null : null
  }
}

export function mapServiceCall(raw: SapB1ServiceCallRaw): SapServiceCall | null {
  const docNum = Number(raw.DocNum)
  if (!Number.isFinite(docNum)) return null

  const status = String(raw.Status ?? '')

  return {
    docNum,
    docEntry: Number(raw.ServiceCallID ?? raw.DocEntry ?? 0),
    subject: String(raw.Subject ?? '').trim(),
    status,
    statusLabel: decodeWoStatus(status),
    createDate: String(raw.CreationDate ?? raw.CreateDate ?? ''),
    closeDate: raw.ClosingDate ?? raw.CloseDate ?? null,
    woDate: raw.U_MIS_WODate ?? null,
    unitNo: raw.U_MIS_UnitNo ?? null,
    hourMeter: raw.U_MIS_HoursMeter != null ? String(raw.U_MIS_HoursMeter) : null,
    modelNo: raw.U_MIS_ModeNo ?? null,
    serialNo: raw.U_MIS_SerialNo ?? null,
    project: raw.U_MIS_Project ?? null,
    jobCode: raw.U_MIS_JobCode ?? null,
    componentNo: raw.U_MIS_ComponentNo ?? null,
    subComponentNo: raw.U_MIS_SubCompNo ?? null,
    damageCode: raw.U_MIS_Damage ?? null,
    failCauseCode: raw.U_MIS_FailCause ?? null,
    malStartDate: raw.U_MIS_MalStartDt ?? null,
    malStartTime: raw.U_MIS_MalStartTm != null ? String(raw.U_MIS_MalStartTm) : null
  }
}

export function mapOrder(raw: SapB1OrderRaw): SapOrder | null {
  const docNum = Number(raw.DocNum)
  if (!Number.isFinite(docNum)) return null

  const docStatus = decodeDocStatus(resolveRawDocStatus(raw))
  const lines = (raw.DocumentLines ?? []).map(mapDocumentLine)

  return {
    docNum,
    docEntry: Number(raw.DocEntry ?? 0),
    docDate: String(raw.DocDate ?? ''),
    docDueDate: String(raw.DocDueDate ?? ''),
    cardCode: String(raw.CardCode ?? '').trim(),
    cardName: String(raw.CardName ?? '').trim(),
    docStatus: docStatus.code,
    docStatusLabel: docStatus.label,
    woNo: raw.U_MIS_WoNo != null ? String(raw.U_MIS_WoNo).trim() : null,
    project: raw.U_MIS_Project ?? null,
    unitNo: raw.U_MIS_UnitNo ?? null,
    modelNo: raw.U_MIS_ModeNo ?? null,
    serialNo: raw.U_MIS_SerialNo ?? null,
    hourMeter: raw.U_MIS_HoursMeter != null ? String(raw.U_MIS_HoursMeter) : null,
    location: raw.U_MIS_Location ?? null,
    priority: raw.U_MIS_Priority2 ?? null,
    priorityLabel: decodeMrPriority(raw.U_MIS_Priority2),
    jobCategory: raw.U_MIS_JobCategory ?? null,
    jobCategoryLabel: decodeMrJobCategory(raw.U_MIS_JobCategory),
    remarks: raw.Comments ?? null,
    rplBy: raw.U_MIS_Requested ?? null,
    checkedBy: raw.U_MIS_Checked ?? null,
    acknowledgeBy: raw.U_MIS_AcKnow ?? null,
    receivedBy: raw.U_MIS_Received ?? null,
    mrPreparedBy: raw.U_U_MIS_Created ?? null,
    closeStatus: raw.U_MIS_CLOSESTAT ?? null,
    lines
  }
}

export function mapPurchaseRequest(raw: SapB1PurchaseRequestRaw): SapPurchaseRequest | null {
  const docNum = Number(raw.DocNum)
  if (!Number.isFinite(docNum)) return null

  const docStatus = decodePrDocStatus(raw)
  const lines = (raw.DocumentLines ?? raw.PurchaseRequestLines ?? []).map(mapPurchaseRequestLine)

  return {
    docNum,
    docEntry: Number(raw.DocEntry ?? 0),
    docDate: String(raw.DocDate ?? ''),
    createDate: raw.CreationDate ?? null,
    requiredDate: raw.DocDueDate ?? null,
    docStatus: docStatus.code,
    docStatusLabel: docStatus.label,
    mrNo: raw.U_MIS_MRNo != null ? String(raw.U_MIS_MRNo).trim() : null,
    woNo: raw.U_MIS_WoNo != null ? String(raw.U_MIS_WoNo).trim() : null,
    unitNo: raw.U_MIS_UnitNo ?? null,
    hourMeter: raw.U_MIS_HoursMeter != null ? String(raw.U_MIS_HoursMeter) : null,
    priority: raw.U_MIS_Priority2 ?? null,
    priorityLabel: decodeMrPriority(raw.U_MIS_Priority2),
    docType: raw.DocType ?? null,
    docTypeLabel: decodePrDocType(raw.DocType),
    expStatus: raw.U_MIS_ExpStatus ?? null,
    expiredLabel: resolveExpiredLabel(raw),
    revision: raw.U_MIS_Revision ?? raw.U_MIS_PRRevNo ?? null,
    purpose: raw.U_MIS_IssuePurpose ?? null,
    requestor: raw.RequesterName ?? null,
    golNo: raw.U_ARK_GolNo ?? null,
    grNo: raw.U_U_MIS_GRNo ?? null,
    remarks: raw.Comments ?? null,
    preparedBy: raw.U_MIS_Prepared ?? null,
    prPreparedBy: raw.U_U_MIS_Created ?? null,
    approvedBy: raw.U_MIS_Approved1 ?? null,
    approvedBy2: raw.U_MIS_Approved2 ?? null,
    lines
  }
}

export function mapPurchaseOrder(raw: SapB1PurchaseOrderRaw): SapPurchaseOrder | null {
  const docNum = Number(raw.DocNum)
  if (!Number.isFinite(docNum)) return null

  const docStatus = decodePrDocStatus(raw)
  const lines = (raw.DocumentLines ?? []).map(mapPurchaseOrderLine)
  const docTotal = raw.DocTotal != null ? Number(raw.DocTotal) : null
  const vatSum = raw.VatSum != null ? Number(raw.VatSum) : null
  const totalDiscount = raw.TotalDiscount != null ? Number(raw.TotalDiscount) : null
  const docRate = raw.DocRate != null ? Number(raw.DocRate) : null
  const docCurrency = raw.DocCurrency ?? null
  const totalBeforeDiscount =
    docTotal != null && vatSum != null ? docTotal - vatSum + (totalDiscount ?? 0) : null
  const totalUsd =
    raw.DocTotalFc != null && Number(raw.DocTotalFc) > 0
      ? Number(raw.DocTotalFc)
      : docTotal != null && docRate != null && docRate > 0
        ? docTotal / docRate
        : null

  return {
    docNum,
    docEntry: Number(raw.DocEntry ?? 0),
    docDate: String(raw.DocDate ?? ''),
    docDueDate: String(raw.DocDueDate ?? ''),
    cardCode: String(raw.CardCode ?? '').trim(),
    cardName: String(raw.CardName ?? '').trim(),
    docStatus: docStatus.code,
    docStatusLabel: docStatus.label,
    docCurrency,
    docRate,
    prNo: raw.U_MIS_PRNo != null ? String(raw.U_MIS_PRNo).trim() : null,
    prRevNo: raw.U_MIS_PRRevNo ?? null,
    mrNo: raw.U_MIS_MRNo != null ? String(raw.U_MIS_MRNo).trim() : null,
    woNo: raw.U_MIS_WoNo != null ? String(raw.U_MIS_WoNo).trim() : null,
    unitNo: raw.U_MIS_UnitNo ?? null,
    orderType: raw.U_MIS_OrderType ?? null,
    budgetType: raw.U_ARK_BudgetType ?? null,
    poRevNo: raw.U_MIS_DocRefNo ?? null,
    deliveryStatus: raw.U_ARK_DelivStat ?? null,
    deliveryStatusLabel: decodePoDeliveryStatus(raw.U_ARK_DelivStat),
    deliveryTime: raw.U_MIS_DeliveryTime ?? null,
    costCenter: raw.U_MIS_CCDepartement ?? null,
    estArrival: raw.U_MIS_EstArrival ?? null,
    requiredDate: raw.U_MIS_RequiredDate ?? null,
    validTo: raw.U_MIS_ValidTo ?? null,
    leadTime: raw.U_MIS_LeadTime ?? null,
    expStatus: raw.U_MIS_ExpStatus ?? null,
    expiredLabel: resolvePoExpiredLabel(raw),
    remarks: raw.Comments ?? null,
    preparedBy: raw.U_MIS_Signature1 ?? null,
    approvedBy: raw.U_MIS_Signature2 ?? null,
    totalBeforeDiscount,
    totalDiscount,
    discountPercent: raw.DiscountPercent != null ? Number(raw.DiscountPercent) : null,
    taxAmount: vatSum,
    totalPaymentDue: docTotal,
    totalUsd,
    lines
  }
}

export function mapDeliveryNote(raw: SapB1DeliveryRaw): SapDeliveryNote | null {
  const docNum = Number(raw.DocNum)
  if (!Number.isFinite(docNum)) return null

  const docStatus = decodeDocStatus(resolveRawDocStatus(raw))
  const lines = (raw.DocumentLines ?? []).map(mapDocumentLine)

  return {
    docNum,
    docEntry: Number(raw.DocEntry ?? 0),
    docDate: String(raw.DocDate ?? ''),
    docStatus: docStatus.code,
    docStatusLabel: docStatus.label,
    woNo: raw.U_MIS_WoNo != null ? String(raw.U_MIS_WoNo).trim() : null,
    baOldCoreNo: raw.U_MIS_NoBA ?? null,
    remarks: raw.Comments ?? null,
    issuedBy: raw.U_MIS_IssuedBy ?? null,
    acknowledgeBy: raw.U_MIS_AcKnow ?? null,
    approvedBy: raw.U_MIS_Approved1 ?? null,
    lines
  }
}

export function mapOrderSummary(raw: SapB1OrderRaw): SapDocumentSummary | null {
  const docNum = Number(raw.DocNum)
  if (!Number.isFinite(docNum)) return null

  const docStatus = decodeDocStatus(resolveRawDocStatus(raw))
  const cardName = String(raw.CardName ?? '').trim()

  return {
    docNum,
    docEntry: raw.DocEntry != null ? Number(raw.DocEntry) : undefined,
    docDate: String(raw.DocDate ?? ''),
    docStatus: docStatus.code,
    docStatusLabel: docStatus.label,
    label: cardName ? `MR# ${docNum} — ${cardName}` : `MR# ${docNum}`
  }
}

export function mapPurchaseRequestSummary(raw: SapB1PurchaseRequestRaw): SapDocumentSummary | null {
  const docNum = Number(raw.DocNum)
  if (!Number.isFinite(docNum)) return null

  const docStatus = decodePrDocStatus(raw)

  return withExpiration(
    {
      docNum,
      docEntry: raw.DocEntry != null ? Number(raw.DocEntry) : undefined,
      docDate: String(raw.DocDate ?? ''),
      docStatus: docStatus.code,
      docStatusLabel: docStatus.label,
      label: `PR# ${docNum}`
    },
    raw
  )
}

export function mapServiceCallSummary(raw: SapB1ServiceCallRaw): SapDocumentSummary | null {
  const docNum = Number(raw.DocNum)
  if (!Number.isFinite(docNum)) return null

  const status = String(raw.Status ?? '')
  const subject = String(raw.Subject ?? '').trim()
  const project = String(raw.U_MIS_Project ?? '').trim() || null

  return {
    docNum,
    docDate: String(raw.CreationDate ?? raw.CreateDate ?? raw.U_MIS_WODate ?? ''),
    docStatus: status,
    docStatusLabel: decodeWoStatus(status),
    label: subject ? `WO# ${docNum} — ${subject}` : `WO# ${docNum}`,
    project
  }
}

export function mapDeliverySummary(raw: SapB1DeliveryRaw): SapDocumentSummary | null {
  const docNum = Number(raw.DocNum)
  if (!Number.isFinite(docNum)) return null

  const docStatus = decodeDocStatus(resolveRawDocStatus(raw))

  return {
    docNum,
    docEntry: raw.DocEntry != null ? Number(raw.DocEntry) : undefined,
    docDate: String(raw.DocDate ?? ''),
    docStatus: docStatus.code,
    docStatusLabel: docStatus.label,
    label: `MI# ${docNum}`
  }
}

export function mapPurchaseOrderSummary(raw: SapB1PurchaseOrderRaw): SapDocumentSummary | null {
  const docNum = Number(raw.DocNum)
  if (!Number.isFinite(docNum)) return null

  const docStatus = decodePrDocStatus(raw)
  const cardName = String(raw.CardName ?? '').trim()

  return withPoExpiration(
    {
      docNum,
      docDate: String(raw.DocDate ?? ''),
      docStatus: docStatus.code,
      docStatusLabel: docStatus.label,
      label: cardName ? `PO# ${docNum} — ${cardName}` : `PO# ${docNum}`
    },
    raw
  )
}
