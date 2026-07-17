/** SAP Business One Service Layer — material lookup types for cannibal P/N. */

export type SapB1Material = {
  pn: string
  compDesc: string
  foreignName?: string | null
  itemsGroupCode?: number | null
  /** Total on-hand qty across warehouses (SAP `QuantityOnStock`) — null bila field tidak tersedia. */
  onHand?: number | null
}

export type SapB1LoginResponse = {
  SessionId?: string
  SessionTimeout?: number
  Version?: string
}

export type SapB1ItemsResponse = {
  value?: Array<{
    ItemCode?: string | null
    ItemName?: string | null
    ForeignName?: string | null
    ItemsGroupCode?: number | null
    /** Total on-hand qty across warehouses — valid scalar field on this SAP instance (verified via scripts/debug-sap-item-stock.ts). */
    QuantityOnStock?: number | null
  }>
  error?: {
    code?: number | string
    message?: { lang?: string; value?: string } | string
  }
}

export type SapB1ItemGroupsResponse = {
  value?: Array<{
    Number?: number | null
    GroupName?: string | null
  }>
}

/** SAP procurement document types exposed to PCR UI. */
export type SapDocumentType = 'wo' | 'mr' | 'pr' | 'po' | 'mi'

export type SapDocumentLine = {
  lineNum: number
  itemCode: string
  itemDescription: string
  quantity: number
  openQty?: number
  price: number
  currency: string
  whsCode?: string
  uom?: string | null
  lineRemarks?: string | null
  inStock?: string | number | null
  lineVendor?: string | null
  lineTotal?: number
  projectCode?: string | null
}

export type SapServiceCall = {
  docNum: number
  docEntry: number
  subject: string
  status: string
  statusLabel: string
  createDate: string
  closeDate?: string | null
  woDate?: string | null
  unitNo?: string | null
  hourMeter?: string | null
  modelNo?: string | null
  serialNo?: string | null
  project?: string | null
  jobCode?: string | null
  componentNo?: string | null
  subComponentNo?: string | null
  damageCode?: string | null
  failCauseCode?: string | null
  malStartDate?: string | null
  malStartTime?: string | null
  relatedMrs?: SapDocumentSummary[]
}

export type SapOrder = {
  docNum: number
  docEntry: number
  docDate: string
  docDueDate: string
  cardCode: string
  cardName: string
  docStatus: 'O' | 'C'
  docStatusLabel: string
  woNo?: string | null
  project?: string | null
  unitNo?: string | null
  modelNo?: string | null
  serialNo?: string | null
  hourMeter?: string | null
  location?: string | null
  priority?: string | null
  priorityLabel?: string | null
  jobCategory?: string | null
  jobCategoryLabel?: string | null
  remarks?: string | null
  rplBy?: string | null
  checkedBy?: string | null
  acknowledgeBy?: string | null
  receivedBy?: string | null
  mrPreparedBy?: string | null
  closeStatus?: string | null
  lines?: SapDocumentLine[]
  relatedPrs?: SapDocumentSummary[]
  relatedMis?: SapDocumentSummary[]
}

export type SapDeliveryNote = {
  docNum: number
  docEntry: number
  docDate: string
  docStatus: 'O' | 'C'
  docStatusLabel: string
  woNo?: string | null
  baOldCoreNo?: string | null
  remarks?: string | null
  issuedBy?: string | null
  acknowledgeBy?: string | null
  approvedBy?: string | null
  expStatus?: string | null
  validTo?: string | null
  expiredLabel?: string | null
  lines?: SapDocumentLine[]
}

export type SapPurchaseRequest = {
  docNum: number
  docEntry: number
  docDate: string
  createDate?: string | null
  requiredDate?: string | null
  docStatus: 'O' | 'C'
  docStatusLabel: string
  mrNo?: string | null
  woNo?: string | null
  unitNo?: string | null
  hourMeter?: string | null
  priority?: string | null
  priorityLabel?: string | null
  docType?: string | null
  docTypeLabel?: string | null
  expStatus?: string | null
  revision?: string | null
  purpose?: string | null
  requestor?: string | null
  golNo?: string | null
  grNo?: string | null
  remarks?: string | null
  preparedBy?: string | null
  prPreparedBy?: string | null
  approvedBy?: string | null
  approvedBy2?: string | null
  expiredLabel?: string | null
  lines?: SapDocumentLine[]
  relatedPos?: SapDocumentSummary[]
}

