# novellanora-site

Public-facing Astro site for novellanora.com. Renders writings that have
been published from [Inkwell](../journal-app) (the private studio).

Reads from the `published_entries` table in the shared Supabase project
via the anonymous key — RLS guarantees nothing else is visible.

## Architecture

- **Studio** (`journal-app`) is where writings are drafted and published.
  Clicking "Publish" upserts a snapshot row into `published_entries`.
- **This site** server-renders those snapshots, cached at the edge via
  Vercel ISR. The studio's publish action POSTs to `/api/revalidate`
  here, which refreshes the affected routes on demand.

```
┌─────────────┐  publish/   ┌──────────┐  fetch    ┌─────────────────┐
│   Inkwell   │  unpublish  │ Supabase │ ←──────── │ novellanora.com │
│   studio    │ ──────────► │          │           │  (this site)    │
└─────────────┘             └──────────┘           └─────────────────┘
       │                                                    ▲
       │            POST /api/revalidate                    │
       └────────────────────────────────────────────────────┘
                    (refreshes affected pages)
```

## Local development

```bash
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_ANON_KEY from the Supabase dashboard
# generate a long random REVALIDATE_SECRET
# REVALIDATE_BYPASS_TOKEN can be anything for local dev (ISR doesn't run locally)

npm install
npm run dev
# open http://localhost:4321
```

## Deploying to Vercel

1. **Push this repo to GitHub** (separate from the journal-app repo).
2. **Vercel dashboard → Add New Project → Import** from GitHub.
3. **Framework preset**: Astro (auto-detected).
4. **Environment variables**: add these in Settings → Environment Variables:
   - `SUPABASE_URL` — same as the journal-app studio
   - `SUPABASE_ANON_KEY` — same as the journal-app studio
   - `REVALIDATE_SECRET` — generate with `openssl rand -hex 32`. Set the
     same value in the journal-app's `.env` as `VITE_REVALIDATE_SECRET`.
   - `REVALIDATE_BYPASS_TOKEN` — generate with `openssl rand -hex 32`.
     This one is internal to Vercel; the studio doesn't need it.
   - `SITE_URL` — `https://novellanora.com`
5. **Deploy**. The first deploy will give you a `*.vercel.app` URL.

## Pointing novellanora.com at Vercel

1. **Vercel project → Settings → Domains → Add**: `novellanora.com` and
   `www.novellanora.com`.
2. Vercel will show DNS records to add. Where you registered the domain
   (Cloudflare / Namecheap / Google Domains / etc), add:
   - **Apex** (`novellanora.com`): A record → `76.76.21.21`
   - **www** (`www.novellanora.com`): CNAME → `cname.vercel-dns.com`
3. Vercel auto-issues a Let's Encrypt cert once DNS propagates (usually
   <5 min, can take up to an hour).

## Wiring the studio's publish button to this site

In the journal-app `.env`:

```
VITE_REVALIDATE_URL=https://novellanora.com/api/revalidate
VITE_REVALIDATE_SECRET=<the same REVALIDATE_SECRET as Vercel>
VITE_PUBLIC_SITE_URL=https://novellanora.com
```

`VITE_PUBLIC_SITE_URL` is used by the studio to show a "View live" link
in the publish panel. The other two power the on-demand revalidation.

## How revalidation works

1. Studio user clicks Publish (or Re-publish / Unpublish).
2. Studio POSTs to `https://novellanora.com/api/revalidate` with
   `{ slug, action, secret }`.
3. This site validates the secret, then fetches each affected route with
   `?_vercel_revalidate=<token>` appended. That tells Vercel to bypass
   the cached version and re-render from Supabase, then store the fresh
   page in the cache.
4. The next visitor to `/` or `/writings/<slug>` gets the new content.

If the webhook fails (e.g. Vercel is down), the studio publish still
succeeds — the public site will catch up within 24 hours via the ISR
fallback expiration, or instantly on the next revalidation call.

## Routes

- `/` — list of published writings, newest first
- `/writings/[slug]` — single writing
- `/about` — bio (edit `src/pages/about.astro`)
- `/api/revalidate` — webhook target for the studio (POST only)
