/** Debug SAP document chain — run: npx tsx --env-file=.env.local scripts/debug-sap-document.ts wo 265151564 */
import { buildSapDocumentChain } from '@/lib/sap-b1/documents-service'

const woNo = process.argv[3] ?? '265151564'
const mrNo = process.argv[4] ?? ''

async function main() {
  const chain = await buildSapDocumentChain({
    woNo,
    mrNo: mrNo || null
  })

  console.log(
    JSON.stringify(
      {
        wo: chain.wo?.docNum,
        branchCount: chain.branches.length,
        branches: chain.branches.map(branch => ({
          mr: branch.mr.docNum,
          prs: branch.prs.map(entry => ({
            pr: entry.pr.docNum,
            pos: entry.pos.map(po => po.docNum)
          }))
        }))
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
