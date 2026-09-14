import { escapeXml } from './site'

// Built here rather than in the endpoint so the escaping and the URL shapes can
// be tested without starting a server or reaching Supabase.

export interface SitemapEntry {
  /** Absolute URL. It must be one the site actually serves. */
  loc: string
  /** ISO timestamp. Emitted as a date, which is all a sitemap needs. */
  lastmod?: string
}

export function buildSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastmod =
        entry.lastmod === undefined
          ? ''
          : `\n    <lastmod>${escapeXml(entry.lastmod.slice(0, 10))}</lastmod>`
      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}
