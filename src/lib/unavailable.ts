// What every route says when it could not reach the store.
//
// The status is the whole of it. A 200 carrying an empty list is a claim — that
// this is a site with nothing on it — and a Supabase blip, a rotated anon key
// and a view that has not been migrated yet all make that claim on Nora's
// behalf. 503 makes no claim: it says ask again. It is also the one status a
// crawler is known to hold an index against, where an empty 200 invites it to
// drop eight live URLs, and `Retry-After` says how long for the clients that
// honour it — feed readers and crawlers, which are exactly the ones that would
// otherwise record the absence.

/** Used as the page title and the heading on the HTML routes. */
export const UNAVAILABLE_TITLE = 'Not reachable just now'

/** One sentence, in the site's voice, on every route. It says the two things a
 *  reader needs: this is a fault at our end, and nothing has gone. */
export const UNAVAILABLE_MESSAGE =
  'The writing is stored elsewhere, and this site cannot reach it just now. ' +
  'Nothing has been deleted — please try again in a minute.'

/** Seconds. Long enough not to hammer a store that is already unwell, short
 *  enough that a reader who refreshes beats it. */
export const RETRY_AFTER_SECONDS = 60

/** For the feed and the sitemap, which answer with a body rather than a page.
 *  Plain text, because a feed reader showing the raw body to a person is better
 *  than XML that parses into nothing. */
export function unavailableResponse(): Response {
  return new Response(`${UNAVAILABLE_MESSAGE}\n`, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Retry-After': String(RETRY_AFTER_SECONDS),
      // An outage must not be cached as if it were the site.
      'Cache-Control': 'no-store, must-revalidate',
    },
  })
}

/** For the HTML routes, which render the outage in the site's own chrome and so
 *  cannot return a Response of their own. Give it `Astro.response`. */
export function markUnavailable(response: {
  status?: number
  statusText?: string
  headers: Headers
}): void {
  response.status = 503
  // Otherwise the status line reads "503 OK", because the reason phrase is
  // whatever was there before. Cosmetic on the wire — HTTP/2 has no reason
  // phrase at all — but it is what a dev server and a log print.
  response.statusText = 'Service Unavailable'
  response.headers.set('Retry-After', String(RETRY_AFTER_SECONDS))
}
