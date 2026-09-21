import { escapeXml } from './site'

// Built here rather than in the endpoint so the escaping and the date format can
// be tested without starting a server or reaching Supabase.

export interface FeedItem {
  title: string
  link: string
  /** ISO timestamp. */
  published: string
  /** Plain text, already trimmed to a summary length. */
  summary: string
  /** The piece as published HTML. */
  html: string
}

export interface FeedOptions {
  title: string
  description: string
  /** Absolute URL of the site the feed is for. */
  home: string
  /** Absolute URL of the feed itself, for the atom:link self reference. */
  self: string
  items: FeedItem[]
}

export function buildFeed(options: FeedOptions): string {
  const { title, description, home, self, items } = options

  // RFC 822, which is what RSS dates are, unlike everywhere else on this site.
  const rfc822 = (iso: string): string => new Date(iso).toUTCString()

  const entries = items
    .map(
      (item) => `  <item>
    <title>${escapeXml(item.title)}</title>
    <link>${escapeXml(item.link)}</link>
    <guid isPermaLink="true">${escapeXml(item.link)}</guid>
    <pubDate>${rfc822(item.published)}</pubDate>
    <description>${escapeXml(item.summary)}</description>
    <content:encoded><![CDATA[${closeCdata(item.html)}]]></content:encoded>
  </item>`,
    )
    .join('\n')

  const updated =
    items.length > 0 ? `\n    <lastBuildDate>${rfc822(items[0].published)}</lastBuildDate>` : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(home)}</link>
    <description>${escapeXml(description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml" />${updated}
${entries}
  </channel>
</rss>
`
}

/** The one sequence that can end a CDATA section early. A piece quoting `]]>`
 *  would otherwise break the feed for every reader at once, and the published
 *  HTML is written by a person, so it is not impossible — only unlikely. */
function closeCdata(html: string): string {
  return html.replace(/]]>/g, ']]]]><![CDATA[>')
}
