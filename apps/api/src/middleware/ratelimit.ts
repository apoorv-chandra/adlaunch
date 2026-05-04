import { createMiddleware } from 'hono'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1m'),
  analytics: true,
  prefix: 'adlaunch/ratelimit',
})

export const rateLimitMiddleware = createMiddleware(async (c, next) => {
  const userId = c.get('userId') as string
  const { success, reset } = await ratelimit.limit(userId)
  if (!success) {
    return c.json(
      { error: 'Too many requests', resetAt: new Date(reset).toISOString() },
      429
    )
  }
  await next()
})
