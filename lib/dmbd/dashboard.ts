/**
 * Angka dashboard Daily Monitoring Unit Breakdown.
 * Site = project. Plant = plant type unit. Category = plant group.
 * Ready = tidak ada breakdown yang masih terbuka pada waktu acuan.
 * Waiting part = activity terakhir B3, B10, atau B11.
 * Under repair = activity terakhir B0, B01–B04, B1, atau B9.
 * Breakdown = unit terbuka selain dua kelompok itu.
 * Lost hours = jumlah umur breakdown yang masih terbuka.
 * MTTR today = rata-rata jam perbaikan yang selesai pada hari yang dipilih.
 * MTD = bulan yang dipilih. YTD = 1 Januari sampai akhir bulan itu, dipotong hari ini.
 * Pada mode itu MTTR, lost hours, tren, dan baris yang pernah breakdown memakai rentang periode.
 * MTTR, MTBF, dan PA memakai rumus dashboard maintenance: MTTR = rata-rata durasi yang selesai
 * di periode, MTBF = jam HM ÷ jumlah breakdown yang mulai di periode, PA = jam kalender unit ACTIVE
 * dikurangi downtime breakdown (tumpang tindih per unit digabung).
 */
import { downtimeHoursFor } from '@/lib/dmbd/breakdowns'
import { localDateOnly } from '@/lib/dmbd/payload'
import { toWallClockIso } from '@/lib/utils/wall-clock'

export const DMBD_TREND_DAYS = 7

const WAITING_PART_CODES = new Set(['B3', 'B10', 'B11'])

const UNDER_REPAIR_CODES = new Set(['B0', 'B01', 'B02', 'B03', 'B04', 'B1', 'B9'])

const STATUS_FILTERS = new Set(['breakdown', 'waiting_part', 'under_repair', 'ready'])

export type DmbdBucket = 'breakdown' | 'waiting_part' | 'under_repair' | 'ready'

export type DmbdUnit = {
  fleetUnitId: number
  unitNo: string
  modelName: string | null
  projectCode: string
  plantType: string | null
  plantGroup: string | null
  unitStatus?: string | null
}

export type DmbdActivity = {
  startedAt: Date
  createdAt: Date
  positionStatus: string
  breakdownCode: string
  breakdownCodeName: string
  details: string
  technicianName: string | null
}

export type DmbdEpisode = {
  id: string
  fleetUnitId: number
  startedAt: Date
  finishedAt: Date | null
  problem: string
  hourMeter: number | null
  componentName: string | null
  componentCode: string | null
  mechanicLeaderName: string | null
  preparedBy: string | null
  activities: DmbdActivity[]
}

export type DmbdTableRow = {
  id: string
  fleetUnitId: number
  site: string
  unitNo: string
  model: string | null
  category: string | null
  plant: string | null
  status: string
  bucket: DmbdBucket
  startedAt: string | null
  ageHours: number | null
  hourMeter: number | null
  problem: string | null
  pic: string | null
}