export type SapPurchaseOrder = {
  docNum: number
  docEntry: number
  docDate: string
  docDueDate: string
  cardCode: string
  cardName: string
  docStatus: 'O' | 'C'
  docStatusLabel: string
  docCurrency?: string | null
  docRate?: number | null
  prNo?: string | null
  prRevNo?: string | null
  mrNo?: string | null
  woNo?: string | null
  unitNo?: string | null
  orderType?: string | null
  buyer?: string | null
  budgetType?: string | null
  poRevNo?: string | null
  deliveryStatus?: string | null
  deliveryStatusLabel?: string | null
  deliveryTime?: string | null
  costCenter?: string | null
  costCenterName?: string | null
  costCenterLabel?: string | null
  estArrival?: string | null
  requiredDate?: string | null
  validTo?: string | null
  leadTime?: string | number | null
  expStatus?: string | null
  remarks?: string | null
  preparedBy?: string | null
  approvedBy?: string | null
  totalBeforeDiscount?: number | null
  totalDiscount?: number | null
  discountPercent?: number | null
  taxAmount?: number | null
  totalPaymentDue?: number | null
  totalUsd?: number | null
  expiredLabel?: string | null
  lines?: SapDocumentLine[]
}

export type SapDocument = SapServiceCall | SapOrder | SapPurchaseRequest | SapPurchaseOrder | SapDeliveryNote

export type SapDocumentSummary = {
  docNum: number
  docEntry?: number
  docDate: string
  docStatus: string
  docStatusLabel: string
  label: string
  project?: string | null
  expStatus?: string | null
  validTo?: string | null
  expiredLabel?: string | null
}

export type SapDocumentChainMrNode = SapDocumentSummary & {
  mis?: SapDocumentSummary[]
}

export type SapDocumentChainPath = {
  mr: SapDocumentChainMrNode
  pr: SapDocumentSummary | null
  po: SapDocumentSummary | null
}

export type SapDocumentChainWoLane = {
  label?: string
  wo: SapDocumentSummary | null
  paths: SapDocumentChainPath[]
}

export type SapDocumentChainPrBranch = {
  pr: SapDocumentSummary
  pos: SapDocumentSummary[]
}

export type SapDocumentChainBranch = {
  mr: SapDocumentSummary
  prs: SapDocumentChainPrBranch[]
}

export type SapDocumentChainResult = {
  lanes: SapDocumentChainWoLane[]
  wo: SapDocumentSummary | null
  branches: SapDocumentChainBranch[]
  anchors: {
    wo?: number | null
    mr?: number | null
    pr?: number | null
    po?: number | null
    woRemove?: number | null
    woInstall?: number | null
  }
  source: 'sap-b1'
}

export type SapB1ODataListResponse<T> = {
  value?: T[]
  error?: {
    code?: number | string
    message?: { lang?: string; value?: string } | string
  }
}

export type SapB1ServiceCallRaw = {
  DocNum?: number | null
  ServiceCallID?: number | null
  DocEntry?: number | null
  Subject?: string | null
  Status?: number | string | null
  CreateDate?: string | null
  CreationDate?: string | null
  CloseDate?: string | null
  ClosingDate?: string | null
  U_MIS_WODate?: string | null
  U_MIS_UnitNo?: string | null
  U_MIS_HoursMeter?: string | number | null
  U_MIS_ModeNo?: string | null
  U_MIS_SerialNo?: string | null
  U_MIS_Project?: string | null
  U_MIS_JobCode?: string | null
  U_MIS_ComponentNo?: string | null
  U_MIS_SubCompNo?: string | null
  U_MIS_Damage?: string | null
  U_MIS_FailCause?: string | null
  U_MIS_MalStartDt?: string | null
  U_MIS_MalStartTm?: string | number | null
}

export type SapB1OrderLineRaw = {
  LineNum?: number | null
  ItemCode?: string | null
  ItemDescription?: string | null
  Quantity?: number | null
  OpenQty?: number | null
  OpenQuantity?: number | null
  RemainingOpenQuantity?: number | null
  Price?: number | null
  UnitPrice?: number | null
  Currency?: string | null
  MeasureUnit?: string | null
  UoMCode?: string | null
  U_MIS_Uom?: string | null
  WarehouseCode?: string | null
  WhsCode?: string | null
}

export type SapB1OrderRaw = {
  DocNum?: number | null
  DocEntry?: number | null
  DocDate?: string | null
  DocDueDate?: string | null
  DocStatus?: string | null
  DocumentStatus?: string | null
  CardCode?: string | null
  CardName?: string | null
  U_MIS_WoNo?: string | number | null
  U_MIS_Project?: string | null
  U_MIS_UnitNo?: string | null
  U_MIS_ModeNo?: string | null
  U_MIS_SerialNo?: string | null
  U_MIS_HoursMeter?: string | number | null
  U_MIS_KiloMeter?: string | number | null
  U_MIS_Location?: string | null
  U_MIS_Priority2?: string | null
  U_MIS_JobCategory?: string | null
  Comments?: string | null
  U_MIS_Requested?: string | null
  U_MIS_Checked?: string | null
  U_MIS_AcKnow?: string | null
  U_MIS_Received?: string | null
  U_U_MIS_Created?: string | null
  U_MIS_CLOSESTAT?: string | null
  DocumentLines?: SapB1OrderLineRaw[]
}

