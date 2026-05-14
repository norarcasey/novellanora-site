import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'

// novellanora.com — the public face for Nora's published writings.
// Renders server-side from the Supabase `published_entries` table.
// Vercel ISR caches pages at the edge; the /api/revalidate endpoint
// (called by the studio when a writing is published/unpublished)
// purges them on demand.

export default defineConfig({
  output: 'server',
  site: process.env.SITE_URL || 'https://novellanora.com',
  adapter: vercel({
    isr: {
      // Fallback expiration in case revalidation webhooks fail.
      // 24 hours: any drift between studio and live is bounded.
      expiration: 60 * 60 * 24,
      // Used by /api/revalidate to refresh a route.
      bypassToken: process.env.REVALIDATE_BYPASS_TOKEN,
      // Don't cache the API endpoint itself.
      exclude: ['/api/revalidate'],
    },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
})
