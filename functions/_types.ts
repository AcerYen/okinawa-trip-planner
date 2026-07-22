export interface TripRecord {
  version: number
  updatedAt: number
  itinerary: unknown
  packing: Record<string, boolean>
  budget: Record<string, number>
  lockedIds: string[]
}

export interface Env {
  TRIPS: KVNamespace
}
