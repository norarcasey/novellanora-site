import type { APIRoute } from 'astro'
import { listPublished } from '@/lib/supabase'
import { unavailableResponse } from '@/lib/unavailable'
import { absoluteUrl, writingPath } from '@/lib/site'
import { buildSitemap, type SitemapEntry } from '@/lib/sitemap'

// Every URL this site serves, and nothing it does not. The list is the same
// query the index renders from, so a new piece reaches the sitemap by being
// published rather than by anyone remembering to add it.
export const GET: APIRoute = async ({ site }) => {
  // Served during an outage this would be a sitemap of two static pages: an
  // invitation to drop eight live URLs from an index they are already in. A
  // sitemap nobody can build is not the same document as a site of two pages.
  const result = await listPublished()
  if (!result.ok) return unavailableResponse()
  const writings = result.data

  const entries: SitemapEntry[] = [
    { loc: absoluteUrl('/', site) },
    { loc: absoluteUrl('/about', site) },
    ...writings.map((w) => ({
      loc: absoluteUrl(writingPath(w.slug), site),
      lastmod: w.updated_at || w.published_at,
    })),
  ]

  return new Response(buildSitemap(entries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
