import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { PublishedEntry } from '@/lib/supabase'

// The half of the SEO spec that has to look at a served page (FIND-04). The
// pure halves — the sitemap's shape, the feed's escaping, the excerpt — are
// asserted beside their modules; what is asserted here was verified by hand
// against a dev server on 14 Sep and then pinned by nothing, which is how
// indexing goes wrong for months while every page looks fine.
//
// It runs against the BUILT function, not a dev server: the site is built, its
// Vercel entrypoint imported, and requests handed to its `fetch` directly — no
// port, no deploy. That matters for more than speed. Only the build compresses
// HTML, and compression once ate a space on /about that dev rendered correctly,
// so a check against dev is a check of something that is never served.
//
// The build goes into a temporary copy of the project rather than this one.
// The Vercel adapter always writes to `<root>/.vercel/output`, and this build
// carries a stub Supabase URL: left in the real tree, a `vercel deploy
// --prebuilt` from a laptop would ship a site that can reach nothing.

const REPO = fileURLToPath(new URL('..', import.meta.url))

/** What every absolute URL must be on: www is canonical, the apex redirects. */
const ORIGIN = 'https://www.novellanora.com'

/** Requests arrive on a preview deployment's host, not the canonical one, so a
 *  canonical tag built from the request rather than the configured site would
 *  point at a URL that is not this site's. */
const REQUEST_ORIGIN = 'https://novellanora-site-git-preview.vercel.app'

const SUPABASE = 'https://supabase.test'

/** Three pieces, each different in a way a page has to cope with: a title that
 *  needs escaping, no title at all, and a piece that was edited after it went
 *  out. A noracasey.com row shares the view, as it does in production, and must
 *  never be served here. */
const POSTS: PublishedEntry[] = [
  {
    site: 'novellanora',
    title: 'Salt & Vinegar',
    slug: 'salt-and-vinegar',
    body_html: '<p>Jim ate the chips first.</p>',
    body_text: 'Jim ate the chips first, before anyone could stop him or ask why.',
    location: 'Barcelona',
    published_at: '2026-09-02T10:00:00.000Z',
    updated_at: '2026-09-04T08:30:00.000Z',
  },
  {
    site: 'novellanora',
    title: null,
    slug: 'untitled-morning',
    body_html: '<p>The street signs were already queer by nine.</p>',
    body_text: 'The street signs were already queer by nine.',
    location: null,
    published_at: '2026-08-19T16:44:41.000Z',
    updated_at: '2026-08-19T16:44:41.000Z',
  },
  {
    site: 'novellanora',
    title: 'Nun of It',
    slug: 'nun-of-it',
    body_html: '<p>Sister Agnes did not approve.</p>',
    body_text: 'Sister Agnes did not approve, and said so to the whole tram.',
    location: null,
    published_at: '2026-07-01T12:00:00.000Z',
    updated_at: '2026-07-01T12:00:00.000Z',
  },
  {
    site: 'noracasey',
    title: 'A technical post',
    slug: 'a-technical-post',
    body_html: '<p>Not for this site.</p>',
    body_text: 'Not for this site.',
    location: null,
    published_at: '2026-09-10T12:00:00.000Z',
    updated_at: '2026-09-10T12:00:00.000Z',
  },
]

const OURS = POSTS.filter((p) => p.site === 'novellanora')

/** Answers the two queries the site makes, the way PostgREST would: the `eq`
 *  filters applied, newest first. Anything else is a request this test does not
 *  know the site makes, and fails loudly rather than returning something. */
async function stubFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = new Request(input, init)
  const url = new URL(request.url)
  if (url.origin !== SUPABASE || url.pathname !== '/rest/v1/public_posts') {
    throw new Error(`Unexpected request from the built site: ${request.method} ${request.url}`)
  }
  let rows = POSTS
  for (const [column, value] of url.searchParams) {
    if (!value.startsWith('eq.')) continue
    const wanted = value.slice(3)
    if (column === 'site') rows = rows.filter((r) => r.site === wanted)
    if (column === 'slug') rows = rows.filter((r) => r.slug === wanted)
  }
  rows = [...rows].sort((a, b) => b.published_at.localeCompare(a.published_at))
  return Response.json(rows)
}

interface Fetchable {
  fetch(request: Request): Promise<Response>
}

function isFetchable(value: unknown): value is Fetchable {
  return (
    typeof value === 'object' &&
    value !== null &&
    'fetch' in value &&
    typeof value.fetch === 'function'
  )
}

