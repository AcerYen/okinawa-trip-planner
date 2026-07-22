import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import {
  attractions,
  defaultItinerary,
  defaultLockedPlaces,
  DAY_COLORS,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  DIFFICULTY_LABELS,
  DIFFICULTY_HINT,
  isHighDifficulty,
  type Attraction,
  type Category,
  type DayPlan,
  type Difficulty,
  type ScheduleItem,
} from '../data/okinawa'
import {
  PLACE_DRAG_TYPE,
  formatDurationLabel,
  getDefaultDuration,
  nextFreeStart,
  resolveScheduleConflicts,
} from '../data/schedule'
import { autoScheduleLockedPlaces } from '../data/autoSchedule'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { scrollAfterLayout, scrollFullyIntoView } from '../utils/scrollIntoView'
import PlacePhoto from './PlacePhoto'
import TripMap, { type MapMarker } from './TripMap'
import DayCalendar from './DayCalendar'
import styles from './PlannerBoard.module.css'

interface Props {
  itinerary: DayPlan[]
  setItinerary: (value: DayPlan[] | ((prev: DayPlan[]) => DayPlan[])) => void
  selectedDay: number
  onSelectDay: (day: number) => void
}

const MAX_DAYS = 14
const MIN_DAYS = 1

type KindFilter = 'all' | 'spot' | 'local' | 'fine' | 'stay'

function isLocalEat(a: Attraction) {
  return a.category === 'local' || a.category === 'food'
}

function isFineEat(a: Attraction) {
  return a.category === 'fine'
}

function isEat(a: Attraction) {
  return isLocalEat(a) || isFineEat(a)
}

function isStay(a: Attraction) {
  return a.category === 'hotel'
}

/** 用餐／住宿不計入當日景點體力配額 */
function isSightseeing(a: Attraction) {
  return !isEat(a) && !isStay(a)
}

function dayDifficultyStats(day: DayPlan | undefined, get: (id: string) => Attraction | undefined) {
  let high = 0
  let mid = 0
  let low = 0
  if (!day) return { high, mid, low, overload: false }
  for (const item of day.items) {
    const p = get(item.placeId)
    if (!p || !isSightseeing(p)) continue
    if (p.difficulty >= 3) high += 1
    else if (p.difficulty === 2) mid += 1
    else low += 1
  }
  return { high, mid, low, overload: high > 1 || mid + low > 2 }
}

function difficultyClass(d: Difficulty) {
  if (d >= 3) return styles.diffHigh
  if (d === 2) return styles.diffMid
  return styles.diffLow
}

