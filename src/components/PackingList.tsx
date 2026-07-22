import { packingList } from '../data/okinawa'
import styles from './PackingList.module.css'

const CATEGORY_LABELS = {
  baby: '👶 寶寶用品',
  clothing: '👕 衣物',
  essentials: '🎒 必備',
  documents: '📄 證件',
}

interface Props {
  checked: Record<string, boolean>
  setChecked: (
    value: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => void
}

export default function PackingList({ checked, setChecked }: Props) {

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const categories = Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]
  const total = packingList.length
  const done = packingList.filter((item) => checked[item.id]).length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const resetAll = () => {
    if (confirm('確定要清除所有勾選嗎？')) {
      setChecked({})
    }
  }

  const checkAll = () => {
    const all: Record<string, boolean> = {}
    packingList.forEach((item) => { all[item.id] = true })
    setChecked(all)
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <h2>行李清單</h2>
          <p>帶 1 歲半寶寶的完整 packing list</p>
        </div>
        <div className={styles.actions}>
          <button onClick={checkAll}>全部勾選</button>
          <button onClick={resetAll}>清除勾選</button>
        </div>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.progressText}>{done} / {total}（{progress}%）</span>
      </div>

      <div className={styles.categories}>
        {categories.map((cat) => {
          const items = packingList.filter((i) => i.category === cat)
          const catDone = items.filter((i) => checked[i.id]).length
          return (
            <div key={cat} className={styles.category}>
              <h3>
                {CATEGORY_LABELS[cat]}
                <span className={styles.catCount}>{catDone}/{items.length}</span>
              </h3>
              <ul>
                {items.map((item) => (
                  <li key={item.id}>
                    <label className={checked[item.id] ? styles.done : ''}>
                      <input
                        type="checkbox"
                        checked={!!checked[item.id]}
                        onChange={() => toggle(item.id)}
                      />
                      {item.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
