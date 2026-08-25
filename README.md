# novellanora-site

The public face of novellanora.com. Renders writing published from
[Noratives](../noratives), the private studio.

## How it works

Publishing in the studio writes a snapshot row. This site reads those rows and
renders a page. That is the entire mechanism — there is no build step tied to
publishing, no cache to clear, and nothing the studio has to tell this site.

```
┌─────────────┐   publish    ┌──────────┐   read on    ┌─────────────────┐
│  Noratives  │ ───────────► │ Supabase │ ◄─────────── │ novellanora.com │
│   studio    │  writes a    │          │  every       │  (this site)    │
└─────────────┘  snapshot    └──────────┘  request     └─────────────────┘
```

A published edit is live for the next person who loads the page. The cost is a
Supabase round trip per view, which is the trade recorded in `astro.config.mjs`:
a personal writing site does not get the traffic to justify cache invalidation,
and edits appearing immediately is worth the latency.

This used to work differently. The pages were cached with Vercel ISR and the
studio POSTed to an `/api/revalidate` endpoint here to purge them. The caching
was removed; the endpoint was not, and went on purging a cache that no longer
existed until it was removed too. If ISR is ever turned back on, the
notification path has to come back **with** it — see `docs/webhooks.md` in the
studio repo, which describes the signed version to build rather than the shared
secret this once used.

### What it reads

`public_posts`, a view over the snapshot table carrying only what a page
renders. The table itself is not readable by this site's anonymous key: it holds
the `user_id` of whoever wrote each piece, and a public feed should not double as
a list of who uses the studio.

Snapshots are shared with noracasey.com and distinguished by `site`, so every
query filters on it. Without the filter, technical posts would render here, and a
slug used on both sites would match two rows.

## Local development

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the Supabase dashboard

npm install
npm run dev
# open http://localhost:4321
```

## Environment variables

Set in Vercel under Settings → Environment Variables, for Production and Preview:

| Variable                 | What it is                                       |
| ------------------------ | ------------------------------------------------ |
| `VITE_SUPABASE_URL`      | the shared Supabase project                      |
| `VITE_SUPABASE_ANON_KEY` | the anonymous key; RLS is what limits it         |
| `SITE_URL`               | `https://www.novellanora.com`, for absolute URLs |

Nothing here is a shared secret with the studio, because nothing is sent between
them.

## Domains

`www.novellanora.com` is canonical. The apex redirects to it — the opposite
direction from noracasey.com, which redirects `www` to the apex. Both are fine;
they just have to stay as they are, because links already exist to each.

## Routes

- `/` — published writing, newest first
- `/writings/[slug]` — one piece
- `/about` — bio (edit `src/pages/about.astro`)
