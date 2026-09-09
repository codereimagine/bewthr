/**
 * DataFeed — bewthr's data seam. A feed declares an id, a live fetch, and an
 * optional refresh interval; useFeed tries live, shares in-flight pulls, and
 * caches per feed id, so several mounts cost one upstream request per interval.
 *
 * Because bewthr fetches for the user's arbitrary chosen place (not a fixed
 * grid), there is no static snapshot to ship — the fallback is LAST-KNOWN-
 * CACHED: the most recent successful live result for that feed id, persisted to
 * localStorage, so the app still renders a real prior reading when the network
 * is down.
 */

import { useEffect, useState } from 'react'

export interface DataFeed<T> {
  /** stable id — MUST fold in place + units so distinct contexts cache apart */
  id: string
  /** the live fetch (already unit-shaped for the caller) */
  fetchLive: () => Promise<T>
  /** re-poll interval ms; also the live-cache TTL. 0 / undefined = no re-poll */
  refreshMs?: number
  /** localStorage key for last-known-good; absent = no persistence */
  persistKey?: string
  /** false = do not fetch yet (e.g. coords not ready); stays in loading state */
  enabled?: boolean
}

export interface FeedState<T> {
  /** current data — live, last-known-cached, or null before anything lands */
  data: T | null
  /** true = a fresh live pull succeeded this session */
  live: boolean
  /** true = showing last-known-cached because the live pull failed */
  stale: boolean
  /** ISO time of the reading currently shown, or null */
  asOf: string | null
  /** set only when there is NO data to show at all */
  error: string | null
}

const PERSIST_PREFIX = 'bewthr:feed:'
const LIVE_CACHE = new Map<string, { at: number; data: unknown }>()
const IN_FLIGHT = new Map<string, Promise<unknown>>()

interface Persisted<T> {
  at: string
  data: T
}

function readPersist<T>(key: string | undefined): Persisted<T> | null {
  if (!key) return null
  try {
    const raw = localStorage.getItem(PERSIST_PREFIX + key)
    if (!raw) return null
    const p = JSON.parse(raw) as Persisted<T>
    return p && typeof p.at === 'string' && 'data' in p ? p : null
  } catch {
    return null
  }
}

function writePersist<T>(key: string | undefined, data: T): void {
  if (!key) return
  try {
    localStorage.setItem(
      PERSIST_PREFIX + key,
      JSON.stringify({ at: new Date().toISOString(), data } satisfies Persisted<T>)
    )
  } catch {
    // storage full / disabled — last-known is a nicety, never fatal
  }
}

// Live results cached per id (TTL = refreshMs) and in-flight pulls shared, so
// several mounts of the same feed cost one upstream request per interval.
function pullLive<T>(id: string, fetchLive: () => Promise<T>, refreshMs?: number): Promise<T> {
  const ttl = refreshMs && refreshMs > 0 ? refreshMs : 60_000
  const hit = LIVE_CACHE.get(id)
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.data as T)
  let p = IN_FLIGHT.get(id) as Promise<T> | undefined
  if (!p) {
    p = fetchLive()
      .then((data) => {
        LIVE_CACHE.set(id, { at: Date.now(), data })
        return data
      })
      .finally(() => IN_FLIGHT.delete(id))
    IN_FLIGHT.set(id, p)
  }
  return p
}

function seed<T>(feed: DataFeed<T>): FeedState<T> {
  const cached = readPersist<T>(feed.persistKey)
  return cached
    ? { data: cached.data, live: false, stale: true, asOf: cached.at, error: null }
    : { data: null, live: false, stale: false, asOf: null, error: null }
}

export function useFeed<T>(feed: DataFeed<T>): FeedState<T> {
  const [state, setState] = useState<FeedState<T>>(() => seed(feed))
  const [prevId, setPrevId] = useState(feed.id)

  // Place / units changed → show that id's last-known immediately. React's
  // endorsed "adjust state during render" pattern (not an effect), so the new
  // context never flashes the previous place's reading.
  if (prevId !== feed.id) {
    setPrevId(feed.id)
    setState(seed(feed))
  }

  // `feed` is memoized by the caller, so its identity is the subscription key.
  useEffect(() => {
    if (feed.enabled === false) return
    let dead = false

    const run = async () => {
      try {
        const data = await pullLive(feed.id, feed.fetchLive, feed.refreshMs)
        if (dead) return
        writePersist(feed.persistKey, data)
        setState({ data, live: true, stale: false, asOf: new Date().toISOString(), error: null })
      } catch {
        if (dead) return
        setState((s) =>
          s.data != null
            ? { ...s, live: false, stale: true, error: null }
            : { data: null, live: false, stale: false, asOf: null, error: 'Connection failed' }
        )
      }
    }
    run()

    let timer: ReturnType<typeof setInterval> | null = null
    if (feed.refreshMs && feed.refreshMs > 0) timer = setInterval(run, feed.refreshMs)

    return () => {
      dead = true
      if (timer) clearInterval(timer)
    }
  }, [feed])

  return state
}
