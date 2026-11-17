import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'

// novellanora.com — the public face for Nora's published writings.
// Renders server-side on every request from `public_posts`, a view over the
// studio's snapshot table — src/lib/supabase.ts says why the view and not the
// table. No edge caching: a personal writing site doesn't get enough traffic
// to justify the cache-invalidation complexity, and "publish edits show up
// immediately" is worth the latency.
//
// The latency, measured (OPS-04, 17 Nov 2026): every response carries a
// `Server-Timing` header, and `db` there is the Supabase read alone, timed in
// the function (src/lib/timing.ts). Fifteen warm requests per route against
// production, function in iad1, median (min–max):
//   /                 377 ms (218–907)
//   /writings/[slug]  222 ms (152–430)
//   /rss.xml          351 ms (169–536)
// Rendering around the read costs 1–3 ms, so the read is the whole of it. The
// "~100ms per page" that stood here was never measured and was wrong by three
// to four times. Of that read, PostgREST and Postgres themselves account for
// 10–50 ms (`x-envoy-upstream-service-time`); the rest is the path between the
// function and the database's region. So the price is real, but it is where
// the function runs rather than the lack of a cache, and the trade stands.
// Re-measure with `curl -sI https://www.novellanora.com/ | grep -i server-timing`.

// `vercel pull` cannot read back an environment variable marked Sensitive in
// the Vercel project: it returns the literal string "[SENSITIVE]" instead. Astro
// then rejects it with "site: Invalid url", which names neither the variable nor
// the setting that caused it — noracasey.com lost a deploy to exactly this. So
// say it here, where the fix is one sentence away.
const configured = process.env.SITE_URL

if (configured !== undefined && configured !== '' && !URL.canParse(configured)) {
  throw new Error(
    configured === '[SENSITIVE]'
      ? 'SITE_URL pulled down as "[SENSITIVE]", which is what Vercel returns for a ' +
          'variable marked Sensitive. Mark SITE_URL non-sensitive in the Vercel project: ' +
          "it is the site's public address, so marking it sensitive protects nothing and " +
          'breaks the build.'
      : `SITE_URL is not a URL: ${JSON.stringify(configured)}. Set it to the canonical ` +
          'origin, or leave it unset to use the default.',
  )
}

const siteUrl = configured || 'https://www.novellanora.com'

export default defineConfig({
  output: 'server',
  site: siteUrl,
  adapter: vercel(),
  vite: {
    // Give rolldown this one tsconfig instead of letting it search for one per
    // file. Its search, for the prerender entry (a bare specifier resolved as if
    // imported from <root>/index.html), reads this tsconfig.json and then
    // carries on into the directory above. In a worktree under
    // .claude/worktrees/ that is the main checkout, which has no node_modules,
    // so its `extends: astro/tsconfigs/strict` fails the build with "Tsconfig
    // not found". Traced with RD_LOG=oxc_resolver=trace (oxc_resolver 11.24.3),
    // 16 Oct 2026: NOVA-2.
    tsconfig: './tsconfig.json',
    plugins: [tailwindcss()],
    // Keep the analytics client a file instead of inlining it into every page.
    // Astro inlines a chunk this small by default, and every page here is sent
    // `no-store` — so an inlined copy is re-sent in full on every page view,
    // where a file under /_astro/ has a content-hashed name and is sent once.
    // Measured 21 Sep 2026 on /about, through the built function: 7,595 bytes
    // inlined against 4,847 external, with the CSS bundle byte-identical either
    // way.
    //
    // Until 17 Nov it was not free to re-check: Vercel served /_astro/ with
    // `public, max-age=0, must-revalidate`, so a browser revalidated on every
    // navigation and got a 304 with no body (measured 22 Sep). The hashed
    // names are `immutable` now (OPS-12), from a `headers` rule in
    // vercel.json, which compiles ahead of Vercel's filesystem step. The
    // adapter writes the same header into config.json, but after that step,
    // which answers a static file first, so its rule never applies.
    //
    // Nothing in src/ imports an image today, so this costs nothing else; if
    // something ever does it arrives as a file rather than a data URI, which on
    // a no-store page is the better half of the same trade.
    build: { assetsInlineLimit: 0 },
  },
})
