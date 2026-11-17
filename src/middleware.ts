import { defineMiddleware } from 'astro:middleware'
import { withServerTiming } from '@/lib/timing'

// Every served response says where its time went (OPS-04): src/lib/timing.ts.
export const onRequest = defineMiddleware((_context, next) => withServerTiming(next))
