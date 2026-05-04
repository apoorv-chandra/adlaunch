import { createMiddleware } from 'hono'
import { clerkMiddleware, getAuth } from '@clerk/backend'

export const authMiddleware = createMiddleware(async (c, next) => {
  const auth = getAuth(c.req.raw)
  if (!auth.userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  c.set('userId', auth.userId)
  c.set('orgId', auth.orgId ?? null)
  await next()
})
