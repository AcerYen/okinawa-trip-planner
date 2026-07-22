import { useCallback, useEffect, useRef, useState } from 'react'
import {
  budgetItems,
  defaultItinerary,
  defaultLockedPlaces,
  type DayPlan,
} from '../data/okinawa'
import type { SyncStatus, TripData, TripRemote } from '../types/trip'

const STORAGE = {
  itinerary: 'okinawa-itinerary-v12',
  packing: 'okinawa-packing',
  budget: 'okinawa-budget',
  lockedIds: 'okinawa-locked-v1',
  tripId: 'okinawa-trip-id',
} as const

const POLL_MS = 4000
const SAVE_DEBOUNCE_MS = 800

function defaultBudget(): Record<string, number> {
  return Object.fromEntries(budgetItems.map((item) => [item.id, item.defaultValue]))
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function readLocalTrip(): TripData {
  return {
    itinerary: readJson(STORAGE.itinerary, defaultItinerary),
    packing: readJson(STORAGE.packing, {}),
    budget: readJson(STORAGE.budget, defaultBudget()),
    lockedIds: readJson(STORAGE.lockedIds, defaultLockedPlaces),
  }
}

function writeLocalTrip(data: TripData, tripId: string | null) {
  localStorage.setItem(STORAGE.itinerary, JSON.stringify(data.itinerary))
  localStorage.setItem(STORAGE.packing, JSON.stringify(data.packing))
  localStorage.setItem(STORAGE.budget, JSON.stringify(data.budget))
  localStorage.setItem(STORAGE.lockedIds, JSON.stringify(data.lockedIds))
  if (tripId) localStorage.setItem(STORAGE.tripId, tripId)
  else localStorage.removeItem(STORAGE.tripId)
}

function tripIdFromUrl(): string | null {
  const id = new URLSearchParams(window.location.search).get('trip')
  return id && /^[a-f0-9]{32}$/.test(id) ? id : null
}

function setTripInUrl(id: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('trip', id)
  window.history.replaceState({}, '', url.toString())
}

function shareUrlFor(id: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('trip', id)
  return url.toString()
}

type Setter<T> = T | ((prev: T) => T)

function applySetter<T>(prev: T, value: Setter<T>): T {
  return typeof value === 'function' ? (value as (p: T) => T)(prev) : value
}

export function useSyncedTrip() {
  const urlTripId = tripIdFromUrl()
  const initialLocal = readLocalTrip()

  const [tripId, setTripId] = useState<string | null>(urlTripId)
  const [status, setStatus] = useState<SyncStatus>(urlTripId ? 'loading' : 'local')
  const [itinerary, setItineraryState] = useState<DayPlan[]>(initialLocal.itinerary)
  const [packing, setPackingState] = useState<Record<string, boolean>>(initialLocal.packing)
  const [budget, setBudgetState] = useState<Record<string, number>>(initialLocal.budget)
  const [lockedIds, setLockedIdsState] = useState<string[]>(initialLocal.lockedIds)

  const versionRef = useRef(0)
  const dataRef = useRef<TripData>(initialLocal)
  const dirtyRef = useRef(false)
  const tripIdRef = useRef(tripId)
  const readyRef = useRef(!urlTripId)
  const applyingRemoteRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveToCloudRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    tripIdRef.current = tripId
  }, [tripId])

  const applyRemote = useCallback((id: string, remote: TripRemote) => {
    applyingRemoteRef.current = true
    versionRef.current = remote.version
    dirtyRef.current = false
    const next: TripData = {
      itinerary: Array.isArray(remote.itinerary) ? remote.itinerary : defaultItinerary,
      packing: remote.packing ?? {},
      budget: remote.budget && Object.keys(remote.budget).length > 0 ? remote.budget : defaultBudget(),
      lockedIds: remote.lockedIds ?? defaultLockedPlaces,
    }
    dataRef.current = next
    setItineraryState(next.itinerary)
    setPackingState(next.packing)
    setBudgetState(next.budget)
    setLockedIdsState(next.lockedIds)
    writeLocalTrip(next, id)
    setStatus(navigator.onLine ? 'synced' : 'offline')
  }, [])

  const saveToCloud = useCallback(async () => {
    const id = tripIdRef.current
    if (!id || !readyRef.current) return

    const payload = {
      version: versionRef.current,
      ...dataRef.current,
    }

    try {
      const res = await fetch(`/api/trips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 409) {
        const conflict = (await res.json()) as { current?: Omit<TripRemote, 'id'> }
        if (conflict.current) {
          applyRemote(id, { id, ...conflict.current })
        }
        return
      }

      if (!res.ok) {
        setStatus('error')
        return
      }

      const saved = (await res.json()) as TripRemote
      versionRef.current = saved.version
      dirtyRef.current = false
      setStatus('synced')
    } catch {
      setStatus('offline')
    }
  }, [applyRemote])

  useEffect(() => {
    saveToCloudRef.current = saveToCloud
  }, [saveToCloud])

  const fetchTrip = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/trips/${id}`)
        if (!res.ok) {
          setStatus('error')
          return
        }
        const remote = (await res.json()) as TripRemote
        if (dirtyRef.current) return
        if (remote.version !== versionRef.current) {
          applyRemote(id, remote)
        } else {
          setStatus(navigator.onLine ? 'synced' : 'offline')
        }
      } catch {
        setStatus('offline')
      }
    },
    [applyRemote]
  )

  // Initial cloud hydrate when URL has trip id
  useEffect(() => {
    const id = tripIdFromUrl()
    if (!id) {
      readyRef.current = true
      return
    }

    let cancelled = false
    setTripId(id)
    setStatus('loading')

    void (async () => {
      try {
        const res = await fetch(`/api/trips/${id}`)
        if (cancelled) return
        if (!res.ok) {
          readyRef.current = true
          setStatus('error')
          return
        }
        const remote = (await res.json()) as TripRemote
        if (cancelled) return
        applyRemote(id, remote)
        readyRef.current = true
      } catch {
        if (cancelled) return
        readyRef.current = true
        setStatus('offline')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applyRemote])

  // Persist local + debounce cloud save
  useEffect(() => {
    dataRef.current = { itinerary, packing, budget, lockedIds }

    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false
      writeLocalTrip(dataRef.current, tripIdRef.current)
      return
    }

    writeLocalTrip(dataRef.current, tripIdRef.current)

    if (!tripIdRef.current) {
      setStatus('local')
      return
    }

    if (!readyRef.current) return

    dirtyRef.current = true
    setStatus('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void saveToCloudRef.current()
    }, SAVE_DEBOUNCE_MS)
  }, [itinerary, packing, budget, lockedIds])

  // Poll + online/offline
  useEffect(() => {
    if (!tripId) return

    const poll = () => {
      if (document.visibilityState !== 'visible') return
      if (!readyRef.current || dirtyRef.current) return
      void fetchTrip(tripId)
    }

    const timer = setInterval(poll, POLL_MS)
    const onVis = () => poll()
    const onOnline = () => {
      if (dirtyRef.current) {
        setStatus('saving')
        void saveToCloudRef.current()
      } else {
        void fetchTrip(tripId)
      }
    }
    const onOffline = () => setStatus('offline')

    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [tripId, fetchTrip])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const setItinerary = useCallback((value: Setter<DayPlan[]>) => {
    setItineraryState((prev) => applySetter(prev, value))
  }, [])

  const setPacking = useCallback((value: Setter<Record<string, boolean>>) => {
    setPackingState((prev) => applySetter(prev, value))
  }, [])

  const setBudget = useCallback((value: Setter<Record<string, number>>) => {
    setBudgetState((prev) => applySetter(prev, value))
  }, [])

  const setLockedIds = useCallback((value: Setter<string[]>) => {
    setLockedIdsState((prev) => applySetter(prev, value))
  }, [])

  const createShareLink = useCallback(async () => {
    setStatus('saving')
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataRef.current),
      })
      if (!res.ok) {
        setStatus('error')
        return null
      }
      const created = (await res.json()) as TripRemote
      versionRef.current = created.version
      dirtyRef.current = false
      readyRef.current = true
      applyingRemoteRef.current = true
      setTripId(created.id)
      tripIdRef.current = created.id
      setTripInUrl(created.id)
      writeLocalTrip(dataRef.current, created.id)
      setStatus('synced')
      return shareUrlFor(created.id)
    } catch {
      setStatus('offline')
      return null
    }
  }, [])

  const copyShareLink = useCallback(async () => {
    const id = tripIdRef.current
    if (!id) {
      const created = await createShareLink()
      if (!created) return false
      try {
        await navigator.clipboard.writeText(created)
        return true
      } catch {
        return false
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrlFor(id))
      return true
    } catch {
      return false
    }
  }, [createShareLink])

  return {
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
    shareUrl: tripId ? shareUrlFor(tripId) : null,
  }
}
