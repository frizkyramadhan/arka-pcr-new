export type UnitComponentSummary = {
  idMod: number
  idComp: number
  compDesc: string
  compType: string | null
  policy: number | null
  replacementCount: number
  sosCount: number
  inspectionCount: number
  conditionCount: number
  hasPcrData: boolean
  condition?: string | null
  sosRating?: string | null
  fcRating?: string | null
  mpsRating?: string | null
  viRating?: string | null
  ta2Rating?: string | null
  edRating?: string | null
  lastInspectionDate?: string | null
  lastSosDate?: string | null
}

export type UnitSummaryResponse = {
  fleetUnitId: number
  fleetModelId: number
  unitHmCount: number
  components: UnitComponentSummary[]
  totals: {
    policies: number
    withPcrData: number
  }
}

// Backward compatibility for existing imports during transition.
export type EquipmentComponentSummary = UnitComponentSummary
export type EquipmentSummaryResponse = UnitSummaryResponse
