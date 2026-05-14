import type { APIRoute } from 'astro'

export const prerender = false

// Called by the studio (Inkwell) when a writing is published, re-published,
// or unpublished. Triggers Vercel ISR to refresh the affected pages.
//
// Body: { slug: string, action: 'publish' | 'unpublish', secret: string }
//
// Auth is a single shared secret (REVALIDATE_SECRET). The actual cache
// purge is done by hitting the routes with Vercel's bypass token —
// see https://docs.astro.build/en/guides/integrations-guide/vercel/#isr
export const POST: APIRoute = async ({ request, url }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { slug, action, secret } = (body ?? {}) as {
    slug?: string
    action?: 'publish' | 'unpublish'
    secret?: string
  }

  const expected = import.meta.env.REVALIDATE_SECRET
  if (!expected) {
    return json({ error: 'Server not configured (REVALIDATE_SECRET missing)' }, 500)
  }
  if (secret !== expected) {
    return json({ error: 'Forbidden' }, 403)
  }
  if (!slug || (action !== 'publish' && action !== 'unpublish')) {
    return json({ error: 'Missing slug or action' }, 400)
  }

  const bypassToken = import.meta.env.REVALIDATE_BYPASS_TOKEN
  if (!bypassToken) {
    return json({ error: 'Server not configured (REVALIDATE_BYPASS_TOKEN missing)' }, 500)
  }

  const origin = import.meta.env.SITE_URL || new URL(url).origin

  // Refresh the home page (writing list) and the specific writing page.
  const targets = ['/', `/writings/${encodeURIComponent(slug)}`]
  const refreshed: string[] = []
  const errors: string[] = []

  await Promise.all(
    targets.map(async (path) => {
      const target = `${origin}${path}?_vercel_revalidate=${bypassToken}`
      try {
        const res = await fetch(target, { headers: { 'x-revalidate': '1' } })
        if (res.ok || res.status === 404) {
          refreshed.push(path)
        } else {
          errors.push(`${path}: HTTP ${res.status}`)
        }
      } catch (err) {
        errors.push(`${path}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }),
  )

  return json({ ok: errors.length === 0, refreshed, errors, action }, errors.length ? 207 : 200)
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
