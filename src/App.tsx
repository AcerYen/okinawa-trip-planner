import { useState } from 'react'
import Overview from './components/Overview'
import PlannerBoard from './components/PlannerBoard'
import PackingList from './components/PackingList'
import BudgetCalculator from './components/BudgetCalculator'
import BackToTop from './components/BackToTop'
import { defaultItinerary, type DayPlan } from './data/okinawa'
import { useLocalStorage } from './hooks/useLocalStorage'
import styles from './App.module.css'

type Tab = 'overview' | 'plan' | 'packing' | 'budget'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview', label: '總覽', icon: '🏠' },
  { id: 'plan', label: '行程規劃', icon: '🗺️' },
  { id: 'packing', label: '行李清單', icon: '🧳' },
  { id: 'budget', label: '預算估算', icon: '💰' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('plan')
  const [selectedDay, setSelectedDay] = useState(1)
  const [itinerary, setItinerary] = useLocalStorage<DayPlan[]>(
    'okinawa-itinerary-v12',
    defaultItinerary
  )

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={`${styles.headerInner} ${tab === 'plan' ? styles.headerWide : ''}`}>
          <div className={styles.logo}>
            <span>🏝️</span>
            <div>
              <strong>沖繩親子之旅</strong>
              <small>2026 · Sep/Oct</small>
            </div>
          </div>
          <nav className={styles.nav}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${styles.navBtn} ${tab === t.id ? styles.active : ''}`}
                onClick={() => setTab(t.id)}
              >
                <span className={styles.navIcon}>{t.icon}</span>
                <span className={styles.navLabel}>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className={`${styles.main} ${tab === 'plan' ? styles.mainWide : ''}`}>
        {tab === 'overview' && <Overview />}
        {tab === 'plan' && (
          <PlannerBoard
            itinerary={itinerary}
            setItinerary={setItinerary}
            selectedDay={Math.min(selectedDay, itinerary.length)}
            onSelectDay={setSelectedDay}
          />
        )}
        {tab === 'packing' && <PackingList />}
        {tab === 'budget' && <BudgetCalculator />}
      </main>

      {tab !== 'plan' && (
        <footer className={styles.footer}>
          <p>資料自動儲存於瀏覽器 · 祝旅途愉快 🌺</p>
        </footer>
      )}

      <BackToTop />
    </div>
  )
}
