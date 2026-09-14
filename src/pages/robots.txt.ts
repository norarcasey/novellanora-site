import type { APIRoute } from 'astro'
import { absoluteUrl } from '@/lib/site'

// An endpoint rather than a file in public/, so the sitemap it names is built
// from the same origin as every other absolute URL here and cannot drift from
// it — a robots.txt pointing at the apex would send crawlers through a redirect
// to find the sitemap.
export const GET: APIRoute = ({ site }) =>
  new Response(
    `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow:

Sitemap: ${absoluteUrl('/sitemap.xml', site)}
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
