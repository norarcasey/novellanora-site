import { AsyncLocalStorage } from 'node:async_hooks'

// Where a served page's time goes, said in a `Server-Timing` header (OPS-04).
//
// The no-cache trade in astro.config.mjs is paid in Supabase round trips, and
// the only number it was ever recorded against was a guess. A TTFB taken from a
// laptop bundles that laptop's network, TLS, the edge-to-function hop and any
// cold start with the read itself, so it cannot say what the read costs. This
// can: `db` is the Supabase call alone, timed inside the function, and `app` is
// the whole render around it.
//
// The header is public, and says nothing a reader could not infer from a
// stopwatch: durations, and whether this instance had served a request before.

interface Timings {
  db: number[]
}

const store = new AsyncLocalStorage<Timings>()

// One module instance per function instance, so the first request through it
// is the one that paid for the cold start.
let warm = false

/** Time a Supabase read, and record it against the request it belongs to.
 *  Outside a request (a unit test, a build) it times nothing it can report,
 *  and simply runs. */
export async function timeDb<T>(read: () => PromiseLike<T>): Promise<T> {
  const timings = store.getStore()
  const start = performance.now()
  try {
    return await read()
  } finally {
    timings?.db.push(performance.now() - start)
  }
}

/** Run one request with its own timings, and say them in `Server-Timing`. */
export async function withServerTiming(next: () => Promise<Response>): Promise<Response> {
  const cold = !warm
  warm = true
  const timings: Timings = { db: [] }
  const start = performance.now()
  const response = await store.run(timings, next)
  const app = performance.now() - start
  try {
    response.headers.append('Server-Timing', serverTiming(timings, app, cold))
  } catch {
    // A response with immutable headers (a redirect built by Response.redirect,
    // a fetched response passed through) goes out untimed rather than failing.
  }
  return response
}

export function serverTiming(timings: Timings, app: number, cold: boolean): string {
  const parts = [`app;dur=${app.toFixed(1)}`]
  if (timings.db.length > 0) {
    const total = timings.db.reduce((sum, d) => sum + d, 0)
    parts.push(`db;dur=${total.toFixed(1)};desc="supabase x${timings.db.length}"`)
  }
  if (cold) parts.push('cold;desc="first request on this instance"')
  return parts.join(', ')
}
