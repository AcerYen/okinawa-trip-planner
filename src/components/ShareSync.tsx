import { useState } from 'react'
import type { SyncStatus } from '../types/trip'
import styles from './ShareSync.module.css'

interface Props {
  tripId: string | null
  status: SyncStatus
  onCreate: () => Promise<string | null>
  onCopy: () => Promise<boolean>
}

const STATUS_LABEL: Record<SyncStatus, string> = {
  local: '僅本機',
  loading: '載入中…',
  synced: '已同步',
  saving: '同步中…',
  offline: '離線',
  error: '同步失敗',
}

const STATUS_CLASS: Record<SyncStatus, string> = {
  local: styles.local,
  loading: styles.loading,
  synced: styles.synced,
  saving: styles.saving,
  offline: styles.offline,
  error: styles.error,
}

export default function ShareSync({ tripId, status, onCreate, onCopy }: Props) {
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  const flash = (msg: string) => {
    setHint(msg)
    window.setTimeout(() => setHint(null), 2000)
  }

  const handleCreate = async () => {
    setBusy(true)
    const url = await onCreate()
    setBusy(false)
    if (url) flash('已建立分享連結')
    else flash('建立失敗')
  }

  const handleCopy = async () => {
    setBusy(true)
    const ok = await onCopy()
    setBusy(false)
    flash(ok ? '連結已複製' : '複製失敗')
  }

  return (
    <div className={styles.wrap}>
      <span className={`${styles.status} ${STATUS_CLASS[status]}`} title={tripId ?? undefined}>
        {STATUS_LABEL[status]}
      </span>
      {tripId ? (
        <button type="button" className={styles.btn} disabled={busy} onClick={() => void handleCopy()}>
          複製連結
        </button>
      ) : (
        <button type="button" className={styles.btnPrimary} disabled={busy} onClick={() => void handleCreate()}>
          建立分享連結
        </button>
      )}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
