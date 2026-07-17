import { execSync } from 'child_process'

const steps: { name: string; cmd: string }[] = [
  { name: 'Fleet cache sync', cmd: 'npm run fleet:sync' },
  { name: 'Generate mappings', cmd: 'npm run migrate:generate-mappings' },
  { name: 'Import unit mapping', cmd: 'npm run migrate:unit-mapping' },
  { name: 'Import model mapping', cmd: 'npm run migrate:model-mapping' },
  { name: 'BA lookup', cmd: 'npm run migrate:import-ba-lookup' },
  { name: 'Comp', cmd: 'npm run migrate:import-comp' },
  { name: 'Commod', cmd: 'npm run migrate:import-commod' },
  { name: 'HM', cmd: 'npm run migrate:import-hm' },
  { name: 'Replacement', cmd: 'npm run migrate:import-replacements' },
  { name: 'SOS', cmd: 'npm run migrate:import-sos' },
  { name: 'Inspection', cmd: 'npm run migrate:import-inspections' },
  { name: 'Recompute conditions', cmd: 'npm run migrate:recompute-conditions' },
  { name: 'BA', cmd: 'npm run migrate:import-ba' },
  { name: 'BA approval seed', cmd: 'npm run migrate:seed-ba-approval' },
  { name: 'Kanibal', cmd: 'npm run migrate:import-kanibal' }
]

/**
 * Run data migration steps into staging DB (after legacy SQL + mappings).
 * Usage: npm run migrate:run-staging
 */
function main() {
  console.log('ARKA PCR — staging data migration\n')

  for (const step of steps) {
    console.log(`\n=== ${step.name} ===`)
    execSync(step.cmd, { stdio: 'inherit', cwd: process.cwd() })
  }

  console.log('\nStaging migration pipeline completed.')
}

main()
