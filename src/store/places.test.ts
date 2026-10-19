import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (k: string) => store.get(k)),
  set: vi.fn(async (k: string, v: unknown) => void store.set(k, v)),
  del: vi.fn(async (k: string) => void store.delete(k)),
}))

const { usePlaces } = await import('./places')

const tokyo = { id: 'tokyo', name: 'Tokyo', region: 'Tokyo · Japan', lat: 35.68, lon: 139.69 }

describe('places store — returning to your own location', () => {
  beforeEach(() => {
    store.clear()
    usePlaces.setState({ places: [], activePlaceId: null, loading: false })
  })

  it('clearActive keeps the saved city but makes "current location" active again', () => {
    usePlaces.getState().addPlace(tokyo)
    expect(usePlaces.getState().activePlaceId).toBe('tokyo')
    expect(store.get('bewthr_active_v1')).toBe('tokyo')

    usePlaces.getState().clearActive()

    expect(usePlaces.getState().activePlaceId).toBeNull()
    expect(usePlaces.getState().places.map((p) => p.id)).toEqual(['tokyo'])   // still saved
    expect(store.has('bewthr_active_v1')).toBe(false)                          // survives reload
  })

  it('selecting the city again after clearActive works', () => {
    usePlaces.getState().addPlace(tokyo)
    usePlaces.getState().clearActive()
    usePlaces.getState().selectPlace('tokyo')
    expect(usePlaces.getState().activePlaceId).toBe('tokyo')
  })
})
