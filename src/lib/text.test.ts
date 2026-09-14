import { describe, expect, it } from 'vitest'
import { excerpt } from './text'

describe('excerpt', () => {
  it('leaves a short piece alone, with no ellipsis', () => {
    expect(excerpt('A short line.')).toBe('A short line.')
  })

  it('collapses the whitespace a published piece carries', () => {
    expect(excerpt('One\n\n  two\tthree ')).toBe('One two three')
  })

  it('cuts back to a word boundary rather than mid-word', () => {
    const text = 'alpha bravo charlie delta'
    // 14 lands inside "charlie", so the summary must stop after "bravo".
    expect(excerpt(text, 14)).toBe('alpha bravo…')
  })

  it('never returns more than max plus the ellipsis', () => {
    const text = 'word '.repeat(200)
    expect(excerpt(text).length).toBeLessThanOrEqual(181)
  })
})
