/**
 * TTL cache singleton untuk lookup dokumen/chain SAP B1 — mengurangi beban Service Layer
 * dan risiko limit sesi saat satu chain build memanggil dokumen yang sama berulang kali.
 * Pola sama seperti lib/fleet-api/client.ts (module-level Map + TTL), bukan Redis.
 */

const DEFAULT_TTL_MS = 45 * 1000

type CacheEntry<T> = {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

/** Ambil dari cache bila belum expired; null bila tidak ada / sudah expired. */
export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null

  if (entry.expiresAt <= Date.now()) {
    store.delete(key)

    return null
  }

  return entry.data as T
}

export function setCached<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

/** Ambil dari cache, atau jalankan `fetcher` dan simpan hasilnya (termasuk null). */
export async function withCache<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = DEFAULT_TTL_MS): Promise<T> {
  const cached = getCached<T>(key)
  if (cached !== null) return cached

  const data = await fetcher()
  setCached(key, data, ttlMs)

  return data
}

export function invalidateCached(key: string): void {
  store.delete(key)
}

/** Bersihkan seluruh cache — dipakai di test / setelah invalidasi sesi SAP. */
export function clearSapDocumentCache(): void {
  store.clear()
}

export function buildDocCacheKey(entity: string, docNum: number | string): string {
  return `doc:${entity}:${docNum}`
}

export function buildChainCacheKey(rootType: string, rootDocNum: number | string): string {
  return `chain:${rootType}:${rootDocNum}`
}

export { DEFAULT_TTL_MS }
