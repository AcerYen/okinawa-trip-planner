import type { Env, TripRecord } from '../../_types'
import { createTripId, json, normalizeTrip } from '../../_utils'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: Partial<TripRecord> = {}
  try {
    body = (await context.request.json()) as Partial<TripRecord>
  } catch {
    body = {}
  }

  const id = createTripId()
  const trip = normalizeTrip(body, 1)
  trip.updatedAt = Date.now()

  await context.env.TRIPS.put(id, JSON.stringify(trip))

  return json({ id, ...trip }, 201)
}
