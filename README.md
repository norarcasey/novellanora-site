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

## Formatting and lint

```bash
npm run format        # Prettier, in place
npm run format:check  # what the gate runs
npm run lint          # ESLint
```

Prettier owns formatting and ESLint owns everything else: `eslint-config-prettier`
is last in `eslint.config.js` and switches off every stylistic rule, so the two
cannot disagree about a file. Settings match the other repos here — no semicolons,
single quotes, trailing commas, 100 columns.

The ruleset is deliberately smaller than the app repos': the recommended sets plus
the two house rules about assertions (`x as Foo` and `x!` are both errors — use an
annotation or a real runtime check). `eslint-plugin-astro` is what makes the
templates lintable at all; without it the frontmatter blocks, where most of this
site's logic lives, would be unchecked.

Two exceptions are written down rather than silent: `.d.ts` files may use
triple-slash references, because an `import` would make `src/env.d.ts` a module and
its `ImportMetaEnv` would stop augmenting anything; and the gtag snippet in
`Base.astro` keeps `arguments`, because gtag reads the Arguments object it is
handed and rest parameters would push an Array it ignores.

One thing to know about the Astro formatter: it moves whitespace across element
boundaries, so `<a>Writings</a>` becomes an `<a>` with the text on its own line.
`htmlWhitespaceSensitivity` has no effect — `prettier-plugin-astro` ignores it. On
14 Sep 2026 this changed nothing a reader sees, checked by rendering every page
against production and by screenshotting the header, but it is the thing to look at
first if a run of Prettier ever seems to have moved something on the page.

Since Astro 7 that interacts with the build, and the interaction has one sharp
edge worth knowing before you write a paragraph. The build compresses HTML with
JSX whitespace rules (`compressHTML`, which defaults to `'jsx'`): whitespace
_within_ a line is kept, and a line break between a run of text and an inline
element beside it is **dropped**. So this

```astro
<p>
  Reach me at
  <a href="mailto:hello@novellanora.com">hello@novellanora.com</a>.
</p>
```

is served as `Reach me athello@novellanora.com.` — the space is gone. Written on
one line, or with an explicit `{' '}`, it survives.

Prettier protects a break it _creates_: wrap a long sentence containing a link
and it inserts `{' '}` for you. It does not protect a break it _inherits_ — the
shape above passes `format:check` untouched. So the rule is about how you type
the line in the first place: keep a word and the inline element next to it on the
same line. This is only a hazard in prose. Everywhere else on this site the
elements sit in `flex` containers, where a whitespace-only text node between two
items is dropped by layout anyway.

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

## Dependencies

Node 22.12 or newer — Astro 7 requires it, CI pins Node 22 in
`.github/actions/setup`, and the Vercel function runs `nodejs22.x`.

`npm audit` is expected to report **zero** advisories. It is worth keeping it
there rather than at "fifteen, none of which matter today", because the fifteen
are what hide the sixteenth.

One of those zero is bought with an `overrides` entry in `package.json`:

```json
"overrides": { "path-to-regexp": "6.3.0" }
```

`@vercel/routing-utils` pins `path-to-regexp@6.1.0`, which carries a ReDoS
advisory, and ships the patched 6.3.0 alongside it under the alias
`path-to-regexp-updated`. There is no adapter release that drops the old one —
`npm audit fix --force` "fixes" it by _downgrading_ `@astrojs/vercel` three major
versions — so the override points the pin at the version Vercel already vendors.
It was checked rather than assumed: with and without it, `.vercel/output/config.json`
(the route table Vercel is handed) is byte-identical. Drop the override once an
adapter release makes `npm audit` clean without it.

## How it deploys

`main` deploys through GitHub Actions and nowhere else. The `gate` job runs the
same `npm run gate` a laptop runs — formatting, lint, typecheck, unit tests,
build, in that order — and the deploy job `needs` it, so a red gate means nothing
ships.

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

## Images

Nothing in `public/` is hand-drawn. Every raster file there is generated from an
SVG and committed:

| Output                        | Source                        |
| ----------------------------- | ----------------------------- |
| `public/og.png`               | `assets/og-card.svg`          |
| `public/apple-touch-icon.png` | `assets/apple-touch-icon.svg` |
| `public/favicon.ico`          | `public/favicon.svg`          |

```bash
npm run images   # rewrites all three, then commit what moved
```

The rasteriser is a devDependency and ships nowhere; the images are committed
rather than built, because they change about once a year and the alternative is
carrying a rasteriser into the deployed function. The catch is that nothing
notices if an SVG is edited and this is not re-run, so **re-run it in the same
commit**. `src/lib/og.test.ts` checks what bytes can prove — that the files
exist, and that they are the format and the size the pages advertise.

The card is one image for the whole site, not one per piece. A piece still
unfurls as itself: `og:title` and `og:description` carry its title and its
opening. See `src/lib/og.ts` for why per-piece cards were not built.

## Routes

- `/` — published writing, newest first
- `/writings/[slug]` — one piece
- `/about` — bio (edit `src/pages/about.astro`)
