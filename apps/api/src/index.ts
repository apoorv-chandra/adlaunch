// ─────────────────────────────────────────────────────────────────────────────
// AdLaunch API — Hono.js on Cloudflare Workers
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'
import type { WorkerEnv } from '@adlaunch/types'

import campaignsRouter from './routes/campaigns'
import usersRouter from './routes/users'
import analyticsRouter from './routes/analytics'
import metaRouter from './routes/meta'
import adSetsRouter from './routes/ad-sets'
import adsRouter from './routes/ads'

const app = new Hono<{ Bindings: WorkerEnv }>()

// ── Global Middleware ─────────────────────────────────────────────────────────

app.use('*', timing())
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', secureHeaders())

app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = [
        'https://app.adlaunch.io',
        'https://staging.adlaunch.io',
        'http://localhost:3000',
      ]
      return allowed.includes(origin ?? '') ? origin : 'https://app.adlaunch.io'
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 86400,
  })
)

// ── Health Check ──────────────────────────────────────────────────────────────

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '0.2.0',
    timestamp: new Date().toISOString(),
    region: (c.req.raw as Request & { cf?: { colo?: string } }).cf?.colo ?? 'unknown',
  })
})

// ── API Routes v1 ─────────────────────────────────────────────────────────────

app.route('/api/v1/users', usersRouter)
app.route('/api/v1/campaigns', campaignsRouter)
app.route('/api/v1/analytics', analyticsRouter)
app.route('/api/v1/meta', metaRouter)
app.route('/api/v1/ad-sets', adSetsRouter)
app.route('/api/v1/ads', adsRouter)

// ── 404 Handler ───────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json(
    { error: 'Not found', code: 'NOT_FOUND', status: 404, path: c.req.path },
    404
  )
})

// ── Error Handler ─────────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error(`[API Error] ${err.message}`, err.stack)
  return c.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR', status: 500 },
    500
  )
})

export default app
