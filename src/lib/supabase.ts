import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

// Same trap as SITE_URL in astro.config.mjs: a variable marked Sensitive in the
// Vercel project pulls down as the literal "[SENSITIVE]", and these are inlined
// at build time, so the wrong value ships. Marking either sensitive protects
// nothing — the anon key is compiled into what every visitor is served, and RLS
// is what limits it — while a site that builds green and cannot reach Supabase
// is the worst of the failure modes available.
if (!URL.canParse(url)) {
  throw new Error(
    url === '[SENSITIVE]'
      ? 'VITE_SUPABASE_URL pulled down as "[SENSITIVE]": mark it non-sensitive in the Vercel project.'
      : `VITE_SUPABASE_URL is not a URL: ${JSON.stringify(url)}`,
  )
}

// Anonymous client. It reads `public_posts`, a view over the snapshot table
// carrying only what a page renders. The table itself is owner-only and, since
// migration 0012, not readable by this client at all: it holds the user_id of
// whoever wrote each piece, and a public feed should not be a list of who uses
// the studio.
export const supabase = createClient(url, key, {
  auth: { persistSession: false },
})

// Snapshots are shared with noracasey.com (technical posts), distinguished by
// `site`. Every query here MUST filter on it: without the filter, technical
// posts would render on novellanora.com, and a slug reused across the two
// sites would make `.maybeSingle()` fail on two matching rows.
const SITE = 'novellanora'

/** The shape of a `public_posts` row, as this site reads it.
 *
 *  Nothing verifies it at runtime: the client is untyped, so PostgREST hands
 *  back `any` and every field below is this file's word against the view's. It
 *  is written as an annotation on the result rather than an `as` cast on purpose
 *  — the assumption is identical, but an annotation is a declaration TypeScript
 *  checks later assignments against, where a cast is an instruction to stop
 *  checking. If the view ever grows a second reader, generate the types. */
export interface PublishedEntry {
  site: string
  title: string | null
  slug: string
  body_html: string
  body_text: string
  location: string | null
  published_at: string
  updated_at: string
}

/** Either the store answered, or it could not be asked.
 *
 *  Collapsing those two into `[]` is what made an outage read as "Nora has
 *  published nothing" (PUB-04): `ok: true` with no rows is a real answer that
 *  happens to be empty, `ok: false` is no answer at all, and the routes owe a
 *  reader different things for each. The error itself stays here, in the log,
 *  rather than travelling to a call site that would only have to decide not to
 *  show it. */
export type Query<T> = { ok: true; data: T } | { ok: false }

export async function listPublished(): Promise<Query<PublishedEntry[]>> {
  const { data, error } = await supabase
    .from('public_posts')
    .select('*')
    .eq('site', SITE)
    .order('published_at', { ascending: false })
  if (error) {
    console.error('Failed to list published entries:', error)
    return { ok: false }
  }
  const rows: PublishedEntry[] = data ?? []
  return { ok: true, data: rows }
}

export async function getPublishedBySlug(slug: string): Promise<Query<PublishedEntry | null>> {
  const { data, error } = await supabase
    .from('public_posts')
    .select('*')
    .eq('site', SITE)
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error('Failed to load published entry:', error)
    return { ok: false }
  }
  const row: PublishedEntry | null = data ?? null
  return { ok: true, data: row }
}
