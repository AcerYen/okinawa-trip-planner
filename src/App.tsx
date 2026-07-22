import { useState } from 'react'
import Overview from './components/Overview'
import PlannerBoard from './components/PlannerBoard'
import PackingList from './components/PackingList'
import BudgetCalculator from './components/BudgetCalculator'
import BackToTop from './components/BackToTop'
import ShareSync from './components/ShareSync'
import { useSyncedTrip } from './hooks/useSyncedTrip'
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
  const {
    tripId,
    status,
    itinerary,
    setItinerary,
    packing,
    setPacking,
    budget,
    setBudget,
    lockedIds,
    setLockedIds,
    createShareLink,
    copyShareLink,
  } = useSyncedTrip()

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
          <ShareSync
            tripId={tripId}
            status={status}
            onCreate={createShareLink}
            onCopy={copyShareLink}
          />
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
            lockedIds={lockedIds}
            setLockedIds={setLockedIds}
            selectedDay={Math.min(selectedDay, itinerary.length)}
            onSelectDay={setSelectedDay}
          />
        )}
        {tab === 'packing' && <PackingList checked={packing} setChecked={setPacking} />}
        {tab === 'budget' && <BudgetCalculator values={budget} setValues={setBudget} />}
      </main>

      {tab !== 'plan' && (
        <footer className={styles.footer}>
          <p>
            {tripId
              ? '行程已透過分享連結雲端同步 · 祝旅途愉快 🌺'
              : '資料儲存於本機；建立分享連結後可多裝置同步 · 祝旅途愉快 🌺'}
          </p>
        </footer>
      )}

      <BackToTop />
    </div>
  )
}
