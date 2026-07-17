/**
 * RUL by AI (statistik) — estimasi Remaining Useful Life tambahan berbasis regresi linear
 * least-squares atas histori HM unit, sebagai INFO TAMBAHAN di samping Life % / Next Replacement
 * Date yang sudah dipakai user (lihat lib/calculations/life.ts & lib/replacement/component-detail.ts).
 * Tidak menggantikan perhitungan yang sudah ada — hanya memberi rate & rentang tanggal yang lebih
 * stabil karena memakai seluruh titik data (bukan cuma 2 titik rata-rata 3 bulan).
 *
 * Murni matematika (least-squares manual) — tidak ada dependency ML/statistik baru, tidak ada I/O.
 */

export type RulHmReading = {
  date: Date
  hmUnit: number
}

export type RulEstimateResult = {
  /** Tanggal proyeksi saat currentLife diperkirakan mencapai policy. */
  estimatedDate: Date
  /** Batas bawah rentang keyakinan (skenario rate lebih cepat — reach lebih cepat). */
  confidenceLowDate: Date | null
  /** Batas atas rentang keyakinan (skenario rate lebih lambat — reach lebih lambat). */
  confidenceHighDate: Date | null
  method: 'LINEAR_REGRESSION_V1'
  /** Jumlah titik data HM yang dipakai dalam regresi. */
  dataPoints: number
  /** Rate harian hasil regresi (HM/hari) — analog `whDay` tapi dari least-squares, bukan 2 titik. */
  dailyRate: number
  /**
   * AI #8 — rekomendasi kapan sebaiknya PR diajukan (estimatedDate - avgLeadTimeDays SAP),
   * null bila belum ada cukup sample lead-time. Diisi via applyLeadTimeRecommendation, bukan
   * dihitung di estimateRulByRegression (helper ini murni, tanpa I/O ke DB).
   */
  recommendedProcurementDate: Date | null
}

const MIN_DATA_POINTS = 2
const REGRESSION_WINDOW_MONTHS = 12
const MIN_POINTS_FOR_WINDOW = 3

function addDays(base: Date, days: number): Date {
  const result = new Date(base.getTime())
  result.setDate(result.getDate() + Math.round(days))

  return result
}

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
}

/** Pilih window 6-12 bulan terakhir; fallback ke semua data bila kurang dari MIN_POINTS_FOR_WINDOW titik. */
function selectRegressionWindow(readings: RulHmReading[]): RulHmReading[] {
  const sorted = [...readings].sort((a, b) => a.date.getTime() - b.date.getTime())
  const windowStart = new Date()
  windowStart.setMonth(windowStart.getMonth() - REGRESSION_WINDOW_MONTHS)

  const windowed = sorted.filter(r => r.date >= windowStart)

  return windowed.length >= MIN_POINTS_FOR_WINDOW ? windowed : sorted
}

/**
 * Regresi linear least-squares y = a + b*x, x = hari sejak titik data pertama.
 * Return null bila data kurang dari 2 titik berbeda tanggal, rate <= 0 (tidak naik / turun —
 * tidak bisa diproyeksikan maju), atau komponen sudah overdue (currentLife >= policy).
 */
export function estimateRulByRegression(
  hmReadings: RulHmReading[],
  currentLife: number,
  policy: number
): RulEstimateResult | null {
  if (!Number.isFinite(policy) || policy <= 0) return null
  if (!Number.isFinite(currentLife)) return null

  const points = selectRegressionWindow(hmReadings.filter(r => Number.isFinite(r.hmUnit) && r.date instanceof Date))
  if (points.length < MIN_DATA_POINTS) return null

  const x0 = points[0].date
  const xs = points.map(r => daysBetween(x0, r.date))
  const ys = points.map(r => r.hmUnit)
  const n = points.length

  // Perlu minimal 2 titik dengan x berbeda (tanggal berbeda) — kalau semua sama, slope tidak terdefinisi.
  const xRange = Math.max(...xs) - Math.min(...xs)
  if (xRange <= 0) return null

  const sumX = xs.reduce((sum, x) => sum + x, 0)
  const sumY = ys.reduce((sum, y) => sum + y, 0)
  const meanX = sumX / n
  const meanY = sumY / n

  let sxy = 0
  let sxx = 0

  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX
    sxy += dx * (ys[i] - meanY)
    sxx += dx * dx
  }

  const slope = sxy / sxx
  const intercept = meanY - slope * meanX

  if (!Number.isFinite(slope) || slope <= 0) return null

  const remaining = policy - currentLife

  // Komponen sudah overdue (currentLife >= policy) — proyeksi maju tidak relevan lagi
  // (ekstrapolasi mundur hanya menghasilkan tanggal masa lalu yang membingungkan di UI).
  if (remaining <= 0) return null

  const today = new Date()
  const daysToReach = remaining / slope
  const estimatedDate = addDays(today, daysToReach)

  // Standard error of the slope — dipakai sebagai rentang keyakinan rate (bukan interval prediksi
  // penuh, disederhanakan agar tetap "pure math" tanpa tabel distribusi-t).
  let confidenceLowDate: Date | null = null
  let confidenceHighDate: Date | null = null

  if (n > 2) {
    let sse = 0

    for (let i = 0; i < n; i += 1) {
      const predicted = intercept + slope * xs[i]
      const residual = ys[i] - predicted
      sse += residual * residual
    }

    const residualVariance = sse / (n - 2)
    const slopeStdError = Math.sqrt(residualVariance / sxx)

    const fastRate = slope + slopeStdError
    const slowRate = slope - slopeStdError

    if (fastRate > 0) {
      confidenceLowDate = addDays(today, remaining / fastRate)
    }

    if (slowRate > 0) {
      confidenceHighDate = addDays(today, remaining / slowRate)
    }
  }

  return {
    estimatedDate,
    confidenceLowDate,
    confidenceHighDate,
    method: 'LINEAR_REGRESSION_V1',
    dataPoints: n,
    dailyRate: slope,
    recommendedProcurementDate: null
  }
}

/** AI #8 — sample lead-time SAP (PR→PO) yang sudah diagregasi, dari lib/sap-b1/lead-time.ts. */
export type LeadTimeStatsInput = {
  avgLeadTimeDays: number
  sampleCount: number
}

/** Minimal sample per kategori compType sebelum rekomendasi ditampilkan — hindari menyesatkan saat data masih sedikit. */
export const LEAD_TIME_MIN_SAMPLE_COUNT_DEFAULT = 5

/**
 * AI #8 — tempel recommendedProcurementDate ke hasil estimateRulByRegression (AI #1), dari
 * rata-rata lead-time SAP per kategori komponen. Hanya diisi bila sample cukup, supaya tidak
 * menyesatkan saat data historis masih sedikit.
 */
export function applyLeadTimeRecommendation(
  rul: RulEstimateResult,
  leadTime: LeadTimeStatsInput | null,
  minSampleCount: number = LEAD_TIME_MIN_SAMPLE_COUNT_DEFAULT
): RulEstimateResult {
  if (!leadTime || leadTime.sampleCount < minSampleCount) {
    return rul
  }

  return {
    ...rul,
    recommendedProcurementDate: addDays(rul.estimatedDate, -leadTime.avgLeadTimeDays)
  }
}
