import { attractions, type Attraction, type ScheduleItem } from './okinawa'
import {
  estimateTravelMinutes,
  getVisitDuration,
} from './travel'

export function getDefaultDuration(place: Attraction): number {
  return getVisitDuration(place)
}

export function getDefaultDurationById(placeId: string): number {
  const place = attractions.find((a) => a.id === placeId)
  return place ? getDefaultDuration(place) : 90
}

export function formatClock(min: number): string {
  const clamped = ((Math.round(min) % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatDurationLabel(min: number): string {
  if (min < 60) return `${min} 分`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (m === 0) return `${h} 小時`
  return `${h} 時 ${m} 分`
}

export function snapMinutes(min: number, step = 15): number {
  return Math.round(min / step) * step
}

export const CALENDAR_START_MIN = 8 * 60
export const CALENDAR_END_MIN = 22 * 60
export const CALENDAR_PX_PER_MIN = 1.2
export const PLACE_DRAG_TYPE = 'application/x-okinawa-place'

function findPlace(id: string) {
  return attractions.find((a) => a.id === id)
}

/** 依前一站結束時間＋車程，找下一個可開始時段 */
export function nextFreeStart(
  items: ScheduleItem[],
  dayStartMin = 9 * 60,
  nextPlace?: Attraction
): number {
  if (items.length === 0) return dayStartMin
  const byEnd = [...items].sort(
    (a, b) => a.startMin + a.durationMin - (b.startMin + b.durationMin)
  )
  const prev = byEnd[byEnd.length - 1]
  const prevPlace = findPlace(prev.placeId)
  const travel =
    prevPlace && nextPlace ? estimateTravelMinutes(prevPlace, nextPlace) : 20
  return snapMinutes(prev.startMin + prev.durationMin + travel)
}

/**
 * 依景點順序＋車程打包當日行程；若逾時則縮短停留並盡量擠進當天。
 */
export function packDaySchedule(
  placeIds: string[],
  dayStartMin = 9 * 60
): ScheduleItem[] {
  let t = dayStartMin
  const items: ScheduleItem[] = []
  let prev: Attraction | undefined

  for (const placeId of placeIds) {
    const place = findPlace(placeId)
    if (!place) continue
    if (prev) {
      t = snapMinutes(t + estimateTravelMinutes(prev, place))
    }
    let durationMin = getVisitDuration(place, prev?.id)
    if (t + durationMin > CALENDAR_END_MIN) {
      durationMin = Math.max(15, CALENDAR_END_MIN - t)
    }
    if (t >= CALENDAR_END_MIN - 15) {
      t = Math.max(dayStartMin, CALENDAR_END_MIN - 45)
      durationMin = Math.min(durationMin, 45)
    }
    items.push({ placeId, startMin: t, durationMin })
    t = t + durationMin
    prev = place
  }
  return items
}

/**
 * 解決重疊：依開始時間排序，後段自動往後推（含車程）。
 */
export function resolveScheduleConflicts(
  items: ScheduleItem[]
): ScheduleItem[] {
  if (items.length <= 1) return items
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin)
  const result: ScheduleItem[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1]
    const cur = { ...sorted[i] }
    const from = findPlace(prev.placeId)
    const to = findPlace(cur.placeId)
    const travel = from && to ? estimateTravelMinutes(from, to) : 15
    const earliest = snapMinutes(prev.startMin + prev.durationMin + travel)
    if (cur.startMin < earliest) cur.startMin = earliest

    if (cur.startMin + cur.durationMin > CALENDAR_END_MIN) {
      cur.durationMin = Math.max(15, CALENDAR_END_MIN - cur.startMin)
    }
    if (cur.startMin >= CALENDAR_END_MIN) {
      cur.startMin = CALENDAR_END_MIN - 30
      cur.durationMin = 30
    }
    result.push(cur)
  }
  return result
}

/** 兩站之間的車程（若找得到景點） */
export function travelBetween(fromId: string, toId: string): number | null {
  const a = findPlace(fromId)
  const b = findPlace(toId)
  if (!a || !b) return null
  return estimateTravelMinutes(a, b)
}

export {
  parseDurationMinutes,
  estimateTravelMinutes,
  getVisitDuration,
} from './travel'
