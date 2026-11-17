import { describe, expect, it } from 'vitest'
import { serverTiming, timeDb, withServerTiming } from './timing'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// OPS-04: the header is how the cost of the no-cache trade is read off
// production, so what it reports has to be the read, and only the read.
describe('Server-Timing', () => {
  it('says the first request on an instance paid the cold start, and later ones did not', async () => {
    const first = await withServerTiming(async () => new Response('ok'))
    const second = await withServerTiming(async () => new Response('ok'))
    expect(first.headers.get('Server-Timing')).toContain('cold;')
    expect(second.headers.get('Server-Timing')).not.toContain('cold')
  })

  it('times every Supabase read inside the request, and the render around them', async () => {
    const response = await withServerTiming(async () => {
      await timeDb(() => sleep(20))
      await timeDb(() => sleep(20))
      return new Response('ok')
    })
    const header = response.headers.get('Server-Timing') ?? ''
    const db = Number(/db;dur=([\d.]+)/.exec(header)?.[1])
    const app = Number(/app;dur=([\d.]+)/.exec(header)?.[1])
    expect(header).toContain('desc="supabase x2"')
    expect(db).toBeGreaterThanOrEqual(35)
    expect(app).toBeGreaterThanOrEqual(db)
  })

  it('keeps concurrent requests apart', async () => {
    const [slow, fast] = await Promise.all([
      withServerTiming(async () => {
        await timeDb(() => sleep(60))
        return new Response('ok')
      }),
      withServerTiming(async () => {
        await timeDb(() => sleep(1))
        return new Response('ok')
      }),
    ])
    expect(slow.headers.get('Server-Timing')).toContain('supabase x1')
    expect(fast.headers.get('Server-Timing')).toContain('supabase x1')
    const fastDb = Number(/db;dur=([\d.]+)/.exec(fast.headers.get('Server-Timing') ?? '')?.[1])
    expect(fastDb).toBeLessThan(50)
  })

  it('leaves out db on a page that read nothing', () => {
    expect(serverTiming({ db: [] }, 3.21, false)).toBe('app;dur=3.2')
  })

  it('still records a read that failed', async () => {
    const response = await withServerTiming(async () => {
      await timeDb(() => Promise.reject(new Error('down'))).catch(() => {})
      return new Response('ok')
    })
    expect(response.headers.get('Server-Timing')).toContain('supabase x1')
  })

  it('sends a response with immutable headers untimed rather than failing it', async () => {
    const response = await withServerTiming(async () =>
      Response.redirect('https://example.com/', 302),
    )
    expect(response.status).toBe(302)
  })

  it('runs a read outside any request without recording it', async () => {
    expect(await timeDb(async () => 7)).toBe(7)
  })
})
