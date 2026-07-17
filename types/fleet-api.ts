export interface FleetProject {
  project_code: string
  bowheer: string
  location: string
}

export interface FleetUnit {
  id: number
  unit_no: string
  description: string
  active_date: string | null
  nomor_polisi: string | null
  serial_no: string | null
  chasis_no: string | null
  engine_model: string | null
  machine_no: string | null
  bahan_bakar: string | null
  warna: string | null
  capacity: string | null
  remarks: string | null
  project_code: string
  project_id: number
  plant_group: string
  plant_group_id: number
  model: string
  model_id: number
  manufacture: string
  unitstatus: 'ACTIVE' | 'IN-ACTIVE' | string
  unitstatus_id: number
  asset_category: string
  asset_category_id: number
  plant_type: string
  plant_type_id: number
}

export interface FleetUnitOption {
  id: number
  unit_no: string
  description: string
  project_code: string
  model_id: number
  model: string
  manufacture: string
  unitstatus: string
}

// Backward compatibility for existing imports during transition.
export type FleetEquipment = FleetUnit
export type FleetEquipmentOption = FleetUnitOption
