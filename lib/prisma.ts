import { PrismaClient } from '@prisma/client'

/** Bump saat konfigurasi client berubah agar dev server tidak pakai instance Prisma lama. */
const PRISMA_SINGLETON_KEY = 'prisma_mysql_library_v1'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaSingletonKey?: string
}

/** Pastikan koneksi direct MySQL (bukan Prisma Accelerate `prisma://`). */
function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim()

  if (!url) {
    throw new Error('DATABASE_URL tidak diset. Isi mysql://... di .env.local')
  }

  if (url.startsWith('prisma://') || url.startsWith('prisma+')) {
    throw new Error(
      'DATABASE_URL memakai Prisma Accelerate (prisma://). Untuk Laragon lokal gunakan mysql://root:@localhost:3306/arka_pcr_new'
    )
  }

  if (!url.startsWith('mysql://')) {
    throw new Error(`DATABASE_URL harus mysql:// untuk development lokal (saat ini: ${url.split(':')[0]}://...)`)
  }

  return url
}

if (
  globalForPrisma.prisma &&
  globalForPrisma.prismaSingletonKey !== PRISMA_SINGLETON_KEY
) {
  void globalForPrisma.prisma.$disconnect()
  globalForPrisma.prisma = undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: resolveDatabaseUrl() }
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaSingletonKey = PRISMA_SINGLETON_KEY
}
