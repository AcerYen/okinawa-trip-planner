import { useState, useMemo } from 'react'
import {
  attractions,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type Category,
  type Attraction,
} from '../data/okinawa'
import TripMap, { attractionsToMarkers } from './TripMap'
import styles from './Attractions.module.css'

interface Props {
  onAddToDay?: (id: string) => void
  selectedDay?: number
  dayCount?: number
  onSelectDay?: (day: number) => void
}

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

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className={styles.rating} title={`${rating} / 5`}>
      <span className={styles.ratingScore}>★ {rating.toFixed(1)}</span>
    </span>
  )
}

export default function Attractions({
  onAddToDay,
  selectedDay = 1,
  dayCount = 7,
  onSelectDay,
}: Props) {
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [kind, setKind] = useState<KindFilter>('all')
  const [toddlerOnly, setToddlerOnly] = useState(false)
  const [highRatedOnly, setHighRatedOnly] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const localCount = attractions.filter((a) => a.category === 'local').length
  const fineCount = attractions.filter((a) => a.category === 'fine').length
  const foodCount = attractions.filter((a) => a.category === 'food').length
  const hotelCount = attractions.filter((a) => a.category === 'hotel').length

  const filtered = useMemo(() => {
    return attractions.filter((a) => {
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
  }, [filter, kind, toddlerOnly, highRatedOnly, search])

  const mapMarkers = useMemo(() => attractionsToMarkers(filtered), [filtered])
  const categories = Object.keys(CATEGORY_LABELS) as Category[]

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>景點・餐廳</h2>
        <p>
          {attractions.length - localCount - fineCount - foodCount - hotelCount} 景點 ·{' '}
          {localCount} 在地 · {fineCount} 高級 · {foodCount} 小吃 · {hotelCount} 住宿 · 目前顯示{' '}
          {filtered.length} 個
        </p>
      </div>

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
            className={kind === id ? styles.kindActive : ''}
            onClick={() => {
              setKind(id)
              if (id === 'local' || id === 'fine' || id === 'stay') setFilter('all')
              if (
                id === 'spot' &&
                (filter === 'local' || filter === 'fine' || filter === 'food' || filter === 'hotel')
              ) {
                setFilter('all')
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.mapBlock}>
        <TripMap
          markers={mapMarkers}
          height={340}
          onMarkerClick={(id) => {
            setExpanded(id)
            document.getElementById(`attr-${id}`)?.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
            })
          }}
        />
      </div>

      {onAddToDay && (
        <div className={styles.dayPicker}>
          <span>加入行程到：</span>
          <div className={styles.dayPickerBtns}>
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                type="button"
                className={selectedDay === d ? styles.dayActive : ''}
                onClick={() => onSelectDay?.(d)}
              >
                Day {d}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="搜尋景點、餐廳、料理或地區..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
        />
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={highRatedOnly}
            onChange={(e) => setHighRatedOnly(e.target.checked)}
          />
          僅 4.3★ 以上
        </label>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={toddlerOnly}
            onChange={(e) => setToddlerOnly(e.target.checked)}
          />
          幼兒友善
        </label>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          全部類型
        </button>
        {categories
          .filter((cat) => {
            if (kind === 'spot') return !['local', 'fine', 'food', 'hotel'].includes(cat)
            if (kind === 'local') return cat === 'local' || cat === 'food'
            if (kind === 'fine') return cat === 'fine'
            if (kind === 'stay') return cat === 'hotel'
            return true
          })
          .map((cat) => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${filter === cat ? styles.active : ''}`}
              onClick={() => setFilter(cat)}
            >
              {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
            </button>
          ))}
      </div>

      <div className={styles.grid}>
        {filtered.map((a) => (
          <AttractionCard
            key={a.id}
            attraction={a}
            expanded={expanded === a.id}
            onToggle={() => setExpanded(expanded === a.id ? null : a.id)}
            onAdd={onAddToDay ? () => onAddToDay(a.id) : undefined}
            selectedDay={selectedDay}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className={styles.empty}>沒有符合條件的項目，試試調整篩選條件。</p>
      )}
    </section>
  )
}

function AttractionCard({
  attraction: a,
  expanded,
  onToggle,
  onAdd,
  selectedDay,
}: {
  attraction: Attraction
  expanded: boolean
  onToggle: () => void
  onAdd?: () => void
  selectedDay?: number
}) {
  const eat = isEat(a)
  return (
    <article
      id={`attr-${a.id}`}
      className={`${styles.card} ${expanded ? styles.expanded : ''} ${eat ? styles.eatCard : ''}`}
    >
      <div className={styles.cardHeader} onClick={onToggle}>
        <div className={styles.cardTitle}>
          <span className={styles.categoryIcon}>{CATEGORY_ICONS[a.category]}</span>
          <div>
            <h3>{a.name}</h3>
            <span className={styles.nameJa}>{a.nameJa}</span>
          </div>
        </div>
        <div className={styles.badges}>
          {a.rating != null && <RatingStars rating={a.rating} />}
          {eat && <span className={styles.badgeEat}>餐廳</span>}
          {a.toddlerFriendly && <span className={styles.badge}>👶 幼兒 OK</span>}
          {a.strollerFriendly && <span className={styles.badge}>🛒 推車 OK</span>}
        </div>
      </div>

      <div className={styles.meta}>
        <span>📍 {a.area}</span>
        {a.cuisine && <span>🍴 {a.cuisine}</span>}
        <span>⏱ {a.duration}</span>
        <span>💴 {a.cost}</span>
      </div>

      {expanded && (
        <div className={styles.details}>
          <p>{a.description}</p>
          {a.rating != null && (
            <div className={styles.ratingBlock}>
              <strong>★ {a.rating.toFixed(1)}</strong>
              {a.ratingNote && <span>{a.ratingNote}</span>}
            </div>
          )}
          <div className={styles.tip}>
            <strong>💡 小提示</strong>
            <p>{a.tips}</p>
          </div>
          {onAdd && selectedDay !== undefined && (
            <button className={styles.addBtn} onClick={onAdd}>
              加入 Day {selectedDay} 行程
            </button>
          )}
        </div>
      )}
    </article>
  )
}