export type SapB1PurchaseRequestLineRaw = SapB1OrderLineRaw & {
  MeasureUnit?: string | null
  U_MIS_LineRemarks?: string | null
  U_MIS_InStock?: string | number | null
  LineVendor?: string | null
}

export type SapB1PurchaseRequestRaw = {
  DocNum?: number | null
  DocEntry?: number | null
  DocDate?: string | null
  DocDueDate?: string | null
  CreationDate?: string | null
  DocType?: string | null
  DocStatus?: string | null
  DocumentStatus?: string | null
  Cancelled?: string | null
  Comments?: string | null
  RequesterName?: string | null
  U_MIS_MRNo?: string | number | null
  U_MIS_WoNo?: string | number | null
  U_MIS_UnitNo?: string | null
  U_MIS_HoursMeter?: string | number | null
  U_MIS_Priority2?: string | null
  U_MIS_ExpStatus?: string | null
  U_MIS_Revision?: string | null
  U_MIS_PRRevNo?: string | null
  U_MIS_IssuePurpose?: string | null
  U_ARK_GolNo?: string | null
  U_U_MIS_GRNo?: string | null
  U_MIS_Prepared?: string | null
  U_U_MIS_Created?: string | null
  U_MIS_Approved1?: string | null
  U_MIS_Approved2?: string | null
  DocumentLines?: SapB1PurchaseRequestLineRaw[]
  PurchaseRequestLines?: SapB1PurchaseRequestLineRaw[]
}

export type SapB1PurchaseOrderLineRaw = SapB1OrderLineRaw & {
  ProjectCode?: string | null
  U_MISMRNO?: string | number | null
  U_MIS_UnitNo?: string | null
  U_MIS_ConsRe1?: string | null
  U_MIS_ConsRe2?: string | null
  GrossPrice?: number | null
}

export type SapB1PurchaseOrderRaw = {
  DocNum?: number | null
  DocEntry?: number | null
  DocDate?: string | null
  DocDueDate?: string | null
  DocStatus?: string | null
  DocumentStatus?: string | null
  Cancelled?: string | null
  CardCode?: string | null
  CardName?: string | null
  DocCurrency?: string | null
  DocRate?: number | null
  DocTotal?: number | null
  DocTotalFc?: number | null
  VatSum?: number | null
  TotalDiscount?: number | null
  DiscountPercent?: number | null
  SalesPersonCode?: number | string | null
  Comments?: string | null
  U_MIS_PRNo?: string | number | null
  U_MIS_PRRevNo?: string | null
  U_MIS_MRNo?: string | number | null
  U_MIS_WoNo?: string | number | null
  U_MIS_UnitNo?: string | null
  U_MIS_OrderType?: string | null
  U_ARK_BudgetType?: string | null
  U_MIS_DocRefNo?: string | null
  U_ARK_DelivStat?: string | null
  U_MIS_DeliveryTime?: string | null
  U_MIS_CCDepartement?: string | null
  U_MIS_EstArrival?: string | null
  U_MIS_RequiredDate?: string | null
  U_MIS_ValidTo?: string | null
  U_MIS_LeadTime?: string | number | null
  U_MIS_ExpStatus?: string | null
  U_MIS_Signature1?: string | null
  U_MIS_Signature2?: string | null
  DocumentLines?: SapB1PurchaseOrderLineRaw[]
}

export type SapB1DeliveryLineRaw = SapB1OrderLineRaw & {
  BaseEntry?: number | null
  BaseType?: number | null
  BaseLine?: number | null
}

export type SapB1DeliveryRaw = {
  DocNum?: number | null
  DocEntry?: number | null
  DocDate?: string | null
  DocumentStatus?: string | null
  U_MIS_WoNo?: string | number | null
  U_MIS_NoBA?: string | null
  Comments?: string | null
  U_MIS_IssuedBy?: string | null
  U_MIS_AcKnow?: string | null
  U_MIS_Approved1?: string | null
  U_MIS_ExpStatus?: string | null
  U_MIS_ValidTo?: string | null
  DocumentLines?: SapB1DeliveryLineRaw[]
}
