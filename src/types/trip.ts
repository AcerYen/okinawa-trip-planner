import type { DayPlan } from '../data/okinawa'

export interface TripData {
  itinerary: DayPlan[]
  packing: Record<string, boolean>
  budget: Record<string, number>
  lockedIds: string[]
}

export interface TripRemote extends TripData {
  id: string
  version: number
  updatedAt: number
}

export type SyncStatus = 'local' | 'loading' | 'synced' | 'saving' | 'offline' | 'error'
