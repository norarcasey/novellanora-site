import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'

// novellanora.com — the public face for Nora's published writings.
// Renders server-side from the Supabase `published_entries` table on
// every request. No edge caching: a personal writing site doesn't get
// enough traffic to justify the cache-invalidation complexity, and the
// "publish edits show up immediately" UX is worth the ~100ms per page.

export default defineConfig({
  output: 'server',
  site: process.env.SITE_URL || 'https://novellanora.com',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
})
