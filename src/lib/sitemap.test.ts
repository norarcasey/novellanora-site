import { describe, expect, it } from 'vitest'
import { buildSitemap } from './sitemap'

describe('buildSitemap', () => {
  it('lists every URL it is given', () => {
    const xml = buildSitemap([
      { loc: 'https://www.novellanora.com/' },
      { loc: 'https://www.novellanora.com/writings/nun-of-it', lastmod: '2026-08-19T16:44:41.000Z' },
    ])
    expect(xml).toContain('<loc>https://www.novellanora.com/</loc>')
    expect(xml).toContain('<loc>https://www.novellanora.com/writings/nun-of-it</loc>')
    expect((xml.match(/<url>/g) ?? []).length).toBe(2)
  })

  it('emits lastmod as a date, and omits it when there is none', () => {
    const xml = buildSitemap([
      { loc: 'https://e.com/a', lastmod: '2026-08-19T16:44:41.000Z' },
      { loc: 'https://e.com/b' },
    ])
    expect(xml).toContain('<lastmod>2026-08-19</lastmod>')
    expect((xml.match(/<lastmod>/g) ?? []).length).toBe(1)
  })

  it('escapes a slug that carries an ampersand', () => {
    const xml = buildSitemap([{ loc: 'https://e.com/writings/this-&-that' }])
    expect(xml).toContain('this-&amp;-that')
    expect(xml).not.toContain('this-&-that')
  })
})
