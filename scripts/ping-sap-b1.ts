/** Smoke test SAP B1 Service Layer connectivity (uses .env.local). */
import { pingSapB1 } from '@/lib/sap-b1/client'

async function main() {
  const result = await pingSapB1()
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 1)
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
