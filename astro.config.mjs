import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'

// novellanora.com — the public face for Nora's published writings.
// Renders server-side from the Supabase `published_entries` table on
// every request. No edge caching: a personal writing site doesn't get
// enough traffic to justify the cache-invalidation complexity, and the
// "publish edits show up immediately" UX is worth the ~100ms per page.

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
  },
})
