/**
 * Backfill Plant/Logistic justification + pair_index from legacy BA/kanibal data.
 * Usage: npm run migrate:backfill-ba-justification
 */
import { prisma } from '@/lib/prisma'

async function main() {
  const bas = await prisma.ba.findMany({
    where: { deletedAt: null },
    select: {
      idBa: true,
      noBa: true,
      symptom: true,
      failure: true,
      causedOther: true,
      plantP1UnitRfu: true,
      logisticNoStock: true
    }
  })

  let justificationUpdated = 0

  for (const ba of bas) {
    const text = `${ba.symptom} ${ba.failure} ${ba.causedOther}`.toUpperCase()
    const plantP1 = /P1|RFU/.test(text)
    const logisticNoStock = /NO STOCK|TIDAK ADA BARANG|LOGISTIC/.test(text)

    if (!ba.plantP1UnitRfu && !ba.logisticNoStock && (plantP1 || logisticNoStock)) {
      await prisma.ba.update({
        where: { idBa: ba.idBa },
        data: {
          plantP1UnitRfu: plantP1,
          logisticNoStock: logisticNoStock && !plantP1 ? true : logisticNoStock
        }
      })
      justificationUpdated += 1
    }
  }

  const kanibals = await prisma.kanibal.findMany({
    where: { deletedAt: null, pairIndex: null },
    orderBy: [{ noBa: 'asc' }, { idKanibal: 'asc' }]
  })

  const byBa = new Map<string, typeof kanibals>()
  for (const line of kanibals) {
    const list = byBa.get(line.noBa) ?? []
    list.push(line)
    byBa.set(line.noBa, list)
  }

  let pairUpdated = 0

  for (const [, lines] of byBa) {
    let pairIndex = 0
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i]
      if (line.type === 'REMOVE') {
        await prisma.kanibal.update({ where: { idKanibal: line.idKanibal }, data: { pairIndex } })
        pairUpdated += 1
      } else if (line.type === 'INSTALL') {
        await prisma.kanibal.update({ where: { idKanibal: line.idKanibal }, data: { pairIndex } })
        pairUpdated += 1
        pairIndex += 1
      }
    }
  }

  const asIsExists = await prisma.baComponentStatus.findFirst({ where: { status: 'AS IS REPAIR' } })
  if (!asIsExists) {
    const maxId = await prisma.baComponentStatus.aggregate({ _max: { idStatus: true } })
    await prisma.baComponentStatus.create({
      data: { idStatus: (maxId._max.idStatus ?? 4) + 1, status: 'AS IS REPAIR' }
    })
    console.log('Seeded ba_status: AS IS REPAIR')
  }

  console.log(`Justification backfill: ${justificationUpdated} BA updated`)
  console.log(`Pair index backfill: ${pairUpdated} kanibal rows updated`)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
