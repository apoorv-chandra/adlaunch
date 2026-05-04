// ─────────────────────
// AdLaunch API -- Hono on Node
// ─────────────────────

import { serve } from '@honojs/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

import { authMiddleware } from './middleware/auth'
import { rateLimitMiddleware } from './middleware/ratelimit'
import { tenantMiddleware } from './middleware/tenant'
import { analyticsRouter} from './routes/analytics'
import { usersRouter } from './routes/users'

const app = new Hono()

// ------------------------------------------------------------------
// Global middleware
// ------------------------------------------------------------------
app.use('*', logger())
app.use('*', prettyJSON())
app.use(
  '*',
  cors({
    origin: [process.env.WEB_URL ?? 'http://localhost:3000'],
    allowHeaders: ['Authorization', 'Content-Type', 'X-Tenant-ID'],
    credentials: true,
  })
)

// ------------------------------------------------------------------
// Health
// ------------------------------------------------------------------
app.get('/healthz', (c) => c.json({ status: 'ok', ts: Date.now() }))

// ------------------------------------------------------------------
// Authenticated routes
// ------------------------------------------------------------------
const api = new Hono()
api.use('*', authMiddleware)
api.use('*', rateLimitMiddleware)
api.use('*', tenantMiddleware)

api.route('/users', usersRouter)
api.route('/analytics', analyticsRouter)

app.route('/api/v1', api)

// ------------------------------------------------------------------
// Start
// ------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 8787
console.log(`🚀 AdLaunch API listening on http://localhost:${PORT}`)

export default serve({ fetch: app.fetch, port: PORT })
