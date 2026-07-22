import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  CATEGORY_ICONS,
  DAY_COLORS,
  DIFFICULTY_HINT,
  DIFFICULTY_LABELS,
  type Attraction,
  type ScheduleItem,
} from '../data/okinawa'
import PlacePhoto from './PlacePhoto'
import {
  CALENDAR_END_MIN,
  CALENDAR_PX_PER_MIN,
  CALENDAR_START_MIN,
  PLACE_DRAG_TYPE,
  formatClock,
  formatDurationLabel,
  getDefaultDuration,
  snapMinutes,
  travelBetween,
} from '../data/schedule'
import { formatTravelLabel } from '../data/travel'
import styles from './DayCalendar.module.css'

interface Props {
  day: number
  title: string
  notes: string
  items: ScheduleItem[]
  getPlace: (id: string) => Attraction | undefined
  lockedIds: Set<string>
  onNotesChange: (notes: string) => void
  onTitleChange: (title: string) => void
  onDropPlace: (placeId: string, startMin: number) => void
  onMoveItem: (index: number, startMin: number) => void
  onResizeItem: (index: number, durationMin: number) => void
  /** 同時調整開始時間與時長（從上緣拖曳時） */
  onRescheduleItem?: (index: number, startMin: number, durationMin: number) => void
  onRemoveItem: (index: number) => void
  onSelectPlace: (placeId: string) => void
}

const HOURS = Array.from(
  { length: (CALENDAR_END_MIN - CALENDAR_START_MIN) / 60 + 1 },
  (_, i) => CALENDAR_START_MIN + i * 60
)

const MIN_DURATION = 15

type DragMode = 'move' | 'resize-end' | 'resize-start'

interface DragSession {
  mode: DragMode
  index: number
  /** move：指標相對區塊頂端的分鐘偏移 */
  grabOffsetMin: number
  /** resize-start：固定結束時間 */
  endMin: number
  startMin0: number
  duration0: number
  moved: boolean
}

interface LiveEdit {
  index: number
  startMin: number
  durationMin: number
}