let root = ''
let site: Fetchable | undefined

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'novellanora-served-'))
  for (const path of ['src', 'public', 'astro.config.mjs', 'tsconfig.json', 'package.json']) {
    cpSync(join(REPO, path), join(root, path), { recursive: true })
  }
  symlinkSync(join(REPO, 'node_modules'), join(root, 'node_modules'))

  // SITE_URL is left unset so the build takes the configured default, which is
  // the origin every assertion below expects.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    VITE_SUPABASE_URL: SUPABASE,
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  }
  delete env.SITE_URL
  execFileSync(process.execPath, [join(REPO, 'node_modules/astro/bin/astro.mjs'), 'build'], {
    cwd: root,
    env,
    stdio: 'pipe',
  })

  vi.stubGlobal('fetch', stubFetch)
  // The adapter's entrypoint. It was `(req, res)` before @astrojs/vercel 11 and
  // is `{ fetch }` now; if it changes again, this is the line that says so.
  const entry: unknown = await import(
    join(root, '.vercel/output/functions/_render.func/dist/server/entry.mjs')
  )
  const handler = typeof entry === 'object' && entry !== null && 'default' in entry && entry.default
  if (!isFetchable(handler)) throw new Error('The built entrypoint does not export { fetch }')
  site = handler
}, 120_000)

afterAll(() => {
  vi.unstubAllGlobals()
  if (root) rmSync(root, { recursive: true, force: true })
})

async function get(path: string): Promise<Response> {
  if (!site) throw new Error('The site was not built')
  return site.fetch(new Request(new URL(path, REQUEST_ORIGIN)))
}

async function page(path: string): Promise<{ status: number; html: string }> {
  const response = await get(path)
  return { status: response.status, html: await response.text() }
}

/** The pages a reader can land on, read from the build's own route table
 *  rather than written out here — so a page added to src/pages joins every
 *  assertion below, the sitemap's included, without anyone remembering to. */
function staticPages(): string[] {
  const config: unknown = JSON.parse(readFileSync(join(root, '.vercel/output/config.json'), 'utf8'))
  if (typeof config !== 'object' || config === null || !('routes' in config)) {
    throw new Error('.vercel/output/config.json has no routes')
  }
  const routes: unknown = config.routes
  if (!Array.isArray(routes)) throw new Error('.vercel/output/config.json routes is not a list')
  const pages = new Set<string>()
  for (const route of routes) {
    if (typeof route !== 'object' || route === null) continue
    if (!('src' in route) || !('dest' in route) || route.dest !== '_render') continue
    if (typeof route.src !== 'string') continue
    // `^/about/?$` → `/about`. Only a literal path is one page: a parameter or
    // the catch-all is a pattern, an escaped dot is an endpoint (robots.txt,
    // the feed, the sitemap), and an underscore or a 404 is not somewhere a
    // reader is sent.
    const path = route.src.replace(/^\^/, '').replace(/\/\?\$$|\$$/, '') || '/'
    if (!/^\/[\w/-]*$/.test(path) || path.startsWith('/_') || path === '/404') continue
    pages.add(path)
  }
  return [...pages]
}

function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function attributes(tag: string): Record<string, string> {
  const found: Record<string, string> = {}
  for (const [, name, value] of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) found[name] = decode(value)
  return found
}

/** Every value carried by `<tag key="name" … content|href="…">`. A list, so a
 *  page that says something twice fails as loudly as one that says nothing. */
function values(html: string, tag: 'meta' | 'link', key: string, name: string): string[] {
  const out: string[] = []
  for (const [element] of html.matchAll(new RegExp(`<${tag}\\s[^>]*>`, 'g'))) {
    const attrs = attributes(element)
    if (attrs[key] !== name) continue
    out.push(attrs[tag === 'meta' ? 'content' : 'href'] ?? '')
  }
  return out
}

function only(list: string[], what: string): string {
  expect(list, what).toHaveLength(1)
  return list[0]
}

function head(html: string) {
  return {
    title: only(
      [...html.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1])),
      '<title>',
    ),
    description: only(values(html, 'meta', 'name', 'description'), 'description'),
    canonical: only(values(html, 'link', 'rel', 'canonical'), 'canonical'),
    meta: (key: 'name' | 'property', name: string) => only(values(html, 'meta', key, name), name),
  }
}

/** Width and height out of a PNG's IHDR, which is always the first chunk. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** Every HTML page a crawler should find: the static ones and each piece, with
 *  what the page's card should call it. */
function everyPage(): Array<{ path: string; name: string; article: boolean }> {
  return [
    ...staticPages().map((path) => ({ path, name: '', article: false })),
    ...OURS.map((p) => ({
      path: `/writings/${p.slug}`,
      name: p.title ?? 'Untitled',
      article: true,
    })),
  ]
}

