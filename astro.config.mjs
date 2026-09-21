import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'

// novellanora.com — the public face for Nora's published writings.
// Renders server-side on every request from `public_posts`, a view over the
// studio's snapshot table — src/lib/supabase.ts says why the view and not the
// table. No edge caching: a personal writing site doesn't get enough traffic
// to justify the cache-invalidation complexity, and "publish edits show up
// immediately" is worth the latency. How MUCH latency is not known: the
// figure that stood here was never measured against production, so it is
// absent rather than approximated. Measuring it is OPS-04.

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
    plugins: [tailwindcss()],
    // Keep the analytics client a file instead of inlining it into every page.
    // Astro inlines a chunk this small by default, and every page here is sent
    // `no-store` — so an inlined copy is re-sent on every page view and cached
    // never, while a file on the static layer is fetched once. Measured 21 Sep
    // 2026 on /about, through the built function: 7,595 bytes inlined against
    // 4,847 external, with the CSS bundle byte-identical either way. Nothing in src/ imports an image today,
    // so this costs nothing else; if something ever does, it arrives as a file
    // rather than a data URI, which on a no-store page is the better half of
    // the same trade.
    build: { assetsInlineLimit: 0 },
  },
})
