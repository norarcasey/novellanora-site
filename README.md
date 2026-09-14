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

| Variable                 | What it is                               |
| ------------------------ | ---------------------------------------- |
| `VITE_SUPABASE_URL`      | the shared Supabase project              |
| `VITE_SUPABASE_ANON_KEY` | the anonymous key; RLS is what limits it |

Both must stay **non-sensitive**. A variable marked Sensitive in Vercel cannot be
read back, so `vercel pull` returns the literal string `[SENSITIVE]` and the
deploy builds with that as the value. Marking them sensitive would also protect
nothing: the anon key is compiled into the bundle and served to every visitor,
which is what the `VITE_` prefix means. This team's Vercel settings default new
variables to Sensitive, so add them with `vercel env add … --no-sensitive`.

There is no `SITE_URL`. The canonical origin is `https://www.novellanora.com` in
`astro.config.mjs`; setting the variable overrides it, and it was removed because
one more place for the origin to be wrong bought nothing.

Nothing here is a shared secret with the studio, because nothing is sent between
them.

## How it deploys

`main` deploys through GitHub Actions and nowhere else. The `gate` job runs the
same `npm run gate` a laptop runs — typecheck, unit tests, build — and the deploy
job `needs` it, so a red gate means nothing ships.

Vercel's own Git integration is switched off for `main` in `vercel.json`, because
until 14 Sep 2026 it was the thing that actually shipped: on the commit that
added CI, `vercel[bot]` had the site live 17 seconds before the gate went green.
Branch previews still deploy from Git; only `main` is reserved for the gate.

If you ever need to deploy by hand, the Actions path is the one to repeat:
`vercel pull --environment=production`, `vercel build --prod`, then
`vercel deploy --prebuilt --prod`.

## Domains

`www.novellanora.com` is canonical. The apex redirects to it — the opposite
direction from noracasey.com, which redirects `www` to the apex. Both are fine;
they just have to stay as they are, because links already exist to each.

## Routes

- `/` — published writing, newest first
- `/writings/[slug]` — one piece
- `/about` — bio (edit `src/pages/about.astro`)
