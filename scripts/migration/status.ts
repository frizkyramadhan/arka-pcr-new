import fs from 'fs'
import path from 'path'

import { migrationConfig, migrationSteps } from './config'

/**
 * Print migration checklist and verify prepared files exist.
 * Full table import from legacy SQL will be implemented when dump is provided.
 *
 * Usage: npm run migrate:status
 */
function main() {
  console.log('ARKA PCR — Migration readiness\n')
  console.log('Target DB (Prisma):', process.env.DATABASE_URL ?? '(set DATABASE_URL)')
  console.log('Legacy staging DB:', migrationConfig.legacyDatabaseUrl)
  console.log('Data directory:', migrationConfig.dataDir)
  console.log('')

  const files = [
    { label: 'Legacy SQL dump', path: migrationConfig.legacySqlPath },
    { label: 'Unit mapping CSV', path: migrationConfig.unitMappingCsv },
    { label: 'Model mapping CSV', path: migrationConfig.modelMappingCsv }
  ]

  for (const file of files) {
    const exists = fs.existsSync(path.resolve(file.path))
    console.log(`${exists ? '[OK]' : '[--]'} ${file.label}: ${file.path}`)
  }

  console.log('\nImport order (Section 14 UPGRADE_PLAN):')
  migrationSteps.forEach((step, index) => {
    console.log(`  ${index}. ${step}`)
  })

  console.log('\nNext steps when SQL is ready:')
  console.log('  1. npm run migrate:prepare-live          (fleet + file checklist)')
  console.log('  2. Copy dump → data/migration/legacy.sql')
  console.log('  3. npm run migrate:import-legacy-sql')
  console.log('  4. npm run migrate:audit-legacy')
  console.log('  5. npm run migrate:unit-mapping')
  console.log('  6. npm run migrate:import-hm')
  console.log('  7. npm run migrate:import-replacements')
  console.log('  8. npm run migrate:import-sos')
  console.log('  9. npm run migrate:passwords')
  console.log('\nLocal UI testing (no fleet): npm run dev:seed-test → npm run dev:cleanup-test')
}

main()