function googleSearchUrl(a: Attraction) {
  const q = [a.nameJa, a.name, '沖縄'].filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`
}

function PlaceIntro({
  description,
  tips,
}: {
  description: string
  tips: string
}) {
  return (
    <div className={`${styles.introWrap} ${styles.introSide}`}>
      <div className={styles.introSideLabel}>簡介</div>
      <p className={`${styles.placeDesc} ${styles.placeDescSide}`}>
        {description}
      </p>
      <div className={styles.introSideLabel}>小提示</div>
      <p className={styles.introTipsText}>{tips}</p>
    </div>
  )
}

export default function PlannerBoard({
  itinerary,
  setItinerary,
  selectedDay,
  onSelectDay,
}: Props) {
  const [kind, setKind] = useState<KindFilter>('all')
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [search, setSearch] = useState('')
  const [toddlerOnly, setToddlerOnly] = useState(false)
  const [highRatedOnly, setHighRatedOnly] = useState(false)
  const [lockedOnly, setLockedOnly] = useState(false)
  const [mapMode, setMapMode] = useState<'day' | 'all' | 'list'>('day')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [pendingScroll, setPendingScroll] = useState<{
    id: string
    target: 'pick' | 'list'
  } | null>(null)
  const [dragDayIndex, setDragDayIndex] = useState<number | null>(null)
  const [dragOverDayIndex, setDragOverDayIndex] = useState<number | null>(null)
  const dayDragMovedRef = useRef(false)
  const [mapFocus, setMapFocus] = useState<{
    id: string
    lat: number
    lng: number
    name: string
    token: number
  } | null>(null)
  const [lockedIds, setLockedIds] = useLocalStorage<string[]>(
    'okinawa-locked-v1',
    defaultLockedPlaces
  )

  const getPlace = (id: string) => attractions.find((a) => a.id === id)
  const lockedSet = useMemo(() => new Set(lockedIds), [lockedIds])
  const highlightedPlace = highlightId ? getPlace(highlightId) : null

  const focusOnPlace = (a: Attraction) => {
    setHighlightId(a.id)
    setMapFocus({
      id: a.id,
      lat: a.lat,
      lng: a.lng,
      name: a.name,
      token: Date.now(),
    })
  }

  /** 地圖點選／需讓右側顯示該卡片 */
  const revealPlaceCard = (id: string) => {
    const a = getPlace(id)
    if (!a) return
    const day = itinerary.find((d) => d.items.some((i) => i.placeId === id))?.day
    if (day != null) onSelectDay(day)
    setKind('all')
    setFilter('all')
    setSearch('')
    setToddlerOnly(false)
    setHighRatedOnly(false)
    setLockedOnly(false)
    setHighlightId(id)
    setMapFocus({
      id: a.id,
      lat: a.lat,
      lng: a.lng,
      name: a.name,
      token: Date.now(),
    })
    setPendingScroll({ id, target: 'pick' })
  }

  useEffect(() => {
    if (!pendingScroll) return
    const { id, target } = pendingScroll
    return scrollAfterLayout(() => {
      const pick = document.getElementById(`place-pick-${id}`)
      const listItem = document.getElementById(`place-${id}`)
      const el =
        target === 'list'
          ? listItem
          : pick ?? listItem
      if (el) scrollFullyIntoView(el)
      setPendingScroll(null)
    })
  }, [
    pendingScroll,
    kind,
    filter,
    search,
    toddlerOnly,
    highRatedOnly,
    lockedOnly,
    highlightId,
    selectedDay,
    itinerary,
  ])

  const toggleLock = (id: string) => {
    setLockedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const moveLocked = (id: string, dir: -1 | 1) => {
    setLockedIds((prev) => {
      const index = prev.indexOf(id)
      if (index < 0) return prev
      const j = index + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  const dayOfPlace = (id: string) =>
    itinerary.find((d) => d.items.some((i) => i.placeId === id))?.day ?? null

  const filtered = useMemo(() => {
    const list = attractions.filter((a) => {
      if (lockedOnly && !lockedSet.has(a.id)) return false
      if (kind === 'spot' && (isEat(a) || isStay(a))) return false
      if (kind === 'local' && !isLocalEat(a)) return false
      if (kind === 'fine' && !isFineEat(a)) return false
      if (kind === 'stay' && !isStay(a)) return false
      if (filter !== 'all' && a.category !== filter) return false
      if (toddlerOnly && !a.toddlerFriendly) return false
      if (highRatedOnly && (a.rating == null || a.rating < 4.3)) return false
      if (
        search &&
        !a.name.includes(search) &&
        !a.area.includes(search) &&
        !a.nameJa.includes(search) &&
        !(a.cuisine?.includes(search) ?? false)
      )
        return false
      return true
    })
    return [...list].sort((a, b) => {
      const aLocked = lockedSet.has(a.id)
      const bLocked = lockedSet.has(b.id)
      if (aLocked !== bLocked) return aLocked ? -1 : 1
      if (aLocked && bLocked) {
        return lockedIds.indexOf(a.id) - lockedIds.indexOf(b.id)
      }
      return 0
    })
  }, [kind, filter, toddlerOnly, highRatedOnly, lockedOnly, lockedSet, lockedIds, search])

  const scheduledIds = useMemo(() => {
    const set = new Set<string>()
    itinerary.forEach((d) => d.items.forEach((i) => set.add(i.placeId)))
    return set
  }, [itinerary])

  const mapMarkers: MapMarker[] = useMemo(() => {
    if (mapMode === 'list') {
      return filtered.map((a, i) => ({
        id: a.id,
        name: a.name,
        nameJa: a.nameJa,
        lat: a.lat,
        lng: a.lng,
        area: a.area,
        label: String(i + 1),
      }))
    }
    const days =
      mapMode === 'all'
        ? itinerary
        : itinerary.filter((d) => d.day === selectedDay)
    const markers: MapMarker[] = []
    days.forEach((day) => {
      day.items.forEach((item, idx) => {
        const a = getPlace(item.placeId)
        if (!a) return
        markers.push({
          id: a.id,
          name: a.name,
          nameJa: a.nameJa,
          lat: a.lat,
          lng: a.lng,
          area: a.area,
          day: day.day,
          label: String(idx + 1),
        })
      })
    })
    return markers
  }, [mapMode, filtered, itinerary, selectedDay])

  const placeInDay = (day: DayPlan | undefined, placeId: string) =>
    !!day?.items.some((i) => i.placeId === placeId)

  const confirmPaceOk = (day: DayPlan, place: Attraction) => {
    if (!isSightseeing(place) || !isHighDifficulty(place)) return true
    const highAlready = day.items.filter((i) => {
      const p = getPlace(i.placeId)
      return p && isSightseeing(p) && isHighDifficulty(p) && i.placeId !== place.id
    }).length
    if (highAlready < 1) return true
    return confirm(
      `Day ${day.day} 已有 ${highAlready} 個高難度景點。\n${DIFFICULTY_HINT}\n仍要加入「${place.name}」嗎？`
    )
  }

  const addToDay = (placeId: string, startMin?: number) => {
    const place = getPlace(placeId)
    if (!place) return
    const day = itinerary.find((d) => d.day === selectedDay)
    if (!day || day.items.some((i) => i.placeId === placeId)) return
    if (!confirmPaceOk(day, place)) return
    setItinerary((prev) =>
      prev.map((d) => {
        if (d.day !== selectedDay) return d
        if (d.items.some((i) => i.placeId === placeId)) return d
        const item: ScheduleItem = {
          placeId,
          startMin: startMin ?? nextFreeStart(d.items, 9 * 60, place),
          durationMin: getDefaultDuration(place),
        }
        return {
          ...d,
          items: resolveScheduleConflicts([...d.items, item]),
        }
      })
    )
  }

  const dropPlaceOnCalendar = (placeId: string, startMin: number) => {
    const place = getPlace(placeId)
    if (!place) return
    const day = itinerary.find((d) => d.day === selectedDay)
    if (!day) return
    const existing = day.items.findIndex((i) => i.placeId === placeId)
    if (existing < 0 && !confirmPaceOk(day, place)) return
    setItinerary((prev) =>
      prev.map((d) => {
        if (d.day !== selectedDay) return d
        const idx = d.items.findIndex((i) => i.placeId === placeId)
        let items: ScheduleItem[]
        if (idx >= 0) {
          items = d.items.map((item, i) =>
            i === idx ? { ...item, startMin } : item
          )
        } else {
          items = [
            ...d.items,
            {
              placeId,
              startMin,
              durationMin: getDefaultDuration(place),
            },
          ]
        }
        return { ...d, items: resolveScheduleConflicts(items) }
      })
    )
  }

  const moveCalendarItem = (itemIndex: number, startMin: number) => {
    setItinerary((prev) =>
      prev.map((d) => {
        if (d.day !== selectedDay) return d
        const items = d.items.map((item, i) =>
          i === itemIndex ? { ...item, startMin } : item
        )
        return { ...d, items: resolveScheduleConflicts(items) }
      })
    )
  }

  const resizeCalendarItem = (itemIndex: number, durationMin: number) => {
    setItinerary((prev) =>
      prev.map((d) => {
        if (d.day !== selectedDay) return d
        const items = d.items.map((item, i) =>
          i === itemIndex ? { ...item, durationMin } : item
        )
        return { ...d, items: resolveScheduleConflicts(items) }
      })
    )
  }

  const rescheduleCalendarItem = (
    itemIndex: number,
    startMin: number,
    durationMin: number
  ) => {
    setItinerary((prev) =>
      prev.map((d) => {
        if (d.day !== selectedDay) return d
        const items = d.items.map((item, i) =>
          i === itemIndex ? { ...item, startMin, durationMin } : item
        )
        return { ...d, items: resolveScheduleConflicts(items) }
      })
    )
  }

  const removeItem = (dayIndex: number, itemIndex: number) => {
    setItinerary((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, items: d.items.filter((_, j) => j !== itemIndex) }
          : d
      )
    )
  }

  const updateTitle = (dayIndex: number, title: string) => {
    setItinerary((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, title } : d))
    )
  }

  const updateNotes = (dayIndex: number, notes: string) => {
    setItinerary((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, notes } : d))
    )
  }

  const addDay = () => {
    if (itinerary.length >= MAX_DAYS) return
    const next = itinerary.length + 1
    setItinerary((prev) => [
      ...prev,
      { day: next, title: `第 ${next} 天`, items: [], notes: '' },
    ])
    onSelectDay(next)
  }

  const removeDay = (dayNum: number) => {
    if (itinerary.length <= MIN_DAYS) return
    if (!confirm(`確定刪除 Day ${dayNum}？`)) return
    setItinerary((prev) =>
      prev.filter((d) => d.day !== dayNum).map((d, i) => ({ ...d, day: i + 1 }))
    )
    onSelectDay(Math.min(selectedDay, itinerary.length - 1) || 1)
  }

  const reorderDays = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= itinerary.length ||
      toIndex >= itinerary.length
    ) {
      return
    }
    const selectedIndex = itinerary.findIndex((d) => d.day === selectedDay)
    setItinerary((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next.map((d, i) => ({ ...d, day: i + 1 }))
    })
    let newSelectedIndex = selectedIndex
    if (selectedIndex === fromIndex) newSelectedIndex = toIndex
    else if (fromIndex < selectedIndex && toIndex >= selectedIndex) {
      newSelectedIndex = selectedIndex - 1
    } else if (fromIndex > selectedIndex && toIndex <= selectedIndex) {
      newSelectedIndex = selectedIndex + 1
    }
    if (newSelectedIndex >= 0) onSelectDay(newSelectedIndex + 1)
  }

  const onDayDragStart = (e: DragEvent, index: number) => {
    dayDragMovedRef.current = false
    setDragDayIndex(index)
    e.dataTransfer.setData('text/plain', `day:${index}`)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDayDragOver = (e: DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragDayIndex != null && dragDayIndex !== index) {
      setDragOverDayIndex(index)
    }
  }

  const onDayDrop = (e: DragEvent, toIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    const raw = e.dataTransfer.getData('text/plain')
    const match = raw.match(/^day:(\d+)$/)
    const fromIndex = match ? Number(match[1]) : dragDayIndex
    if (fromIndex != null && fromIndex !== toIndex) {
      dayDragMovedRef.current = true
      reorderDays(fromIndex, toIndex)
    }
    setDragDayIndex(null)
    setDragOverDayIndex(null)
  }

  const onDayDragEnd = () => {
    setDragDayIndex(null)
    setDragOverDayIndex(null)
    window.setTimeout(() => {
      dayDragMovedRef.current = false
    }, 50)
  }

  const resetItinerary = () => {
    if (confirm('重置為建議行程？目前修改將遺失。')) {
      setItinerary(defaultItinerary)
      onSelectDay(1)
    }
  }

  const autoScheduleLocked = () => {
    if (lockedIds.length === 0) {
      alert('目前沒有鎖定景點。請先在列表鎖定必去地點。')
      return
    }
    const scheduled = new Set<string>()
    itinerary.forEach((d) => d.items.forEach((i) => scheduled.add(i.placeId)))
    const pending = lockedIds.filter((id) => !scheduled.has(id) && getPlace(id))
    if (pending.length === 0) {
      alert('所有鎖定景點都已在行程中。')
      return
    }
    const names = pending
      .map((id) => getPlace(id)?.name)
      .filter(Boolean)
      .join('、')
    if (
      !confirm(
        `將自動排入 ${pending.length} 個尚未安排的鎖定景點：\n${names}\n\n會考量車程、南→北節奏、每日高難度上限（最多 1 個）。已在行程中的鎖定項目維持不變。是否繼續？`
      )
    ) {
      return
    }
    const result = autoScheduleLockedPlaces(itinerary, lockedIds, getPlace)
    setItinerary(result.itinerary)
    if (result.placed.length > 0) {
      const first = result.itinerary.find((d) =>
        d.items.some((i) => i.placeId === result.placed[0])
      )
      if (first) onSelectDay(first.day)
      const place = getPlace(result.placed[0])
      if (place) focusOnPlace(place)
    }
    const placedNames = result.placed
      .map((id) => getPlace(id)?.name ?? id)
      .join('、')
    alert(`已排入：${placedNames}`)
  }

  const onPlaceDragStart = (e: DragEvent, placeId: string) => {
    e.dataTransfer.setData(PLACE_DRAG_TYPE, placeId)
    e.dataTransfer.setData('text/plain', placeId)
    e.dataTransfer.effectAllowed = 'copyMove'
  }

  const categories = (Object.keys(CATEGORY_LABELS) as Category[]).filter((cat) => {
    if (kind === 'spot') return !['local', 'fine', 'food', 'hotel'].includes(cat)
    if (kind === 'local') return cat === 'local' || cat === 'food'
    if (kind === 'fine') return cat === 'fine'
    if (kind === 'stay') return cat === 'hotel'
    return true
  })

  const listSections = useMemo(() => {
    if (lockedOnly) {
      return [
        {
          key: 'locked',
          title: `🔒 已鎖定必去（${filtered.length}）`,
          items: filtered,
        },
      ] as const
    }
    if (kind === 'local') {
      return [
        { key: 'local', title: '在地特色餐廳・小吃', items: filtered },
      ] as const
    }
    if (kind === 'fine') {
      return [
        { key: 'fine', title: '高級餐廳', items: filtered },
      ] as const
    }
    if (kind === 'stay' || kind === 'spot') {
      return [{ key: 'all', title: null, items: filtered }] as const
    }
    // 全部：景點 / 在地 / 高級 / 住宿 分段列出
    const spots = filtered.filter((a) => !isEat(a) && !isStay(a))
    const local = filtered.filter(isLocalEat)
    const fine = filtered.filter(isFineEat)
    const stay = filtered.filter(isStay)
    return [
      { key: 'spot', title: '景點・體驗', items: spots },
      { key: 'local', title: '在地特色餐廳・小吃', items: local },
      { key: 'fine', title: '高級餐廳', items: fine },
      { key: 'stay', title: '住宿', items: stay },
    ] as const
  }, [filtered, kind, lockedOnly])

  const activeDay = itinerary.find((d) => d.day === selectedDay)
  const activeDayIndex = itinerary.findIndex((d) => d.day === selectedDay)

  return (
    <div className={styles.board}>
      <aside className={styles.mapPane}>
        <div className={styles.mapToolbar}>
          <strong>地圖</strong>
          <div className={styles.mapModes}>
            <button
              type="button"
              className={mapMode === 'day' ? styles.activeMode : ''}
              onClick={() => setMapMode('day')}
            >
              當日行程
            </button>
            <button
              type="button"
              className={mapMode === 'all' ? styles.activeMode : ''}
              onClick={() => setMapMode('all')}
            >
              全部行程
            </button>
            <button
              type="button"
              className={mapMode === 'list' ? styles.activeMode : ''}
              onClick={() => setMapMode('list')}
            >
              列表篩選
            </button>
          </div>
        </div>
        <div className={styles.mapFill}>
          <TripMap
            key={`${mapMode}-${selectedDay}`}
            markers={mapMarkers}
            showRoutes={mapMode !== 'list'}
            height="100%"
            focus={mapFocus}
            onMarkerClick={(id) => {
              revealPlaceCard(id)
            }}
          />
        </div>
        <div className={styles.mapHint}>
          {mapMode === 'day' && `顯示 Day ${selectedDay} 路線`}
          {mapMode === 'all' && '顯示所有天數行程'}
          {mapMode === 'list' && `顯示篩選後 ${filtered.length} 個地點`}
        </div>
      </aside>

      <div className={styles.sidePane}>
        <header className={styles.sideHeader}>
          <div>
            <h2>行程規劃</h2>
            <p>
              {itinerary.length} 天 · 已排{' '}
              {itinerary.reduce((s, d) => s + d.items.length, 0)} 站 · 鎖定{' '}
              {lockedIds.length} · {DIFFICULTY_HINT}
            </p>
          </div>
          <div className={styles.sideActions}>
            <button
              type="button"
              className={styles.autoLockBtn}
              onClick={autoScheduleLocked}
              disabled={lockedIds.length === 0}
              title="依車程與體力配額，將鎖定景點自動排入合適日期"
            >
              自動排入鎖定
            </button>
            <button type="button" onClick={addDay} disabled={itinerary.length >= MAX_DAYS}>
              ＋ 天數
            </button>
            <button type="button" className={styles.ghost} onClick={resetItinerary}>
              重置
            </button>
          </div>
        </header>

        <div className={styles.dayTabs}>
          {itinerary.map((day, index) => {
            const pace = dayDifficultyStats(day, getPlace)
            return (
            <button
              key={day.day}
              type="button"
              draggable
              className={`${styles.dayTab} ${selectedDay === day.day ? styles.dayTabOn : ''} ${pace.overload ? styles.dayTabWarn : ''} ${dragDayIndex === index ? styles.dayTabDragging : ''} ${dragOverDayIndex === index ? styles.dayTabDrop : ''}`}
              style={
                {
                  '--day-color': DAY_COLORS[index % DAY_COLORS.length],
                } as CSSProperties
              }
              title="拖曳可調整日期順序"
              onClick={() => {
                if (dayDragMovedRef.current) return
                onSelectDay(day.day)
              }}
              onDragStart={(e) => onDayDragStart(e, index)}
              onDragOver={(e) => onDayDragOver(e, index)}
              onDrop={(e) => onDayDrop(e, index)}
              onDragEnd={onDayDragEnd}
              onDragLeave={() => {
                if (dragOverDayIndex === index) setDragOverDayIndex(null)
              }}
            >
              <span>Day {day.day}</span>
              <small>{day.title}</small>
              <em>
                {day.items.length} 站
                {pace.high + pace.mid + pace.low > 0 && (
                  <>
                    {' · '}
                    {pace.high > 0 && <span className={styles.paceHigh}>高{pace.high}</span>}
                    {pace.high > 0 && pace.mid + pace.low > 0 && ' '}
                    {pace.mid + pace.low > 0 && (
                      <span className={styles.paceSoft}>
                        中低{pace.mid + pace.low}
                      </span>
                    )}
                  </>
                )}
              </em>
              {itinerary.length > MIN_DAYS && (
                <span
                  className={styles.dayTabRemove}
                  role="button"
                  tabIndex={0}
                  draggable={false}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeDay(day.day)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation()
                      removeDay(day.day)
                    }
                  }}
                >
                  ✕
                </span>
              )}
            </button>
            )
          })}
          {itinerary.length < MAX_DAYS && (
            <button type="button" className={styles.addDayTab} onClick={addDay}>
              ＋
            </button>
          )}
        </div>

        {activeDay && activeDayIndex >= 0 && (
          <DayCalendar
            day={activeDay.day}
            title={activeDay.title}
            notes={activeDay.notes}
            items={activeDay.items}
            getPlace={getPlace}
            lockedIds={lockedSet}
            onTitleChange={(title) => updateTitle(activeDayIndex, title)}
            onNotesChange={(notes) => updateNotes(activeDayIndex, notes)}
            onDropPlace={dropPlaceOnCalendar}
            onMoveItem={moveCalendarItem}
            onResizeItem={resizeCalendarItem}
            onRescheduleItem={rescheduleCalendarItem}
            onRemoveItem={(itemIndex) => {
              const item = activeDay.items[itemIndex]
              const p = item ? getPlace(item.placeId) : undefined
              if (
                item &&
                lockedSet.has(item.placeId) &&
                !confirm(
                  `${p?.name ?? '此景點'} 已鎖定必去，確定從這天移除？（鎖定清單仍保留）`
                )
              ) {
                return
              }
              removeItem(activeDayIndex, itemIndex)
            }}
            onSelectPlace={(id) => {
              const p = getPlace(id)
              if (p) {
                focusOnPlace(p)
                revealPlaceCard(id)
              }
            }}
          />
        )}

                {highlightedPlace && (
          <article
            className={`${styles.mapPickCard} ${styles.placeHi}`}
            id={`place-pick-${highlightedPlace.id}`}
          >
            <div className={styles.mapPickPhoto} data-place-photo>
              <PlacePhoto place={highlightedPlace} loading="lazy" />
            </div>
            <div className={styles.mapPickMain}>
              <div className={styles.mapPickLabel}>地圖選取</div>
              <h3>
                {CATEGORY_ICONS[highlightedPlace.category]} {highlightedPlace.name}
              </h3>
              <p>
                {highlightedPlace.nameJa} · {highlightedPlace.area}
                {` · 體力 ${DIFFICULTY_LABELS[highlightedPlace.difficulty]}`}
                {highlightedPlace.rating != null &&
                  ` · ★ ${highlightedPlace.rating.toFixed(1)}`}
              </p>
              <div className={styles.mapPickActions}>
                <button
                  type="button"
                  className={`${styles.lockBtn} ${lockedSet.has(highlightedPlace.id) ? styles.lockBtnOn : ''}`}
                  onClick={() => toggleLock(highlightedPlace.id)}
                >
                  {lockedSet.has(highlightedPlace.id) ? '🔒 已鎖定' : '鎖定必去'}
                </button>
                <button
                  type="button"
                  className={styles.addBtn}
                  disabled={placeInDay(activeDay, highlightedPlace.id)}
                  onClick={() => addToDay(highlightedPlace.id)}
                >
                  {placeInDay(activeDay, highlightedPlace.id)
                    ? `已在 Day ${selectedDay}`
                    : `加入 Day ${selectedDay}`}
                </button>
                <button
                  type="button"
                  className={styles.ghostMini}
                  onClick={() => {
                    setPendingScroll({ id: highlightedPlace.id, target: 'list' })
                  }}
                >
                  捲至列表
                </button>
                <button
                  type="button"
                  className={styles.ghostMini}
                  onClick={() => setHighlightId(null)}
                >
                  關閉
                </button>
              </div>
            </div>
            <div className={styles.placeIntroCol}>
              <PlaceIntro
                description={highlightedPlace.description}
                tips={highlightedPlace.tips}
              />
            </div>
          </article>
        )}

        <div className={styles.listTools}>
          <div className={styles.kindTabs}>
            {(
              [
                ['all', '全部'],
                ['spot', '景點'],
                ['local', '在地特色'],
                ['fine', '高級餐廳'],
                ['stay', '住宿'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={kind === id ? styles.kindOn : ''}
                onClick={() => {
                  setKind(id)
                  setFilter('all')
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="search"
            className={styles.search}
            placeholder="搜尋名稱、地區、飯店..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={lockedOnly}
              onChange={(e) => setLockedOnly(e.target.checked)}
            />
            🔒 已鎖定{lockedIds.length > 0 ? `（${lockedIds.length}）` : ''}
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={highRatedOnly}
              onChange={(e) => setHighRatedOnly(e.target.checked)}
            />
            4.3★+
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={toddlerOnly}
              onChange={(e) => setToddlerOnly(e.target.checked)}
            />
            幼兒友善
          </label>
        </div>

        <div className={styles.catRow}>
          <button
            type="button"
            className={filter === 'all' ? styles.catOn : ''}
            onClick={() => setFilter('all')}
          >
            全部類型
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={filter === cat ? styles.catOn : ''}
              onClick={() => setFilter(cat)}
            >
              {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className={styles.placeList}>
          {listSections.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.key} className={styles.placeSection}>
                {section.title && (
                  <h3 className={styles.placeSectionTitle}>{section.title}</h3>
                )}
                {section.items.map((a) => {
                  const inDay = placeInDay(activeDay, a.id)
                  const scheduled = scheduledIds.has(a.id)
                  const defaultMin = getDefaultDuration(a)
                  const lockIdx = lockedIds.indexOf(a.id)
                  const dayNum = dayOfPlace(a.id)
                  return (
                    <article
                      key={a.id}
                      id={`place-${a.id}`}
                      className={`${styles.placeCard} ${highlightId === a.id ? styles.placeHi : ''} ${isLocalEat(a) ? styles.placeLocal : ''} ${isFineEat(a) ? styles.placeFine : ''} ${isStay(a) ? styles.placeStay : ''} ${lockedSet.has(a.id) ? styles.placeLocked : ''}`}
                      draggable
                      onDragStart={(e) => {
                        const t = e.target as HTMLElement
                        if (t.closest('button, a, [data-intro-wrap]')) {
                          e.preventDefault()
                          return
                        }
                        onPlaceDragStart(e, a.id)
                      }}
                      title="拖曳到上方行事曆安排時段"
                    >
                      <div className={styles.placePhoto} data-place-photo>
                        <PlacePhoto place={a} />
                        {a.rating != null && (
                          <span className={styles.photoRating}>★ {a.rating.toFixed(1)}</span>
                        )}
                        <span className={styles.durBadge}>
                          ⏱ {formatDurationLabel(defaultMin)}
                        </span>
                        <span
                          className={`${styles.diffBadge} ${difficultyClass(a.difficulty)}`}
                          title={`體力難度：${DIFFICULTY_LABELS[a.difficulty]}`}
                        >
                          體力 {DIFFICULTY_LABELS[a.difficulty]}
                        </span>
                        {isFineEat(a) && <span className={styles.tierTag}>高級</span>}
                        {a.category === 'local' && (
                          <span className={`${styles.tierTag} ${styles.tierLocal}`}>在地</span>
                        )}
                      </div>
                      <div className={styles.placeMain}>
                        <div className={styles.placeTitle}>
                          <h3>
                            <button
                              type="button"
                              className={styles.mapFocusBtn}
                              onClick={() => focusOnPlace(a)}
                              title="在地圖上顯示位置"
                            >
                              {CATEGORY_ICONS[a.category]} {a.name}
                            </button>
                          </h3>
                          <span>
                            <a
                              className={styles.googleLinkMuted}
                              href={googleSearchUrl(a)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="在 Google 搜尋"
                            >
                              {a.nameJa}
                            </a>
                          </span>
                        </div>
                        <div className={styles.placeMeta}>
                          <span>📍 {a.area}</span>
                          {a.cuisine && <span>🍴 {a.cuisine}</span>}
                          <span className={`${styles.diffMeta} ${difficultyClass(a.difficulty)}`}>
                            體力 {DIFFICULTY_LABELS[a.difficulty]}
                          </span>
                          <span className={styles.durMeta}>
                            ⏱ 建議 {a.duration}（約 {formatDurationLabel(defaultMin)}）
                          </span>
                          <span>💴 {a.cost}</span>
                          {a.toddlerFriendly && <span>👶</span>}
                          {lockedSet.has(a.id) && (
                            <span className={styles.lockedMeta}>
                              🔒 必去
                              {dayNum != null ? ` · Day ${dayNum}` : ' · 未排入'}
                            </span>
                          )}
                        </div>
                        <p className={styles.dragHint}>↕ 拖曳到行事曆，或按加入自動接在空檔</p>
                        <div className={styles.placeActions}>
                          <button
                            type="button"
                            className={`${styles.lockBtn} ${lockedSet.has(a.id) ? styles.lockBtnOn : ''}`}
                            onClick={() => toggleLock(a.id)}
                          >
                            {lockedSet.has(a.id) ? '🔒 已鎖定' : '鎖定必去'}
                          </button>
                          {lockedOnly && lockIdx >= 0 && (
                            <>
                              <button
                                type="button"
                                className={styles.ghostMini}
                                disabled={lockIdx === 0}
                                onClick={() => moveLocked(a.id, -1)}
                                title="上移優先序"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className={styles.ghostMini}
                                disabled={lockIdx === lockedIds.length - 1}
                                onClick={() => moveLocked(a.id, 1)}
                                title="下移優先序"
                              >
                                ↓
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className={styles.addBtn}
                            disabled={!!inDay}
                            onClick={() => addToDay(a.id)}
                          >
                            {inDay ? `已在 Day ${selectedDay}` : `加入 Day ${selectedDay}`}
                          </button>
                          <a
                            className={styles.googleBtn}
                            href={googleSearchUrl(a)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Google 搜尋
                          </a>
                          {scheduled && !inDay && (
                            <span className={styles.scheduledTag}>已排入其他天</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.placeIntroCol}>
                        <PlaceIntro
                          description={a.description}
                          tips={a.tips}
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
            )
          )}
          {filtered.length === 0 && (
            <p className={styles.empty}>
              {lockedOnly
                ? '尚未鎖定景點。在卡片點「鎖定必去」後，可在此篩選查看。'
                : '沒有符合條件的地點'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
