import path from 'path'

function resolveLegacyDatabaseUrl() {
  const explicit = process.env.LEGACY_DATABASE_URL?.trim()
  if (explicit) return explicit

  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (databaseUrl && /\barka_pcr_new\b/.test(databaseUrl)) {
    return databaseUrl.replace(/\barka_pcr_new\b/, 'arka_pcr_legacy')
  }

  return 'mysql://root:@localhost:3306/arka_pcr_legacy'
}

export const migrationConfig = {
  dataDir: process.env.MIGRATION_DATA_DIR ?? path.join(process.cwd(), 'data', 'migration'),
  legacySqlPath: process.env.LEGACY_SQL_PATH ?? path.join(process.cwd(), 'data', 'migration', 'legacy.sql'),
  legacyDatabaseUrl: resolveLegacyDatabaseUrl(),
  unitMappingCsv:
    process.env.UNIT_MAPPING_CSV ?? path.join(process.cwd(), 'data', 'migration', 'unit-mapping.csv'),
  modelMappingCsv:
    process.env.MODEL_MAPPING_CSV ?? path.join(process.cwd(), 'data', 'migration', 'model-mapping.csv')
}

export const migrationSteps = [
  'fleet_equipment_cache',
  'fleet_model_cache',
  'legacy_unit_mapping',
  'legacy_model_mapping',
  'user',
  'ba_lookup',
  'comp',
  'commod',
  'pcr_forecast',
  'hm',
  'replacement',
  'sos',
  'inspection',
  'condition',
  'pcr_forecast_approval',
  'ba',
  'ba_approval',
  'kanibal'
] as const

export type MigrationStep = (typeof migrationSteps)[number]
