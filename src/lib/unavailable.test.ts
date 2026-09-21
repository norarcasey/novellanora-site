import { describe, expect, it } from 'vitest'
import {
  RETRY_AFTER_SECONDS,
  UNAVAILABLE_MESSAGE,
  markUnavailable,
  unavailableResponse,
} from './unavailable'

describe('what a route answers when it cannot reach the store', () => {
  it('is a 503 carrying a sentence, not an empty 200', async () => {
    const res = unavailableResponse()
    expect(res.status).toBe(503)
    expect(await res.text()).toContain(UNAVAILABLE_MESSAGE)
  })

  // The two headers are the difference between "ask again" and "this is the
  // site now": one for the client, one so nothing keeps the outage.
  it('asks the client back rather than letting the outage be cached', () => {
    const headers = unavailableResponse().headers
    expect(headers.get('Retry-After')).toBe(String(RETRY_AFTER_SECONDS))
    expect(headers.get('Cache-Control')).toContain('no-store')
  })

  it('says the same on a page, which renders instead of returning a body', () => {
    const response = { status: 200, statusText: 'OK', headers: new Headers() }
    markUnavailable(response)
    expect(response.status).toBe(503)
    expect(response.statusText).toBe('Service Unavailable')
    expect(response.headers.get('Retry-After')).toBe(String(RETRY_AFTER_SECONDS))
  })

  // A reader gets no console. Whatever else the sentence says, it has to say
  // that this is our fault and that the piece is still there.
  it('tells the reader nothing is gone', () => {
    expect(UNAVAILABLE_MESSAGE).toMatch(/nothing has been deleted/i)
  })
})
