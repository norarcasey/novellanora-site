import type { APIRoute } from 'astro'
import { listPublished } from '@/lib/supabase'
import { unavailableResponse } from '@/lib/unavailable'
import { absoluteUrl, writingPath } from '@/lib/site'
import { buildFeed } from '@/lib/feed'
import { excerpt } from '@/lib/text'

// Full text, not an excerpt. This is a writing site: a reader who subscribes in
// a feed reader wants the piece, and making them click through to a page that
// carries no advertising and no metric worth defending buys nothing.
export const GET: APIRoute = async ({ site }) => {
  // A feed that answers 200 with no items is how a subscriber's reader learns
  // that the writing is gone, and some of them act on it. 503 asks it to come
  // back, which is the only thing this route actually knows.
  const result = await listPublished()
  if (!result.ok) return unavailableResponse()
  const writings = result.data

  const xml = buildFeed({
    title: 'Novella Nora',
    description: 'Writings by Nora Casey.',
    home: absoluteUrl('/', site),
    self: absoluteUrl('/rss.xml', site),
    items: writings.map((w) => ({
      title: w.title || 'Untitled',
      link: absoluteUrl(writingPath(w.slug), site),
      published: w.published_at,
      summary: excerpt(w.body_text),
      html: w.body_html,
    })),
  })

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