type LiveUnit = {
  unit: DmbdUnit
  bucket: DmbdBucket
  status: string
  episode: DmbdEpisode | null
  ageHours: number | null
  pic: string | null
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function mean(values: number[]): number | null {
  if (!values.length) return null

  return round1(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function bucketForCode(code: string | null | undefined): Exclude<DmbdBucket, 'ready'> {
  const key = (code ?? '').trim().toUpperCase()
  if (WAITING_PART_CODES.has(key)) return 'waiting_part'
  if (UNDER_REPAIR_CODES.has(key)) return 'under_repair'

  return 'breakdown'
}

function previousDay(asOf: Date): Date {
  const day = new Date(asOf)
  day.setDate(day.getDate() - 1)

  return day
}

export type DmbdPeriodMode = 'MTD' | 'YTD'

export type DmbdPeriodWindow = {
  mode: DmbdPeriodMode
  year: number
  month: number
  periodStart: Date
  asOf: Date
  previousStart: Date
  previousAsOf: Date
}

function monthEnd(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999)
}

/** MTD = tanggal 1 bulan terpilih. YTD = 1 Januari. Akhir periode tidak melewati sekarang. */
export function resolveDashboardPeriod(period: string | undefined, mode: DmbdPeriodMode, now: Date): DmbdPeriodWindow {
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const key = /^\d{4}-\d{2}$/.test(period ?? '') ? period! : fallback
  let year = Number(key.slice(0, 4))
  let month = Number(key.slice(5, 7))
  const selected = new Date(year, month - 1, 1)
  const current = new Date(now.getFullYear(), now.getMonth(), 1)
  if (selected > current) {
    year = now.getFullYear()
    month = now.getMonth() + 1
  }

  const end = monthEnd(year, month)
  const asOf = end.getTime() > now.getTime() ? now : end
  const periodStart = mode === 'YTD' ? new Date(year, 0, 1, 0, 0, 0, 0) : new Date(year, month - 1, 1, 0, 0, 0, 0)

  if (mode === 'YTD') {
    return {
      mode,
      year,
      month,
      periodStart,
      asOf,
      previousStart: new Date(year - 1, 0, 1, 0, 0, 0, 0),
      previousAsOf: monthEnd(year - 1, month)
    }
  }

  const previous = new Date(year, month - 2, 1)

  return {
    mode,
    year,
    month,
    periodStart,
    asOf,
    previousStart: new Date(previous.getFullYear(), previous.getMonth(), 1, 0, 0, 0, 0),
    previousAsOf: monthEnd(previous.getFullYear(), previous.getMonth() + 1)
  }
}

/** Hari ini memakai waktu sekarang. Hari lain memakai akhir hari itu. */
export function resolveDashboardAsOf(date: string | undefined, now: Date): Date {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return now
  if (localDateOnly(now) === date) return now

  const [year, month, day] = date.split('-').map(Number)
  const end = new Date(year, month - 1, day, 23, 59, 59, 999)
  if (Number.isNaN(end.getTime()) || end.getTime() > now.getTime()) return now

  return end
}

function covering(rows: DmbdEpisode[], at: Date): DmbdEpisode | null {
  let best: DmbdEpisode | null = null
  for (const row of rows) {
    if (row.startedAt > at) continue
    if (row.finishedAt && row.finishedAt <= at) continue
    if (!best || row.startedAt > best.startedAt) best = row
  }

  return best
}

function activityAt(rows: DmbdActivity[], at: Date): DmbdActivity | null {
  let best: DmbdActivity | null = null
  for (const row of rows) {
    if (row.startedAt > at) continue
    if (
      !best ||
      row.startedAt > best.startedAt ||
      (row.startedAt.getTime() === best.startedAt.getTime() && row.createdAt > best.createdAt)
    ) {
      best = row
    }
  }

  return best
}

function latestEpisode(rows: DmbdEpisode[]): DmbdEpisode | null {
  let best: DmbdEpisode | null = null
  for (const row of rows) {
    if (!best || row.startedAt > best.startedAt) best = row
  }

  return best
}

function personInCharge(episode: DmbdEpisode | null, at: Date): string | null {
  if (!episode) return null
  const activity = activityAt(episode.activities, at) ?? episode.activities[episode.activities.length - 1]
  const name = episode.mechanicLeaderName || activity?.technicianName || episode.preparedBy || ''

  return name.trim() || null
}

function overlapsPeriod(episode: DmbdEpisode, periodStart: Date, asOf: Date): boolean {
  if (episode.startedAt > asOf) return false
  if (episode.finishedAt && episode.finishedAt < periodStart) return false

  return true
}

/** Episode yang memotong periode. Yang mulai paling akhir yang dipakai. */
function episodeInPeriod(rows: DmbdEpisode[], periodStart: Date, asOf: Date): DmbdEpisode | null {
  let best: DmbdEpisode | null = null
  for (const row of rows) {
    if (!overlapsPeriod(row, periodStart, asOf)) continue
    if (!best || row.startedAt > best.startedAt) best = row
  }

  return best
}

function liveInPeriod(unit: DmbdUnit, rows: DmbdEpisode[], periodStart: Date, asOf: Date): LiveUnit {
  const episode = episodeInPeriod(rows, periodStart, asOf)
  if (!episode) {
    return { unit, bucket: 'ready', status: 'RFU', episode: null, ageHours: null, pic: null }
  }

  const stillOpen = !episode.finishedAt || episode.finishedAt > asOf
  const at = stillOpen ? asOf : episode.finishedAt!
  if (!stillOpen) {
    return {
      unit,
      bucket: 'ready',
      status: 'RFU',
      episode,
      ageHours: downtimeHoursFor(episode.startedAt, episode.finishedAt, asOf),
      pic: personInCharge(episode, at)
    }
  }

  const activity = activityAt(episode.activities, at)

  return {
    unit,
    bucket: bucketForCode(activity?.breakdownCode),
    status: activity?.positionStatus || 'BD',
    episode,
    ageHours: downtimeHoursFor(episode.startedAt, null, asOf),
    pic: personInCharge(episode, at)
  }
}

function overlapHours(startedAt: Date, finishedAt: Date | null, windowStart: Date, windowEnd: Date): number {
  const start = Math.max(startedAt.getTime(), windowStart.getTime())
  const end = Math.min((finishedAt ?? windowEnd).getTime(), windowEnd.getTime())
  if (end <= start) return 0

  return (end - start) / 3600000
}

function periodLostHours(unitIds: Set<number>, episodes: Map<number, DmbdEpisode[]>, windowStart: Date, windowEnd: Date): number {
  let total = 0
  for (const [fleetUnitId, list] of episodes) {
    if (!unitIds.has(fleetUnitId)) continue
    for (const episode of list) total += overlapHours(episode.startedAt, episode.finishedAt, windowStart, windowEnd)
  }

  return round1(total)
}

function mttrInRange(unitIds: Set<number>, episodes: Map<number, DmbdEpisode[]>, windowStart: Date, windowEnd: Date): number | null {
  const durations: number[] = []
  for (const [fleetUnitId, list] of episodes) {
    if (!unitIds.has(fleetUnitId)) continue
    for (const episode of list) {
      if (!episode.finishedAt || episode.finishedAt < windowStart || episode.finishedAt > windowEnd) continue
      durations.push(downtimeHoursFor(episode.startedAt, episode.finishedAt, windowEnd))
    }
  }

  return mean(durations)
}

function liveAt(unit: DmbdUnit, rows: DmbdEpisode[], at: Date): LiveUnit {
  const open = covering(rows, at)
  if (!open) {
    const last = latestEpisode(rows)

    return { unit, bucket: 'ready', status: 'RFU', episode: last, ageHours: null, pic: personInCharge(last, at) }
  }

  const activity = activityAt(open.activities, at)

  return {
    unit,
    bucket: bucketForCode(activity?.breakdownCode),
    status: activity?.positionStatus || 'BD',
    episode: open,
    ageHours: downtimeHoursFor(open.startedAt, null, at),
    pic: personInCharge(open, at)
  }
}

function population(units: DmbdUnit[], plant?: string, category?: string): DmbdUnit[] {
  return units.filter(unit => {
    if (plant && (unit.plantType || '') !== plant) return false
    if (category && (unit.plantGroup || '') !== category) return false

    return true
  })
}

function summarize(lives: LiveUnit[], episodes: Map<number, DmbdEpisode[]>, asOf: Date) {
  let breakdown = 0
  let waitingPart = 0
  let underRepair = 0
  let ready = 0
  let lost = 0

  for (const live of lives) {
    if (live.bucket === 'breakdown') breakdown += 1
    else if (live.bucket === 'waiting_part') waitingPart += 1
    else if (live.bucket === 'under_repair') underRepair += 1
    else ready += 1
    if (live.ageHours != null) lost += live.ageHours
  }

  const day = localDateOnly(asOf)
  const durations: number[] = []
  for (const live of lives) {
    for (const episode of episodes.get(live.unit.fleetUnitId) ?? []) {
      if (!episode.finishedAt || localDateOnly(episode.finishedAt) !== day) continue
      durations.push(downtimeHoursFor(episode.startedAt, episode.finishedAt, asOf))
    }
  }

  return {
    totalUnits: lives.length,
    breakdown,
    waitingPart,
    underRepair,
    ready,
    lostHours: round1(lost),
    mttrHours: mean(durations)
  }
}

function delta(current: number, previous: number): number {
  return round1(current - previous)
}

function toRow(live: LiveUnit): DmbdTableRow {
  const episode = live.episode

  return {
    id: live.bucket === 'ready' || !episode ? `ready-${live.unit.fleetUnitId}` : episode.id,
    fleetUnitId: live.unit.fleetUnitId,
    site: live.unit.projectCode,
    unitNo: live.unit.unitNo,
    model: live.unit.modelName,
    category: live.unit.plantGroup,
    plant: live.unit.plantType,
    status: live.status,
    bucket: live.bucket,
    startedAt: live.bucket === 'ready' || !episode ? null : toWallClockIso(episode.startedAt),
    ageHours: live.ageHours,
    hourMeter: episode?.hourMeter ?? null,
    problem: episode?.problem ?? null,
    pic: live.pic
  }
}

function topCounts(entries: Map<string, number>, limit: number) {
  return [...entries.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}

function uniqueLabels(values: Array<string | null>): string[] {
  return [...new Set(values.map(value => (value || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export type DmbdHmReading = { iso: string; hm: number }

export type DmbdReliability = {
  mttr: { value: number | null; count: number }
  mtbf: { value: number | null; failures: number; runHours: number }
  pa: { value: number | null; units: number; downtimeHours: number; calendarHours: number }
}

/** Kenaikan HM yang masuk akal, sama dengan operatingHours dashboard maintenance. */
function operatingHours(readings: Map<number, DmbdHmReading[]>, unitIds: Set<number>, start: string, end: string): number {
  let total = 0
  for (const unitId of unitIds) {
    const list = (readings.get(unitId) ?? []).filter(item => item.hm > 0 && item.iso <= end)
    for (let index = 1; index < list.length; index += 1) {
      const previous = list[index - 1]
      const current = list[index]
      if (current.iso < start) continue
      const increase = current.hm - previous.hm
      const elapsed = (new Date(`${current.iso}T00:00:00`).getTime() - new Date(`${previous.iso}T00:00:00`).getTime()) / 3600000
      if (increase > 0 && increase <= elapsed) total += increase
    }
  }

  return total
}

function isActiveUnit(unit: DmbdUnit): boolean {
  if (unit.unitStatus == null || unit.unitStatus === '') return true

  return unit.unitStatus.toUpperCase() === 'ACTIVE'
}

/** Downtime per unit digabung bila episode tumpang tindih, lalu dijumlah. */
function mergedDowntimeHours(episodes: DmbdEpisode[], unitIds: Set<number>, windowStart: Date, windowEnd: Date): number {
  const spans = new Map<number, [number, number][]>()
  for (const episode of episodes) {
    if (!unitIds.has(episode.fleetUnitId)) continue
    const start = Math.max(episode.startedAt.getTime(), windowStart.getTime())
    const end = Math.min((episode.finishedAt ?? windowEnd).getTime(), windowEnd.getTime())
    if (end <= start) continue
    const list = spans.get(episode.fleetUnitId) ?? []
    list.push([start, end])
    spans.set(episode.fleetUnitId, list)
  }

  let total = 0
  for (const list of spans.values()) {
    list.sort((a, b) => a[0] - b[0])
    let [from, to] = list[0]
    for (const [nextFrom, nextTo] of list.slice(1)) {
      if (nextFrom <= to) {
        to = Math.max(to, nextTo)
        continue
      }
      total += to - from
      ;[from, to] = [nextFrom, nextTo]
    }
    total += to - from
  }

  return total / 3600000
}

function reliabilityFor(
  units: DmbdUnit[],
  episodes: DmbdEpisode[],
  readings: Map<number, DmbdHmReading[]>,
  periodStart: Date,
  asOf: Date,
  calendarEnd: Date,
  mttrValue: number | null
): DmbdReliability {
  const unitIds = new Set(units.map(unit => unit.fleetUnitId))
  const startKey = localDateOnly(periodStart)
  const endKey = localDateOnly(asOf)
  let closed = 0
  let failures = 0
  for (const episode of episodes) {
    if (!unitIds.has(episode.fleetUnitId)) continue
    if (episode.startedAt >= periodStart && episode.startedAt <= asOf) failures += 1
    if (episode.finishedAt && episode.finishedAt >= periodStart && episode.finishedAt <= asOf) closed += 1
  }

  const runHours = operatingHours(readings, unitIds, startKey, endKey)
  const downtimeHours = mergedDowntimeHours(episodes, unitIds, periodStart, asOf)
  const downUnits = new Set<number>()
  for (const episode of episodes) {
    if (!unitIds.has(episode.fleetUnitId)) continue
    const start = Math.max(episode.startedAt.getTime(), periodStart.getTime())
    const end = Math.min((episode.finishedAt ?? asOf).getTime(), asOf.getTime())
    if (end > start) downUnits.add(episode.fleetUnitId)
  }
  const active = new Set(units.filter(isActiveUnit).map(unit => unit.fleetUnitId))
  for (const id of downUnits) active.add(id)
  const calendarHours = Math.max(0, (calendarEnd.getTime() - periodStart.getTime()) / 3600000) * active.size
  const pa = calendarHours > 0 ? Math.round(((calendarHours - downtimeHours) / calendarHours) * 1000) / 10 : null

  return {
    mttr: { value: mttrValue, count: closed },
    mtbf: {
      value: failures > 0 && runHours > 0 ? round1(runHours / failures) : null,
      failures,
      runHours
    },
    pa: { value: pa, units: active.size, downtimeHours: round1(downtimeHours), calendarHours: round1(calendarHours) }
  }
}

export function buildDmbdDashboard(input: {
  units: DmbdUnit[]
  episodes: DmbdEpisode[]
  plant?: string
  category?: string
  status?: string
  date?: string
  period?: string
  mode?: string
  now?: Date
  readings?: Map<number, DmbdHmReading[]>
}) {
  const now = input.now ?? new Date()
  const mode = input.mode === 'MTD' || input.mode === 'YTD' ? input.mode : null
  const window = mode ? resolveDashboardPeriod(input.period, mode, now) : null
  const asOf = window?.asOf ?? resolveDashboardAsOf(input.date, now)
  const status = STATUS_FILTERS.has(input.status ?? '') ? (input.status as DmbdBucket) : ''
  const units = population(input.units, input.plant, input.category)

  const episodes = new Map<number, DmbdEpisode[]>()
  for (const episode of input.episodes) {
    const list = episodes.get(episode.fleetUnitId) ?? []
    list.push(episode)
    episodes.set(episode.fleetUnitId, list)
  }

  const lives = units.map(unit => {
    const rows = episodes.get(unit.fleetUnitId) ?? []
    if (window) return liveInPeriod(unit, rows, window.periodStart, asOf)

    return liveAt(unit, rows, asOf)
  })
  const previousInstant = window?.previousAsOf ?? previousDay(asOf)
  const previous = units.map(unit => liveAt(unit, episodes.get(unit.fleetUnitId) ?? [], previousInstant))
  const currentKpi = summarize(lives, episodes, asOf)
  const previousKpi = summarize(previous, episodes, previousInstant)
  const unitIds = new Set(units.map(unit => unit.fleetUnitId))
  if (window) {
    currentKpi.lostHours = periodLostHours(unitIds, episodes, window.periodStart, asOf)
    currentKpi.mttrHours = mttrInRange(unitIds, episodes, window.periodStart, asOf)
    previousKpi.lostHours = periodLostHours(unitIds, episodes, window.previousStart, window.previousAsOf)
    previousKpi.mttrHours = mttrInRange(unitIds, episodes, window.previousStart, window.previousAsOf)
  }

  let shown = lives
  if (status) shown = shown.filter(live => live.bucket === status)

  const down = shown.filter(live => live.bucket !== 'ready')
  const chartLives = window ? shown.filter(live => live.episode) : down
  const siteSource = status === 'ready' ? shown : chartLives

  const bySite = topCounts(
    siteSource.reduce((map, live) => {
      map.set(live.unit.projectCode, (map.get(live.unit.projectCode) ?? 0) + 1)

      return map
    }, new Map<string, number>()),
    8
  )

  const byComponent = topCounts(
    chartLives.reduce((map, live) => {
      const name = live.episode?.componentName || live.episode?.componentCode || 'Lainnya'
      map.set(name, (map.get(name) ?? 0) + 1)

      return map
    }, new Map<string, number>()),
    5
  )

  const endDay = new Date(asOf)
  endDay.setHours(0, 0, 0, 0)

  const trend = window
    ? window.mode === 'YTD'
      ? Array.from({ length: window.month }, (_, index) => ({
          date: `${window.year}-${String(index + 1).padStart(2, '0')}`,
          count: 0
        }))
      : Array.from({ length: endDay.getDate() }, (_, index) => {
          const day = new Date(window.year, window.month - 1, index + 1)

          return { date: localDateOnly(day), count: 0 }
        })
    : Array.from({ length: DMBD_TREND_DAYS }, (_, index) => {
        const day = new Date(endDay)
        day.setDate(endDay.getDate() - (DMBD_TREND_DAYS - 1 - index))

        return { date: localDateOnly(day), count: 0 }
      })
  const trendIndex = new Map(trend.map((day, index) => [day.date, index]))
  for (const episode of input.episodes) {
    if (!unitIds.has(episode.fleetUnitId)) continue

    const slot = trendIndex.get(
      window?.mode === 'YTD'
        ? `${episode.startedAt.getFullYear()}-${String(episode.startedAt.getMonth() + 1).padStart(2, '0')}`
        : localDateOnly(episode.startedAt)
    )
    if (slot == null) continue
    trend[slot].count += 1
  }

  const rows = shown
    .map(toRow)
    .sort((a, b) => {
      const age = (b.ageHours ?? -1) - (a.ageHours ?? -1)
      if (age !== 0) return age

      return a.site.localeCompare(b.site) || a.unitNo.localeCompare(b.unitNo)
    })

  return {
    updatedAt: now.toISOString(),
    asOf: asOf.toISOString(),
    period: {
      mode: window?.mode ?? null,
      start: (window?.periodStart ?? asOf).toISOString(),
      end: asOf.toISOString(),
      compareLabel: window?.mode === 'YTD' ? 'vs last year' : window?.mode === 'MTD' ? 'vs last month' : 'vs yesterday'
    },
    options: {
      plants: uniqueLabels(input.units.map(unit => unit.plantType)),
      categories: uniqueLabels(input.units.map(unit => unit.plantGroup))
    },
    kpis: {
      ...currentKpi,
      delta: {
        totalUnits: delta(currentKpi.totalUnits, previousKpi.totalUnits),
        breakdown: delta(currentKpi.breakdown, previousKpi.breakdown),
        waitingPart: delta(currentKpi.waitingPart, previousKpi.waitingPart),
        underRepair: delta(currentKpi.underRepair, previousKpi.underRepair),
        ready: delta(currentKpi.ready, previousKpi.ready),
        lostHours: delta(currentKpi.lostHours, previousKpi.lostHours),
        mttrHours:
          currentKpi.mttrHours == null && previousKpi.mttrHours == null
            ? null
            : delta(currentKpi.mttrHours ?? 0, previousKpi.mttrHours ?? 0)
      }
    },
    trend,
    bySite,
    byComponent,
    reliability: reliabilityFor(
      units,
      input.episodes,
      input.readings ?? new Map(),
      window?.periodStart ?? new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate()),
      asOf,
      window ? monthEnd(window.year, window.month) : new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate(), 23, 59, 59, 999),
      currentKpi.mttrHours
    ),
    rows,
    longest: rows.filter(row => row.ageHours != null).slice(0, 5)
  }
}
