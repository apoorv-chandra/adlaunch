// ─────────────────────────────────────────────────────────────────────────────
// Meta OAuth & Account Management Routes
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { createDb, tenants } from '../db'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenant'
import {
  generateMetaAuthUrl,
  exchangeCodeForToken,
  getLongLivedToken,
  getMetaAdAccounts,
  getMetaUserProfile,
  verifyMetaToken,
  type MetaOAuthConfig,
} from '../services/meta-oauth'
import type { WorkerEnv } from '@adlaunch/types'

type Variables = {
  userId: string
  orgId: string
  sessionId: string
  tenantId: string
  tenant: import('../db/schema').DbTenant
  dbUser: import('../db/schema').DbUser
}

const router = new Hono<{ Bindings: WorkerEnv; Variables: Variables }>()

// Helper to build OAuth config from env
function getOAuthConfig(env: WorkerEnv, appUrl: string): MetaOAuthConfig {
  return {
    appId: env.META_APP_ID,
    appSecret: env.META_APP_SECRET,
    redirectUri: `${env.API_URL ?? appUrl}/api/v1/meta/callback`,
  }
}

// ── GET /meta/auth-url — get Meta OAuth URL ───────────────────────────────────

router.get(
  '/auth-url',
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const { tenantId } = c
    const config = getOAuthConfig(c.env, c.env.APP_URL)

    // Use tenantId as state for CSRF protection
    const state = btoa(JSON.stringify({ tenantId, ts: Date.now() }))

    const authUrl = generateMetaAuthUrl(config, state)
    return c.json({ data: { authUrl, state } })
  }
)

// ── GET /meta/callback — handle OAuth redirect from Meta ─────────────────────

router.get('/callback', async (c) => {
  const { code, state, error, error_description } = c.req.query()
  const appUrl = c.env.APP_URL ?? 'https://app.adlaunch.io'

  if (error) {
    return c.redirect(
      `${appUrl}/settings?meta_error=${encodeURIComponent(error_description ?? error)}`
    )
  }

  if (!code || !state) {
    return c.redirect(`${appUrl}/settings?meta_error=missing_params`)
  }

  try {
    // Decode state to get tenantId
    const stateData = JSON.parse(atob(state)) as { tenantId: string; ts: number }
    const { tenantId } = stateData

    // Validate state is recent (5 min)
    if (Date.now() - stateData.ts > 5 * 60 * 1000) {
      return c.redirect(`${appUrl}/settings?meta_error=state_expired`)
    }

    const config = getOAuthConfig(c.env, appUrl)

    // Exchange code for short-lived token
    const shortToken = await exchangeCodeForToken(config, code)

    // Upgrade to long-lived token (60 days)
    const longToken = await getLongLivedToken(config, shortToken.access_token)

    // Calculate expiry
    const expiresAt = longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days fallback

    // Get user profile for verification
    const profile = await getMetaUserProfile(longToken.access_token)

    // Get ad accounts to pre-populate
    const adAccounts = await getMetaAdAccounts(longToken.access_token)

    // Store token in DB
    const db = createDb(c.env.DATABASE_URL)
    await db
      .update(tenants)
      .set({
        metaAccessToken: longToken.access_token,
        metaTokenExpiresAt: expiresAt,
        // If only one ad account, auto-select it
        ...(adAccounts.length === 1
          ? { metaAdAccountId: adAccounts[0]?.id?.replace('act_', '') }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))

    // Invalidate tenant cache
    await c.env.CACHE.delete(`tenant:${tenantId}`)

    return c.redirect(
      `${appUrl}/settings?meta_connected=1&accounts=${adAccounts.length}&profile=${encodeURIComponent(profile.name)}`
    )
  } catch (err) {
    console.error('Meta OAuth callback error:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return c.redirect(
      `${appUrl}/settings?meta_error=${encodeURIComponent(msg)}`
    )
  }
})

// ── GET /meta/status — check Meta connection status ───────────────────────────

router.get(
  '/status',
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const { tenant } = c

    if (!tenant.metaAccessToken) {
      return c.json({
        data: {
          connected: false,
          adAccountId: null,
          adAccounts: [],
          tokenExpiresAt: null,
        },
      })
    }

    // Verify token is still valid
    const config = getOAuthConfig(c.env, c.env.APP_URL)
    const tokenInfo = await verifyMetaToken(config, tenant.metaAccessToken)

    if (!tokenInfo.valid) {
      // Clear invalid token
      const db = createDb(c.env.DATABASE_URL)
      await db
        .update(tenants)
        .set({ metaAccessToken: null, metaTokenExpiresAt: null, updatedAt: new Date() })
        .where(eq(tenants.id, tenant.id))
      await c.env.CACHE.delete(`tenant:${c.get('tenantId')}`)

      return c.json({
        data: {
          connected: false,
          reason: 'token_expired',
          adAccountId: null,
          adAccounts: [],
          tokenExpiresAt: null,
        },
      })
    }

    // Fetch fresh ad accounts
    let adAccounts: Awaited<ReturnType<typeof getMetaAdAccounts>> = []
    try {
      adAccounts = await getMetaAdAccounts(tenant.metaAccessToken)
    } catch {
      // Token may be degraded — return connected but with warning
    }

    return c.json({
      data: {
        connected: true,
        adAccountId: tenant.metaAdAccountId,
        adAccounts,
        tokenExpiresAt: tenant.metaTokenExpiresAt,
        tokenValid: tokenInfo.valid,
      },
    })
  }
)