export default function DayCalendar({
  day,
  title,
  notes,
  items,
  getPlace,
  lockedIds,
  onNotesChange,
  onTitleChange,
  onDropPlace,
  onMoveItem,
  onResizeItem,
  onRescheduleItem,
  onRemoveItem,
  onSelectPlace,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<DragSession | null>(null)
  const liveRef = useRef<LiveEdit | null>(null)
  const [live, setLive] = useState<LiveEdit | null>(null)
  const suppressClickRef = useRef(false)

  useEffect(() => {
    liveRef.current = live
  }, [live])

  const color = DAY_COLORS[(day - 1) % DAY_COLORS.length]
  const totalMin = useMemo(
    () => items.reduce((s, i) => s + i.durationMin, 0),
    [items]
  )
  const pace = useMemo(() => {
    let high = 0
    let soft = 0
    for (const item of items) {
      const p = getPlace(item.placeId)
      if (!p) continue
      if (
        p.category === 'hotel' ||
        p.category === 'local' ||
        p.category === 'fine' ||
        p.category === 'food'
      ) {
        continue
      }
      if (p.difficulty >= 3) high += 1
      else soft += 1
    }
    return {
      high,
      soft,
      message:
        high > 1
          ? `今日已有 ${high} 個高難度景點（建議最多 1 個）`
          : soft > 2
            ? `今日中／低難度景點 ${soft} 個（建議 1–2 個）`
            : null,
    }
  }, [items, getPlace])

  const yToMin = (clientY: number) => {
    const el = gridRef.current
    if (!el) return CALENDAR_START_MIN
    const rect = el.getBoundingClientRect()
    const y = clientY - rect.top + el.scrollTop
    return CALENDAR_START_MIN + y / CALENDAR_PX_PER_MIN
  }

  const clampStart = (start: number, duration: number) => {
    const maxStart = CALENDAR_END_MIN - duration
    return Math.min(maxStart, Math.max(CALENDAR_START_MIN, snapMinutes(start)))
  }

  const clampDuration = (start: number, duration: number) => {
    const maxDur = CALENDAR_END_MIN - start
    return Math.min(maxDur, Math.max(MIN_DURATION, snapMinutes(duration)))
  }

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const session = sessionRef.current
      if (!session) return
      e.preventDefault()
      const raw = yToMin(e.clientY)

      if (session.mode === 'move') {
        const nextStart = clampStart(raw - session.grabOffsetMin, session.duration0)
        if (
          nextStart !== session.startMin0 ||
          Math.abs(raw - (session.startMin0 + session.grabOffsetMin)) > 2
        ) {
          session.moved = true
        }
        setLive({
          index: session.index,
          startMin: nextStart,
          durationMin: session.duration0,
        })
        return
      }

      if (session.mode === 'resize-end') {
        session.moved = true
        const nextDur = clampDuration(session.startMin0, raw - session.startMin0)
        setLive({
          index: session.index,
          startMin: session.startMin0,
          durationMin: nextDur,
        })
        return
      }

      // resize-start：拖上緣，固定結束時間
      session.moved = true
      const end = session.endMin
      let nextStart = snapMinutes(raw)
      nextStart = Math.max(CALENDAR_START_MIN, Math.min(end - MIN_DURATION, nextStart))
      const nextDur = end - nextStart
      setLive({
        index: session.index,
        startMin: nextStart,
        durationMin: nextDur,
      })
    }

    const onPointerUp = () => {
      const session = sessionRef.current
      const edit = liveRef.current
      sessionRef.current = null
      if (!session || !edit || edit.index !== session.index) {
        setLive(null)
        return
      }
      if (session.moved) {
        suppressClickRef.current = true
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 80)
        if (session.mode === 'move') {
          onMoveItem(session.index, edit.startMin)
        } else if (session.mode === 'resize-end') {
          onResizeItem(session.index, edit.durationMin)
        } else if (onRescheduleItem) {
          onRescheduleItem(session.index, edit.startMin, edit.durationMin)
        } else {
          onMoveItem(session.index, edit.startMin)
          onResizeItem(session.index, edit.durationMin)
        }
      }
      setLive(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [onMoveItem, onResizeItem, onRescheduleItem])

  const beginDrag = (
    e: ReactPointerEvent,
    mode: DragMode,
    index: number,
    item: ScheduleItem
  ) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const grabOffsetMin = Math.max(0, yToMin(e.clientY) - item.startMin)
    sessionRef.current = {
      mode,
      index,
      grabOffsetMin,
      endMin: item.startMin + item.durationMin,
      startMin0: item.startMin,
      duration0: item.durationMin,
      moved: false,
    }
    setLive({
      index,
      startMin: item.startMin,
      durationMin: item.durationMin,
    })
  }

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    const placeId =
      e.dataTransfer.getData(PLACE_DRAG_TYPE) ||
      e.dataTransfer.getData('text/plain')
    if (!placeId || placeId.startsWith('move:')) return
    onDropPlace(placeId, clampStart(yToMin(e.clientY), MIN_DURATION))
  }

  const displayItem = (item: ScheduleItem, index: number): ScheduleItem => {
    if (live && live.index === index) {
      return {
        ...item,
        startMin: live.startMin,
        durationMin: live.durationMin,
      }
    }
    return item
  }

  const gridHeight =
    (CALENDAR_END_MIN - CALENDAR_START_MIN) * CALENDAR_PX_PER_MIN

  return (
    <section className={styles.wrap} style={{ ['--day-color' as string]: color }}>
      <header className={styles.head}>
        <div className={styles.headMain}>
          <span className={styles.badge}>Day {day}</span>
          <input
            className={styles.title}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            aria-label="當日標題"
          />
        </div>
        <div className={styles.stats}>
          <span>{items.length} 站</span>
          <span>合計 {formatDurationLabel(totalMin)}</span>
          <span className={pace.high > 1 ? styles.paceWarn : undefined}>
            高難度 {pace.high}
          </span>
          <span className={pace.soft > 2 ? styles.paceWarn : undefined}>
            中低 {pace.soft}
          </span>
        </div>
      </header>

      <p className={styles.hint}>
        從右側拖入景點；區塊可再拖動。站與站之間已預留車程，衝突會自動順延。
        {DIFFICULTY_HINT}
      </p>
      {pace.message && <p className={styles.paceAlert}>{pace.message}</p>}

      <div className={styles.calendar}>
        <div className={styles.timeCol}>
          {HOURS.map((h) => (
            <div
              key={h}
              className={styles.timeLabel}
              style={{ height: 60 * CALENDAR_PX_PER_MIN }}
            >
              {formatClock(h)}
            </div>
          ))}
        </div>

        <div
          ref={gridRef}
          className={styles.grid}
          style={{ height: gridHeight }}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {HOURS.slice(0, -1).map((h) => (
            <div
              key={h}
              className={styles.hourLine}
              style={{ top: (h - CALENDAR_START_MIN) * CALENDAR_PX_PER_MIN }}
            />
          ))}

          {(() => {
            const displayed = items.map((item, index) => ({
              index,
              item: displayItem(item, index),
            }))
            const ordered = [...displayed].sort(
              (a, b) => a.item.startMin - b.item.startMin
            )
            const gaps: { top: number; height: number; label: string }[] = []
            for (let i = 0; i < ordered.length - 1; i++) {
              const cur = ordered[i].item
              const next = ordered[i + 1].item
              const travel = travelBetween(cur.placeId, next.placeId)
              if (travel == null || travel <= 0) continue
              const gapStart = cur.startMin + cur.durationMin
              const gapEnd = next.startMin
              const gapMin = gapEnd - gapStart
              if (gapMin < 8) continue
              gaps.push({
                top: (gapStart - CALENDAR_START_MIN) * CALENDAR_PX_PER_MIN,
                height: Math.max(gapMin * CALENDAR_PX_PER_MIN, 16),
                label:
                  gapMin >= travel - 5
                    ? formatTravelLabel(travel)
                    : `車程偏緊（估 ${travel} 分）`,
              })
            }
            return gaps.map((g, i) => (
              <div
                key={`travel-${i}`}
                className={styles.travelGap}
                style={{ top: g.top, height: g.height }}
              >
                <span>🚗 {g.label}</span>
              </div>
            ))
          })()}

          {items.map((raw, index) => {
            const item = displayItem(raw, index)
            const place = getPlace(item.placeId)
            if (!place) return null
            const top =
              (item.startMin - CALENDAR_START_MIN) * CALENDAR_PX_PER_MIN
            const height = Math.max(item.durationMin * CALENDAR_PX_PER_MIN, 28)
            const defaultDur = getDefaultDuration(place)
            const custom = item.durationMin !== defaultDur
            const dragging = live?.index === index
            /** 矮於約 80 分：工具列改懸浮顯示，避免蓋住標題／時段 */
            const compact = height < 96
            return (
              <div
                key={`${item.placeId}-${index}`}
                className={`${styles.block} ${place.difficulty >= 3 ? styles.blockHigh : place.difficulty === 2 ? styles.blockMid : styles.blockLow} ${compact ? styles.blockCompact : ''} ${dragging ? styles.blockDragging : ''}`}
                style={{ top, height }}
              >
                <div
                  className={styles.resizeHandleTop}
                  title="拖曳調整開始時間"
                  onPointerDown={(e) => beginDrag(e, 'resize-start', index, raw)}
                />
                <div
                  className={styles.blockBody}
                  title="拖曳調整開始時間"
                  onPointerDown={(e) => beginDrag(e, 'move', index, raw)}
                  onClick={() => {
                    if (suppressClickRef.current) return
                    onSelectPlace(item.placeId)
                  }}
                >
                  <div className={styles.blockMain}>
                    <PlacePhoto place={place} alt="" draggable={false} />
                    <div>
                      <strong>
                        {lockedIds.has(item.placeId) ? '🔒 ' : ''}
                        {CATEGORY_ICONS[place.category]} {place.name}
                      </strong>
                      <span>
                        {formatClock(item.startMin)}–
                        {formatClock(item.startMin + item.durationMin)}
                        {' · '}
                        {formatDurationLabel(item.durationMin)}
                        {' · 體力 '}
                        {DIFFICULTY_LABELS[place.difficulty]}
                        {custom
                          ? `（時長已調整 · 建議 ${place.duration}）`
                          : `（建議 ${place.duration}）`}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className={styles.blockTools}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label>
                    時長
                    <input
                      type="number"
                      min={15}
                      max={600}
                      step={15}
                      value={item.durationMin}
                      onChange={(e) =>
                        onResizeItem(
                          index,
                          Math.max(15, snapMinutes(Number(e.target.value) || 15))
                        )
                      }
                    />
                    <span>分</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      onResizeItem(index, Math.max(15, item.durationMin - 15))
                    }
                  >
                    −15
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onResizeItem(index, Math.min(600, item.durationMin + 15))
                    }
                  >
                    +15
                  </button>
                  <button
                    type="button"
                    title="還原建議時長"
                    onClick={() => onResizeItem(index, defaultDur)}
                  >
                    建議
                  </button>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => onRemoveItem(index)}
                  >
                    ✕
                  </button>
                </div>
                <div
                  className={styles.resizeHandleBottom}
                  title="拖曳調整結束時間"
                  onPointerDown={(e) => beginDrag(e, 'resize-end', index, raw)}
                />
              </div>
            )
          })}
        </div>
      </div>

      <textarea
        className={styles.notes}
        value={notes}
        placeholder="當日備忘..."
        rows={2}
        onChange={(e) => onNotesChange(e.target.value)}
      />
    </section>
  )
}
