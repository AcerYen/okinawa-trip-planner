import {
  isHighDifficulty,
  type Attraction,
  type DayPlan,
  type ScheduleItem,
} from './okinawa'
import {
  getDefaultDuration,
  packDaySchedule,
  resolveScheduleConflicts,
} from './schedule'
import { estimateTravelMinutes, haversineKm } from './travel'

export interface AutoScheduleResult {
  itinerary: DayPlan[]
  /** 新排入的鎖定景點 id */
  placed: string[]
  /** 本來就已在行程中 */
  alreadyIn: string[]
  /** 找不到景點資料而略過 */
  missing: string[]
}

function isEat(a: Attraction) {
  return a.category === 'local' || a.category === 'food' || a.category === 'fine'
}

function isStay(a: Attraction) {
  return a.category === 'hotel'
}

function isSightseeing(a: Attraction) {
  return !isEat(a) && !isStay(a)
}

function dayPlaces(
  day: DayPlan,
  getPlace: (id: string) => Attraction | undefined
): Attraction[] {
  return day.items
    .map((i) => getPlace(i.placeId))
    .filter((p): p is Attraction => !!p)
}

function dayCentroid(places: Attraction[]): { lat: number; lng: number } | null {
  if (places.length === 0) return null
  const lat = places.reduce((s, p) => s + p.lat, 0) / places.length
  const lng = places.reduce((s, p) => s + p.lng, 0) / places.length
  return { lat, lng }
}

function sightseeingStats(
  day: DayPlan,
  getPlace: (id: string) => Attraction | undefined
) {
  let high = 0
  let mid = 0
  let low = 0
  for (const item of day.items) {
    const p = getPlace(item.placeId)
    if (!p || !isSightseeing(p)) continue
    if (isHighDifficulty(p)) high += 1
    else if (p.difficulty === 2) mid += 1
    else low += 1
  }
  return { high, mid, low, total: high + mid + low }
}

function isRestOrReturnDay(day: DayPlan): boolean {
  return /充電|休息|返程|極簡/.test(day.title)
}

/**
 * 在既有行程中找插入位置，使前後車程總和最小，再依序重排時間。
 */
function insertByGeography(
  items: ScheduleItem[],
  place: Attraction,
  dayStartMin = 9 * 60,
  getPlace: (id: string) => Attraction | undefined
): ScheduleItem[] {
  if (items.length === 0) {
    return packDaySchedule([place.id], dayStartMin)
  }

  let bestIdx = items.length
  let bestCost = Infinity

  for (let i = 0; i <= items.length; i++) {
    const prev = i > 0 ? getPlace(items[i - 1].placeId) : null
    const next = i < items.length ? getPlace(items[i].placeId) : null
    let cost = 0
    if (prev) cost += estimateTravelMinutes(prev, place)
    if (next) cost += estimateTravelMinutes(place, next)
    if (!prev && !next) cost = 0
    // 偏好插在相近站之間
    if (prev && next) {
      const without = estimateTravelMinutes(prev, next)
      cost = Math.max(0, cost - without * 0.35)
    }
    if (cost < bestCost) {
      bestCost = cost
      bestIdx = i
    }
  }

  const order = [
    ...items.slice(0, bestIdx).map((i) => i.placeId),
    place.id,
    ...items.slice(bestIdx).map((i) => i.placeId),
  ]
  const start =
    items.length > 0
      ? Math.min(...items.map((i) => i.startMin), dayStartMin)
      : dayStartMin
  return packDaySchedule(order, Math.max(8 * 60, Math.min(start, 12 * 60)))
}

function scoreDayForPlace(
  day: DayPlan,
  dayIndex: number,
  dayCount: number,
  place: Attraction,
  getPlace: (id: string) => Attraction | undefined
): number {
  let score = 0
  const places = dayPlaces(day, getPlace)
  const stats = sightseeingStats(day, getPlace)
  const rest = isRestOrReturnDay(day)

  if (rest) {
    if (isSightseeing(place)) score += 520
    else if (isStay(place)) score += 10
    else score += 180
  }

  if (/返程|機場/.test(day.title) && place.id !== 'naha-airport') {
    score += 450
  }

  if (isSightseeing(place)) {
    if (isHighDifficulty(place) && stats.high >= 1) score += 900
    if (stats.total >= 3) score += 280
    if (stats.total >= 2 && place.difficulty <= 2) score += 120
    if (stats.mid + stats.low >= 2 && !isHighDifficulty(place)) score += 90
  }

  if (day.items.length >= 5) score += 90
  if (day.items.length >= 6) score += 160

  const centroid = dayCentroid(places)
  if (centroid) {
    score += haversineKm(centroid, place) * 7.5
    const sameArea = places.some((p) => p.area === place.area)
    if (sameArea) score -= 55
  } else {
    // 空日：依南→北節奏對齊期望緯度
    const t = dayCount <= 1 ? 0 : dayIndex / (dayCount - 1)
    const expectedLat = 26.1 + (26.72 - 26.1) * t
    score += Math.abs(place.lat - expectedLat) * 220
  }

  // 餐廳偏午餐時段：當日已有景點、尚無太多餐廳時較佳
  if (isEat(place)) {
    const eats = places.filter(isEat).length
    if (eats >= 2) score += 140
    if (places.length === 0) score += 40
  }

  return score
}

function pickBestDayIndex(
  days: DayPlan[],
  place: Attraction,
  getPlace: (id: string) => Attraction | undefined
): number {
  let best = 0
  let bestScore = Infinity
  for (let i = 0; i < days.length; i++) {
    const s = scoreDayForPlace(days[i], i, days.length, place, getPlace)
    if (s < bestScore) {
      bestScore = s
      best = i
    }
  }
  return best
}

/**
 * 將尚未出現在行程中的鎖定景點，依車程／南→北節奏／每日體力配額自動排入。
 * 已在行程中的鎖定項目維持原日不動。
 */
export function autoScheduleLockedPlaces(
  itinerary: DayPlan[],
  lockedIds: string[],
  getPlace: (id: string) => Attraction | undefined
): AutoScheduleResult {
  const days: DayPlan[] = itinerary.map((d) => ({
    ...d,
    items: d.items.map((i) => ({ ...i })),
  }))

  const scheduled = new Set<string>()
  for (const d of days) {
    for (const i of d.items) scheduled.add(i.placeId)
  }

  const alreadyIn: string[] = []
  const missing: string[] = []
  const pending: Attraction[] = []

  for (const id of lockedIds) {
    const place = getPlace(id)
    if (!place) {
      missing.push(id)
      continue
    }
    if (scheduled.has(id)) {
      alreadyIn.push(id)
      continue
    }
    pending.push(place)
  }

  // 南→北優先排入，較符合既有行程走向
  pending.sort((a, b) => a.lat - b.lat || a.lng - b.lng)

  const placed: string[] = []

  for (const place of pending) {
    const dayIdx = pickBestDayIndex(days, place, getPlace)
    const day = days[dayIdx]
    day.items = insertByGeography(day.items, place, 9 * 60, getPlace)
    day.items = resolveScheduleConflicts(day.items)
    // 確保 duration 至少為預設（pack 可能因擠壓縮短）
    day.items = day.items.map((item) => {
      if (item.placeId !== place.id) return item
      const want = getDefaultDuration(place)
      if (item.durationMin >= want * 0.6) return item
      return { ...item, durationMin: Math.min(want, item.durationMin + 15) }
    })
    day.items = resolveScheduleConflicts(day.items)
    placed.push(place.id)
  }

  return { itinerary: days, placed, alreadyIn, missing }
}
