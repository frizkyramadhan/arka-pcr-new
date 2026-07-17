import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildChainCacheKey,
  buildDocCacheKey,
  clearSapDocumentCache,
  getCached,
  invalidateCached,
  setCached,
  withCache
} from '@/lib/sap-b1/cache'

describe('sap-b1 cache', () => {
  beforeEach(() => {
    clearSapDocumentCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for missing key', () => {
    expect(getCached('missing')).toBeNull()
  })

  it('stores and returns cached value before TTL expires', () => {
    setCached('key-1', { value: 42 }, 1000)
    expect(getCached('key-1')).toEqual({ value: 42 })
  })

  it('expires entries after TTL', () => {
    setCached('key-2', 'data', 1000)
    vi.advanceTimersByTime(1001)
    expect(getCached('key-2')).toBeNull()
  })

  it('withCache calls fetcher once on cache miss, reuses cache on second call', async () => {
    const fetcher = vi.fn().mockResolvedValue('result')

    const first = await withCache('key-3', fetcher, 5000)
    const second = await withCache('key-3', fetcher, 5000)

    expect(first).toBe('result')
    expect(second).toBe('result')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('withCache re-fetches after TTL expiry', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')

    await withCache('key-4', fetcher, 1000)
    vi.advanceTimersByTime(1001)
    const second = await withCache('key-4', fetcher, 1000)

    expect(second).toBe('second')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('invalidateCached removes a single key', () => {
    setCached('key-5', 'data', 5000)
    invalidateCached('key-5')
    expect(getCached('key-5')).toBeNull()
  })

  it('builds stable doc and chain cache keys', () => {
    expect(buildDocCacheKey('Orders', 123)).toBe('doc:Orders:123')
    expect(buildChainCacheKey('wo', 456)).toBe('chain:wo:456')
  })
})
