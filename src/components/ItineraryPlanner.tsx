import { useMemo, useState, type CSSProperties } from 'react'
import {
  defaultItinerary,
  attractions,
  DAY_COLORS,
  type DayPlan,
} from '../data/okinawa'
import TripMap, { type MapMarker } from './TripMap'
import styles from './ItineraryPlanner.module.css'

interface Props {
  itinerary: DayPlan[]
  setItinerary: (value: DayPlan[] | ((prev: DayPlan[]) => DayPlan[])) => void
  selectedDay: number
  onSelectDay: (day: number) => void
}

const MAX_DAYS = 14
const MIN_DAYS = 1

export default function ItineraryPlanner({
  itinerary,
  setItinerary,
  selectedDay,
  onSelectDay,
}: Props) {
  const [mapFilter, setMapFilter] = useState<'all' | number>('all')
  const [focusDay, setFocusDay] = useState<number | null>(null)

  const getAttraction = (id: string) => attractions.find((a) => a.id === id)

  const removeItem = (dayIndex: number, itemIndex: number) => {
    setItinerary((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? { ...d, items: d.items.filter((_, j) => j !== itemIndex) }
          : d
      )
    )
  }

  const updateNotes = (dayIndex: number, notes: string) => {
    setItinerary((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, notes } : d))
    )
  }

  const updateTitle = (dayIndex: number, title: string) => {
    setItinerary((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, title } : d))
    )
  }

  const moveItem = (dayIndex: number, itemIndex: number, direction: -1 | 1) => {
    setItinerary((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d
        const items = [...d.items]
        const newIndex = itemIndex + direction
        if (newIndex < 0 || newIndex >= items.length) return d
        ;[items[itemIndex], items[newIndex]] = [items[newIndex], items[itemIndex]]
        return { ...d, items }
      })
    )
  }

  const addDay = () => {
    if (itinerary.length >= MAX_DAYS) return
    const nextDay = itinerary.length + 1
    setItinerary((prev) => [
      ...prev,
      { day: nextDay, title: `第 ${nextDay} 天`, items: [], notes: '' },
    ])
    onSelectDay(nextDay)
  }

  const removeDay = (dayNum: number) => {
    if (itinerary.length <= MIN_DAYS) return
    if (!confirm(`確定要刪除 Day ${dayNum} 嗎？該日景點也會一併移除。`)) return
    setItinerary((prev) =>
      prev
        .filter((d) => d.day !== dayNum)
        .map((d, i) => ({ ...d, day: i + 1 }))
    )
    const nextSelected = Math.min(selectedDay, itinerary.length - 1)
    onSelectDay(Math.max(1, nextSelected))
  }

  const resetItinerary = () => {
    if (confirm('確定要重置為建議行程嗎？目前的修改將會遺失。')) {
      setItinerary(defaultItinerary)
      onSelectDay(1)
      setMapFilter('all')
    }
  }

  const totalSpots = useMemo(
    () => itinerary.reduce((sum, d) => sum + d.items.length, 0),
    [itinerary]
  )

  const mapMarkers: MapMarker[] = useMemo(() => {
    const days =
      mapFilter === 'all'
        ? itinerary
        : itinerary.filter((d) => d.day === mapFilter)
    const markers: MapMarker[] = []
    days.forEach((day) => {
      day.items.forEach((item, idx) => {
        const a = getAttraction(item.placeId)
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
  }, [itinerary, mapFilter])

  const scrollToDay = (day: number) => {
    onSelectDay(day)
    setFocusDay(day)
    setTimeout(() => {
      document.getElementById(`day-card-${day}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }, 50)
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <h2>{itinerary.length} 日行程規劃</h2>
          <p>
            已安排 {totalSpots} 個景點 · 一次瀏覽全部天數，可增減至 {MIN_DAYS}–
            {MAX_DAYS} 天
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.addDayBtn}
            onClick={addDay}
            disabled={itinerary.length >= MAX_DAYS}
          >
            ＋ 新增一天
          </button>
          <button className={styles.resetBtn} onClick={resetItinerary}>
            重置建議行程
          </button>
        </div>
      </div>

      <div className={styles.mapBlock}>
        <div className={styles.mapToolbar}>
          <span className={styles.mapTitle}>行程地圖</span>
          <div className={styles.mapFilters}>
            <button
              className={mapFilter === 'all' ? styles.filterActive : ''}
              onClick={() => setMapFilter('all')}
            >
              全部
            </button>
            {itinerary.map((d) => (
              <button
                key={d.day}
                className={mapFilter === d.day ? styles.filterActive : ''}
                style={
                  mapFilter === d.day
                    ? { background: DAY_COLORS[(d.day - 1) % DAY_COLORS.length] }
                    : {
                        borderColor: DAY_COLORS[(d.day - 1) % DAY_COLORS.length],
                        color: DAY_COLORS[(d.day - 1) % DAY_COLORS.length],
                      }
                }
                onClick={() => {
                  setMapFilter(d.day)
                  scrollToDay(d.day)
                }}
              >
                D{d.day}
              </button>
            ))}
          </div>
        </div>
        <TripMap markers={mapMarkers} showRoutes height={380} />
        <div className={styles.legend}>
          {itinerary.map((d) => (
            <button
              key={d.day}
              type="button"
              className={styles.legendItem}
              onClick={() => scrollToDay(d.day)}
            >
              <span
                className={styles.legendDot}
                style={{ background: DAY_COLORS[(d.day - 1) % DAY_COLORS.length] }}
              />
              Day {d.day}
              <small>{d.title}</small>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.weekGrid}>
        {itinerary.map((day, dayIndex) => (
          <article
            key={day.day}
            id={`day-card-${day.day}`}
            className={`${styles.dayCard} ${
              selectedDay === day.day || focusDay === day.day ? styles.dayCardActive : ''
            }`}
            onClick={() => onSelectDay(day.day)}
            style={
              {
                '--day-color': DAY_COLORS[(day.day - 1) % DAY_COLORS.length],
              } as CSSProperties
            }
          >
            <div className={styles.dayCardHeader}>
              <span className={styles.dayBadge}>Day {day.day}</span>
              {itinerary.length > MIN_DAYS && (
                <button
                  className={styles.removeDayBtn}
                  title="刪除此天"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeDay(day.day)
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <input
              className={styles.titleInput}
              value={day.title}
              onChange={(e) => updateTitle(dayIndex, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="這一天的主題..."
            />

            <div className={styles.spotList}>
              {day.items.length === 0 ? (
                <p className={styles.emptyHint}>尚未安排 · 到「景點・餐廳」加入</p>
              ) : (
                day.items.map((sched, itemIndex) => {
                  const attr = getAttraction(sched.placeId)
                  if (!attr) return null
                  return (
                    <div key={`${sched.placeId}-${itemIndex}`} className={styles.spotRow}>
                      <span className={styles.spotNum}>{itemIndex + 1}</span>
                      <div className={styles.spotInfo}>
                        <strong>
                          {(attr.category === 'local' ||
                            attr.category === 'fine' ||
                            attr.category === 'food') &&
                            '🍽️ '}
                          {attr.name}
                        </strong>
                        <span>
                          {attr.area}
                          {attr.cuisine ? ` · ${attr.cuisine}` : ` · ${attr.duration}`}
                          {attr.rating != null ? ` · ★${attr.rating}` : ''}
                        </span>
                      </div>
                      <div
                        className={styles.spotActions}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          disabled={itemIndex === 0}
                          onClick={() => moveItem(dayIndex, itemIndex, -1)}
                          title="上移"
                        >
                          ↑
                        </button>
                        <button
                          disabled={itemIndex === day.items.length - 1}
                          onClick={() => moveItem(dayIndex, itemIndex, 1)}
                          title="下移"
                        >
                          ↓
                        </button>
                        <button
                          className={styles.removeBtn}
                          onClick={() => removeItem(dayIndex, itemIndex)}
                          title="移除"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <textarea
              className={styles.notes}
              value={day.notes}
              onChange={(e) => updateNotes(dayIndex, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="備忘錄..."
              rows={2}
            />
          </article>
        ))}

        {itinerary.length < MAX_DAYS && (
          <button className={styles.addDayCard} onClick={addDay}>
            <span>＋</span>
            新增一天
          </button>
        )}
      </div>
    </section>
  )
}
