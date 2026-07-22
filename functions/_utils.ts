import type { TripRecord } from './_types'

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export function createTripId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function isTripId(id: string): boolean {
  return /^[a-f0-9]{32}$/.test(id)
}

export function normalizeTrip(input: Partial<TripRecord> | null | undefined, version = 1): TripRecord {
  return {
    version,
    updatedAt: typeof input?.updatedAt === 'number' ? input.updatedAt : Date.now(),
    itinerary: Array.isArray(input?.itinerary) ? input.itinerary : [],
    packing: input?.packing && typeof input.packing === 'object' ? input.packing : {},
    budget: input?.budget && typeof input.budget === 'object' ? input.budget : {},
    lockedIds: Array.isArray(input?.lockedIds) ? input.lockedIds.map(String) : [],
  }
}
