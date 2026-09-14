// Absolute URLs, in one place.
//
// `www` is canonical for this site — the apex redirects to it, the opposite
// direction from noracasey.com — so anything that emits an absolute URL has to
// say www or it points a canonical tag, a sitemap entry or a social card at a
// redirect. That is the whole reason these helpers exist rather than string
// concatenation at each call site.

/** Used when Astro has no configured `site`, which is only the case in dev. */
export const SITE_ORIGIN = 'https://www.novellanora.com'

/** The path a published piece is served at. The sitemap, the feed and the
 *  canonical tag must all agree with this, or they advertise URLs that differ
 *  from the ones that exist. */
export function writingPath(slug: string): string {
  return `/writings/${slug}`
}

/** An absolute URL for `path`, against `origin` when one is known. */
export function absoluteUrl(path: string, origin?: URL | string): string {
  return new URL(path, origin ?? SITE_ORIGIN).href
}

/** Escape text for XML content or a double-quoted attribute. The feed and the
 *  sitemap both carry titles and slugs that came from a person typing, so an
 *  ampersand in a title is a matter of time rather than a hypothetical. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
