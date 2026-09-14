import type { APIRoute } from 'astro'
import { listPublished } from '@/lib/supabase'
import { absoluteUrl, writingPath } from '@/lib/site'
import { buildSitemap, type SitemapEntry } from '@/lib/sitemap'

// Every URL this site serves, and nothing it does not. The list is the same
// query the index renders from, so a new piece reaches the sitemap by being
// published rather than by anyone remembering to add it.
export const GET: APIRoute = async ({ site }) => {
  const writings = await listPublished()

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
