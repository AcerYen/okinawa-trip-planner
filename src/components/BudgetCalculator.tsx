import { useMemo } from 'react'
import { budgetItems } from '../data/okinawa'
import styles from './BudgetCalculator.module.css'

interface Props {
  values: Record<string, number>
  setValues: (
    value: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)
  ) => void
}

export default function BudgetCalculator({ values, setValues }: Props) {
  const defaultValues = Object.fromEntries(
    budgetItems.map((item) => [item.id, item.defaultValue])
  )

  const total = useMemo(
    () => Object.values(values).reduce((sum, v) => sum + (v || 0), 0),
    [values]
  )

  const perPerson = Math.round(total / 3)
  const perDay = Math.round(total / 7)

  const update = (id: string, value: number) => {
    setValues((prev) => ({ ...prev, [id]: value }))
  }

  const reset = () => {
    setValues(defaultValues)
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <h2>預算估算</h2>
          <p>3 人 · 7 天 6 夜 · 台幣估算（可自行調整）</p>
        </div>
        <button className={styles.resetBtn} onClick={reset}>重置</button>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>總預算</span>
          <span className={styles.summaryValue}>NT$ {total.toLocaleString()}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>人均</span>
          <span className={styles.summaryValue}>NT$ {perPerson.toLocaleString()}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>每日</span>
          <span className={styles.summaryValue}>NT$ {perDay.toLocaleString()}</span>
        </div>
      </div>

      <div className={styles.items}>
        {budgetItems.map((item) => {
          const val = values[item.id] ?? 0
          const pct = total > 0 ? (val / total) * 100 : 0
          return (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <label htmlFor={item.id}>{item.label}</label>
                <div className={styles.inputWrap}>
                  <span>NT$</span>
                  <input
                    id={item.id}
                    type="number"
                    min={0}
                    step={500}
                    value={val}
                    onChange={(e) => update(item.id, Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.note}>
        <p>💡 以上為粗略估算，實際費用因季節、住宿等級、機票時間而異。9–10 月為淡季，機票與住宿通常較暑假便宜。</p>
      </div>
    </section>
  )
}
