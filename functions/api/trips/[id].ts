import type { Env, TripRecord } from '../../_types'
import { isTripId, json, normalizeTrip } from '../../_utils'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = context.params.id
  if (typeof id !== 'string' || !isTripId(id)) {
    return json({ error: 'invalid_id' }, 400)
  }

  const raw = await context.env.TRIPS.get(id)
  if (!raw) {
    return json({ error: 'not_found' }, 404)
  }

  try {
    const trip = JSON.parse(raw) as TripRecord
    return json({ id, ...trip })
  } catch {
    return json({ error: 'corrupt' }, 500)
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const id = context.params.id
  if (typeof id !== 'string' || !isTripId(id)) {
    return json({ error: 'invalid_id' }, 400)
  }

  let body: Partial<TripRecord> & { version?: number }
  try {
    body = (await context.request.json()) as Partial<TripRecord> & { version?: number }
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  if (typeof body.version !== 'number') {
    return json({ error: 'version_required' }, 400)
  }

  const raw = await context.env.TRIPS.get(id)
  if (!raw) {
    return json({ error: 'not_found' }, 404)
  }

  let current: TripRecord
  try {
    current = JSON.parse(raw) as TripRecord
  } catch {
    return json({ error: 'corrupt' }, 500)
  }

  if (body.version !== current.version) {
    return json({ error: 'conflict', current }, 409)
  }

  const next = normalizeTrip(
    {
      itinerary: body.itinerary ?? current.itinerary,
      packing: body.packing ?? current.packing,
      budget: body.budget ?? current.budget,
      lockedIds: body.lockedIds ?? current.lockedIds,
    },
    current.version + 1
  )
  next.updatedAt = Date.now()

  await context.env.TRIPS.put(id, JSON.stringify(next))
  return json({ id, ...next })
}
