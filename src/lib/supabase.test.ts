import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// One recorded chain per query, so a test can assert what was actually asked of
// Supabase rather than what the code appears to ask.
interface Recorded {
  table: string
  filters: Array<[string, unknown]>
  maybeSingle: boolean
}

const recorded: Recorded[] = []
let response: { data: unknown; error: unknown } = { data: [], error: null }

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from(table: string) {
      const entry: Recorded = { table, filters: [], maybeSingle: false }
      recorded.push(entry)
      const chain = {
        select: () => chain,
        eq(column: string, value: unknown) {
          entry.filters.push([column, value])
          return chain
        },
        order: () => Promise.resolve(response),
        maybeSingle() {
          entry.maybeSingle = true
          return Promise.resolve(response)
        },
      }
      return chain
    },
  }),
}))

const { listPublished, getPublishedBySlug } = await import('./supabase')

beforeEach(() => {
  recorded.length = 0
  response = { data: [], error: null }
  // The failure paths log, and that is deliberate — the console is where the
  // PostgrestError stays. It just should not scroll past a green test run.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the queries this site makes', () => {
  // Both queries once filtered on nothing. Technical posts from noracasey.com
  // share the table, so the list rendered them, and a slug used on both sites
  // matched two rows and made maybeSingle fail outright. That shipped, and was
  // fixed on 19 Aug; this is the assertion that would have caught it.
  it('scopes the list to this site', async () => {
    await listPublished()
    expect(recorded[0].filters).toContainEqual(['site', 'novellanora'])
  })

  it('scopes the single-piece lookup to this site as well as the slug', async () => {
    await getPublishedBySlug('nun-of-it')
    expect(recorded[0].filters).toContainEqual(['site', 'novellanora'])
    expect(recorded[0].filters).toContainEqual(['slug', 'nun-of-it'])
  })

  // The table carries the user_id of whoever wrote each piece and is read with
  // the anon key, so the public feed must not read it.
  it('reads the view, never the snapshot table', async () => {
    await listPublished()
    await getPublishedBySlug('nun-of-it')
    expect(recorded.map((r) => r.table)).toEqual(['public_posts', 'public_posts'])
  })

  // PUB-04. Until 21 Sep an error here became `[]`, the index rendered "No
  // writings published yet", and a Supabase blip, a rotated anon key and an
  // unmigrated view all read to a visitor as: Nora has published nothing.
  it('tells an empty shelf apart from a store it could not ask', async () => {
    response = { data: [], error: null }
    expect(await listPublished()).toEqual({ ok: true, data: [] })

    response = { data: null, error: { message: 'down' } }
    expect(await listPublished()).toEqual({ ok: false })
  })

  // The sharper half: a failed lookup used to return null, and the route turns
  // null into a 404 — so a live piece read as deleted, to a reader and to every
  // crawler holding the URL.
  it('does not report a piece as missing when the lookup failed', async () => {
    response = { data: null, error: null }
    expect(await getPublishedBySlug('never-written')).toEqual({ ok: true, data: null })

    response = { data: null, error: { message: 'down' } }
    expect(await getPublishedBySlug('nun-of-it')).toEqual({ ok: false })
  })
})
