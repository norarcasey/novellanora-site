import { describe, expect, it } from 'vitest'
import { buildFeed } from './feed'

describe('buildFeed', () => {
  const item = {
    title: 'Sorry, Sam',
    link: 'https://www.novellanora.com/writings/sorry-sam',
    published: '2026-08-19T16:44:41.000Z',
    summary: 'A summary.',
    html: '<p>The piece.</p>',
  }
  const options = {
    title: 'Novella Nora',
    description: 'Writings by Nora Casey.',
    home: 'https://www.novellanora.com/',
    self: 'https://www.novellanora.com/rss.xml',
    items: [item],
  }

  it('carries the piece itself, not only a summary', () => {
    const xml = buildFeed(options)
    expect(xml).toContain('<![CDATA[<p>The piece.</p>]]>')
    expect(xml).toContain('<description>A summary.</description>')
  })

  it('points at itself, which is what a reader uses to re-find the feed', () => {
    expect(buildFeed(options)).toContain(
      '<atom:link href="https://www.novellanora.com/rss.xml" rel="self" type="application/rss+xml" />',
    )
  })

  it('dates items in RFC 822, which is what RSS reads', () => {
    expect(buildFeed(options)).toContain('<pubDate>Wed, 19 Aug 2026 16:44:41 GMT</pubDate>')
  })

  it('escapes a title with an ampersand in it', () => {
    const xml = buildFeed({ ...options, items: [{ ...item, title: 'Sam & Sons' }] })
    expect(xml).toContain('<title>Sam &amp; Sons</title>')
  })

  it('survives a piece that quotes the CDATA terminator', () => {
    const xml = buildFeed({
      ...options,
      items: [{ ...item, html: '<p>ends with ]]> inside</p>' }],
    })
    // The body must still be in one readable piece, and no stray terminator
    // may close the section early and truncate the feed for every reader.
    expect(xml).toContain(']]]]><![CDATA[>')
    expect(xml).toContain('<p>ends with ')
  })

  it('says nothing about a build date when there is nothing published', () => {
    const xml = buildFeed({ ...options, items: [] })
    expect(xml).not.toContain('lastBuildDate')
    expect(xml).toContain('<channel>')
  })
})
