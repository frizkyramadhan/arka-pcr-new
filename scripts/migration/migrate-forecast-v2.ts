/**
 * Post-migration helper: backfill ba_pcr rows for OPEN forecasts still on PENDING BA,
 * and backfill no_ba_pcr for submitted rows missing document numbers.
 *
 * Run after: npx prisma migrate deploy
 * Usage: npx tsx scripts/migration/migrate-forecast-v2.ts
 */
import { prisma } from '../../lib/prisma'
import { formatBaPcrNumber, nextBaPcrSequence } from '../../lib/forecasts/ba-pcr-number'

async function main() {
  const withoutBa = await prisma.pcrForecast.findMany({
    where: { deletedAt: null, baPcrs: { none: {} } },
    select: { idForecast: true }
  })

  console.log(`Forecasts without ba_pcr row: ${withoutBa.length} (no action — BA created on submit)`)

  const missingNo = await prisma.baPcr.findMany({
    where: { noBaPcr: null, baPcrStatus: { not: 'PENDING' } },
    include: { forecast: { select: { projectCode: true, planPeriod: true } } }
  })

  for (const ba of missingNo) {
    const date = ba.baPcrDate ?? ba.forecast.planPeriod ?? new Date()
    await prisma.$transaction(async tx => {
      const seq = await nextBaPcrSequence(tx, ba.forecast.projectCode, date)
      const noBaPcr = formatBaPcrNumber(seq, ba.forecast.projectCode, date)
      await tx.baPcr.update({
        where: { idBaPcr: ba.idBaPcr },
        data: { noBaPcr }
      })
    })
    console.log(`Backfilled no_ba_pcr for ba_pcr #${ba.idBaPcr}`)
  }

  console.log('Done.')
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
