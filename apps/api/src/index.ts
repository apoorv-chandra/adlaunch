// ─────────────────────────────────────────────────────────────────────────────
// AdLaunch API — Hono.js on Cloudflare Workers
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { authMiddleware } from './middleware/auth'
import { tenantMiddleware } from './middleware/tenant'
import { rateLimitMiddleware } from './middleware/ratelimit'
import { campaignsRouter } from './routes/campaigns'
import { usersRouter } from './routes/users'
import { analyticsRouter } from './routes/analytics'
import type { WorkerEnv } from '@adlaunch/types'

const app = new Hono<{ Bindings: WorkerEnv }>()

// Global middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: ['https://app.adlaunch.io', 'http://localhost:3000'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-org-id'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// Health check
app.get('/', (c) => c.json({
  ok: true,
  message: 'AdLaunch API v1',
  timestamp: new Date().toISOString(),
}))

app.get('/health', (c) => c.json({ status: 'ok' }))

// API v1 routes
const v1 = app.basePath('/v1')

v1.use('*', authMiddleware)
v1.use('*', tenantMiddleware)
v1.use('*', rateLimitMiddleware)

v1.route('/campaigns', campaignsRouter)
v1.route('/users', usersRouter)
v1.route('/analytics', analyticsRouter)

// 304 handler
app.notFound((c) => c.json({ error: 'Not Found', code: 'NOT_FOUND', status: 404 }, 404))
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal Server Error', code: 'INTERNAL_ERROR', status: 500 }, 500)
})

export default app