// ── POST /meta/select-account — choose which ad account to use ────────────────

router.post(
  '/select-account',
  authMiddleware,
  tenantMiddleware,
  zValidator('json', z.object({ adAccountId: z.string().min(1) })),
  async (c) => {
    const { tenantId, tenant } = c
    const { adAccountId } = c.req.valid('json')

    if (!tenant.metaAccessToken) {
      return c.json(
        { error: 'Meta not connected', code: 'META_NOT_CONNECTED', status: 400 },
        400
      )
    }

    // Verify the account ID belongs to this user
    const accounts = await getMetaAdAccounts(tenant.metaAccessToken)
    const normalizedId = adAccountId.replace('act_', '')
    const valid = accounts.some((a) => a.id.replace('act_', '') === normalizedId)

    if (!valid) {
      return c.json(
        { error: 'Ad account not found or not accessible', code: 'ACCOUNT_NOT_FOUND', status: 404 },
        404
      )
    }

    const db = createDb(c.env.DATABASE_URL)
    await db
      .update(tenants)
      .set({ metaAdAccountId: normalizedId, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))

    await c.env.CACHE.delete(`tenant:${tenantId}`)

    return c.json({ data: { adAccountId: normalizedId, message: 'Ad account selected' } })
  }
)

// ── DELETE /meta/disconnect — remove Meta connection ─────────────────────────

router.delete(
  '/disconnect',
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const { tenantId } = c
    const db = createDb(c.env.DATABASE_URL)

    await db
      .update(tenants)
      .set({
        metaAccessToken: null,
        metaTokenExpiresAt: null,
        metaAdAccountId: null,
        metaBusinessId: null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))

    await c.env.CACHE.delete(`tenant:${tenantId}`)

    return c.json({ data: { disconnected: true } })
  }
)

// ── GET /meta/accounts — list user's ad accounts ──────────────────────────────

router.get(
  '/accounts',
  authMiddleware,
  tenantMiddleware,
  async (c) => {
    const { tenant } = c

    if (!tenant.metaAccessToken) {
      return c.json(
        { error: 'Meta not connected', code: 'META_NOT_CONNECTED', status: 400 },
        400
      )
    }

    const accounts = await getMetaAdAccounts(tenant.metaAccessToken)
    return c.json({ data: accounts })
  }
)

export default router
