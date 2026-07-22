import type { Attraction } from './okinawa'

const EARTH_KM = 6371
/** 帶幼兒／孕期開車平均時速（含等燈、路況） */
const AVG_SPEED_KMH = 32
/** 停車、卸推車、進出場緩衝 */
const STOP_BUFFER_MIN = 12

function toRad(deg: number) {
  return (deg * Math.PI) / 180
}

/** 將景點 duration 字串解析成預設分鐘數 */
export function parseDurationMinutes(duration: string): number {
  const s = duration.trim()
  if (/整日|住宿/.test(s)) return 180
  if (/半天/.test(s)) return 240

  let m = s.match(/(\d+(?:\.\d+)?)\s*[-~～到至]\s*(\d+(?:\.\d+)?)\s*分鐘/)
  if (m) return Math.round((Number(m[1]) + Number(m[2])) / 2)

  m = s.match(/(\d+(?:\.\d+)?)\s*分鐘/)
  if (m) return Math.round(Number(m[1]))

  m = s.match(/(\d+(?:\.\d+)?)\s*[-~～到至]\s*(\d+(?:\.\d+)?)\s*小時/)
  if (m) return Math.round(((Number(m[1]) + Number(m[2])) / 2) * 60)

  m = s.match(/(\d+(?:\.\d+)?)\s*小時/)
  if (m) return Math.round(Number(m[1]) * 60)

  return 90
}

/** 兩點直線距離（公里） */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

function snap5(min: number) {
  return Math.round(min / 5) * 5
}

/**
 * 估算開車車程（分鐘）。含停車緩衝；同區極近給最短緩衝。
 */
export function estimateTravelMinutes(
  from: Attraction,
  to: Attraction
): number {
  if (from.id === to.id) return 0
  const km = haversineKm(from, to)
  if (km < 0.4) return 10
  if (km < 1.2) return 15
  const drive = (km / AVG_SPEED_KMH) * 60
  // 路網非直線，乘 1.25
  const total = drive * 1.25 + STOP_BUFFER_MIN
  return Math.min(120, Math.max(15, snap5(total)))
}

/** 孕期／幼兒友善的實際停留時長（可短於官網建議） */
export function getVisitDuration(
  place: Attraction,
  prevId?: string
): number {
  const base = parseDurationMinutes(place.duration)

  // 同園區水族＋海洋博：後者改短散步
  if (place.id === 'ocean-expo' && prevId === 'churaumi') return 60
  if (place.id === 'churaumi') return 150
  if (place.id === 'ocean-expo') return 90

  if (place.category === 'hotel') {
    // 充電／午睡區塊：留出傍晚選配與晚餐時段
    if (place.id === 'hotel-moon-beach') return 150
    if (place.id === 'hotel-collective') return 30
    if (/整日/.test(place.duration)) return 240
    return Math.min(base, 180)
  }

  const caps: Record<string, number> = {
    'aeon-mall-rycom': 90,
    'american-village': 75,
    'peace-memorial': 75,
    'shuri-castle': 75,
    'naminoue-shrine': 40,
    'suki-park': 45,
    'cape-manzamo': 30,
    'senaga-island': 40,
    'umikaji-terrace-food': 60,
    steak88: 75,
    'kaito-shokudo': 60,
    ashibiuna: 75,
    'ryukyu-village-dining': 75,
    'burger-wolf': 50,
    hanapit: 75,
    'sato-no-udon': 45,
    'seafood-onna': 70,
    'on-na-kitchen': 75,
    hamaya: 50,
    'blue-seal-nago': 25,
    'onigiri-shop': 25,
    'naha-airport': 90,
    'chatan-park': 45,
    'hotel-collective': 30,
    'menya-tondo': 45,
    'noboruya-ramen': 45,
    'mugiya-soba': 45,
    kaihoken: 60,
    'emi-emi': 45,
    'aw-chatan': 45,
    pandala: 45,
    akagawara: 75,
    'churaumi-77': 75,
    poamoho: 60,
    'agu-shima': 75,
    'sams-awase': 75,
    'calice-uno': 60,
    'kokusai-dori': 40,
    'tropical-beach': 40,
    'sunset-beach': 40,
    'onna-beach': 40,
    'okinawa-pref-museum': 55,
  }

  if (caps[place.id] != null) return caps[place.id]
  return Math.min(base, 150)
}

export function formatTravelLabel(min: number): string {
  if (min < 60) return `車程約 ${min} 分`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `車程約 ${h} 小時` : `車程約 ${h} 時 ${m} 分`
}