describe('the served site', () => {
  it('finds the pages it expects in the build', () => {
    // A floor, so that a route table this test can no longer read fails here
    // rather than passing every loop below with nothing in it.
    expect(staticPages().sort()).toEqual(expect.arrayContaining(['/', '/about']))
  })

  it('answers 200 on every page, and 404 for a piece that does not exist', async () => {
    for (const { path } of everyPage()) {
      expect((await get(path)).status, path).toBe(200)
    }
    expect((await get('/writings/never-written')).status).toBe(404)
    // In the view, but another site's: it must not be served here.
    expect((await get('/writings/a-technical-post')).status).toBe(404)
  })

  it('gives every page its own title, description and canonical', async () => {
    const seen = { title: new Set<string>(), description: new Set<string>() }
    for (const { path } of everyPage()) {
      const { html } = await page(path)
      const tags = head(html)
      expect(tags.canonical, path).toBe(new URL(path, ORIGIN).href)
      expect(tags.description, path).not.toBe('')
      expect(seen.title.has(tags.title), `${path} repeats the title "${tags.title}"`).toBe(false)
      expect(seen.description.has(tags.description), `${path} repeats its description`).toBe(false)
      seen.title.add(tags.title)
      seen.description.add(tags.description)
    }
  })

  it('makes a piece’s card describe the piece, not the site', async () => {
    for (const { path, name, article } of everyPage()) {
      const { html } = await page(path)
      const tags = head(html)
      expect(tags.meta('property', 'og:url'), path).toBe(tags.canonical)
      expect(tags.meta('property', 'og:description'), path).toBe(tags.description)
      expect(tags.meta('name', 'twitter:description'), path).toBe(tags.description)
      expect(tags.meta('name', 'twitter:title'), path).toBe(tags.meta('property', 'og:title'))
      expect(tags.meta('property', 'og:type'), path).toBe(article ? 'article' : 'website')
      if (article) {
        expect(tags.meta('property', 'og:title'), path).toBe(name)
        expect(tags.title, path).toBe(`${name} · Novella Nora`)
      }
    }
  })

  // FIND-05. A card image that 404s is the failure that looks like nothing at
  // all: the unfurl just has no picture. The image is not the function's to
  // serve — Vercel serves .vercel/output/static ahead of it — so "it exists" is
  // a file in that directory, and its size is read from the bytes, not from
  // the constant the head was rendered from.
  it('carries a large card whose image exists, at the size it claims', async () => {
    for (const { path } of everyPage()) {
      const { html } = await page(path)
      const tags = head(html)
      const image = tags.meta('property', 'og:image')
      expect(image, path).toMatch(new RegExp(`^${ORIGIN}/`))
      expect(tags.meta('name', 'twitter:image'), path).toBe(image)
      expect(tags.meta('name', 'twitter:card'), path).toBe('summary_large_image')
      expect(tags.meta('property', 'og:image:alt'), path).not.toBe('')
      expect(tags.meta('name', 'twitter:image:alt'), path).toBe(
        tags.meta('property', 'og:image:alt'),
      )

      const file = join(root, '.vercel/output/static', new URL(image).pathname)
      expect(existsSync(file), `${image} is not in the static output`).toBe(true)
      const size = pngSize(readFileSync(file))
      expect(tags.meta('property', 'og:image:width'), path).toBe(String(size.width))
      expect(tags.meta('property', 'og:image:height'), path).toBe(String(size.height))
    }
  })

  it('lists exactly the URLs it serves in the sitemap', async () => {
    const response = await get('/sitemap.xml')
    expect(response.status).toBe(200)
    const xml = await response.text()
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => decode(m[1]))

    // By length first: a set comparison alone would pass a sitemap that lists
    // a URL twice, and a crawler reads a duplicate as a sign of a careless one.
    expect(locs).toHaveLength(staticPages().length + OURS.length)
    expect(new Set(locs)).toEqual(new Set(everyPage().map(({ path }) => `${ORIGIN}${path}`)))
    for (const loc of locs) {
      expect((await get(new URL(loc).pathname)).status, loc).toBe(200)
    }
  })

  it('names the sitemap in robots.txt, on the canonical origin', async () => {
    const robots = await (await get('/robots.txt')).text()
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
  })

  // The compressed build drops a line break between text and an inline element
  // beside it; split over two lines in the template, this sentence was served
  // as "Reach me athello@novellanora.com". Dev rendered it correctly.
  it('keeps the space before the address on /about', async () => {
    const { html } = await page('/about')
    expect(html).toContain('Reach me at <a href="mailto:hello@novellanora.com">')
  })
})
