// ─────────────────────────────────────────────────────────────────────────────
// Campaigns Routes — CRUD + Meta publish + sync
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { createDb, campaigns, adSets, ads, analyticsEvents } from '../db'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenant'
import {
  createMetaCampaign,
  updateMetaCampaign,
  deleteMetaCampaign,
  syncCampaignStatusFromMeta,
  getCampaignInsights,
  type MetaApiError,
} from '../services/meta-api'
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
router.use('*', authMiddleware, tenantMiddleware)

// ── Schemas ───────────────────────────────────────────────────────────────────

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  objective: z.enum([
    'BRAND_AWARENESS', 'REACH', 'TRAFFIC', 'ENGAGEMENT',
    'LEAD_GENERATION', 'APP_PROMOTION', 'SALES',
  ]),
  dailyBudget: z.number().int().min(100).optional(),
  lifetimeBudget: z.number().int().min(100).optional(),
  currency: z.string().length(3).default('USD'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).max(10).default([]),
})

const updateCampaignSchema = createCampaignSchema.partial().extend({
  status: z.enum(['draft', 'paused', 'archived']).optional(),
})

// ── GET /campaigns ────────────────────────────────────────────────────────────

router.get('/', async (c) => {
  const { tenantId } = c
  const db = createDb(c.env.DATABASE_URL)
  const { page = '1', perPage = '20', status } = c.req.query()

  const pageNum = Math.max(1, parseInt(page, 10))
  const limit = Math.min(100, parseInt(perPage, 10))
  const offset = (pageNum - 1) * limit

  const conditions = [eq(campaigns.tenantId, tenantId)]
  if (status) {
    conditions.push(eq(campaigns.status, status as typeof campaigns.status.enumValues[number]))
  }

  const data = await db
    .select()
    .from(campaigns)
    .where(and(...conditions))
    .orderBy(desc(campaigns.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({ data, meta: { page: pageNum, perPage: limit } })
})

// ── GET /campaigns/:id ────────────────────────────────────────────────────────

router.get('/:id', async (c) => {
  const { tenantId } = c
  const { id } = c.req.param()
  const db = createDb(c.env.DATABASE_URL)

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
    .limit(1)

  if (!campaign) {
    return c.json({ error: 'Campaign not found', code: 'NOT_FOUND', status: 404 }, 404)
  }

  const campaignAdSets = await db
    .select()
    .from(adSets)
    .where(eq(adSets.campaignId, id))

  return c.json({ data: { ...campaign, adSets: campaignAdSets } })
})

// ── POST /campaigns ───────────────────────────────────────────────────────────

router.post('/', zValidator('json', createCampaignSchema), async (c) => {
  const { tenantId } = c
  const body = c.req.valid('json')
  const db = createDb(c.env.DATABASE_URL)

  const [campaign] = await db
    .insert(campaigns)
    .values({
      tenantId,
      createdBy: c.get('dbUser').id,
      name: body.name,
      objective: body.objective,
      dailyBudget: body.dailyBudget,
      lifetimeBudget: body.lifetimeBudget,
      currency: body.currency,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      notes: body.notes,
      tags: body.tags,
      status: 'draft',
    })
    .returning()

  if (!campaign) {
    return c.json({ error: 'Failed to create campaign', code: 'CREATE_FAILED', status: 500 }, 500)
  }

  return c.json({ data: campaign }, 201)
})

// ── PATCH /campaigns/:id ──────────────────────────────────────────────────────

router.patch('/:id', zValidator('json', updateCampaignSchema), async (c) => {
  const { tenantId } = c
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const db = createDb(c.env.DATABASE_URL)

  const [existing] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
    .limit(1)

  if (!existing) {
    return c.json({ error: 'Campaign not found', code: 'NOT_FOUND', status: 404 }, 404)
  }

  const [updated] = await db
    .update(campaigns)
    .set({
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id))
    .returning()

  // Sync update to Meta if campaign is published
  const { tenant } = c
  if (existing.metaCampaignId && tenant.metaAccessToken) {
    try {
      await updateMetaCampaign(existing.metaCampaignId, tenant.metaAccessToken, {
        name: body.name,
        status: body.status,
        dailyBudgetCents: body.dailyBudget,
      })
    } catch (err) {
      console.warn('Failed to sync campaign update to Meta:', err)
    }
  }

  return c.json({ data: updated })
})

// ── POST /campaigns/:id/publish — push campaign to Meta ──────────────────────

router.post('/:id/publish', async (c) => {
  const { tenantId, tenant } = c
  const { id } = c.req.param()
  const db = createDb(c.env.DATABASE_URL)

  // Require Meta connection
  if (!tenant.metaAccessToken || !tenant.metaAdAccountId) {
    return c.json(
      { error: 'Meta Ads account not connected. Go to Settings → Integrations to connect.', code: 'META_NOT_CONNECTED', status: 400 },
      400
    )
  }

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
    .limit(1)

  if (!campaign) {
    return c.json({ error: 'Campaign not found', code: 'NOT_FOUND', status: 404 }, 404)
  }

  if (campaign.status === 'archived') {
    return c.json({ error: 'Cannot publish archived campaign', code: 'INVALID_STATUS', status: 400 }, 400)
  }

  // If already published, just activate it
  if (campaign.metaCampaignId) {
    await updateMetaCampaign(campaign.metaCampaignId, tenant.metaAccessToken, {
      status: 'active',
    })
    const [updated] = await db
      .update(campaigns)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning()
    return c.json({ data: updated })
  }

  try {
    // Create campaign on Meta
    const { id: metaCampaignId } = await createMetaCampaign(
      tenant.metaAdAccountId,
      tenant.metaAccessToken,
      {
        name: campaign.name,
        objective: campaign.objective,
        dailyBudgetCents: campaign.dailyBudget ?? undefined,
        lifetimeBudgetCents: campaign.lifetimeBudget ?? undefined,
        startTime: campaign.startDate ?? undefined,
        endTime: campaign.endDate ?? undefined,
      }
    )

    // Update DB with Meta campaign ID and status
    const [updated] = await db
      .update(campaigns)
      .set({
        metaCampaignId,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id))
      .returning()

    return c.json({ data: updated })
  } catch (err) {
    const metaErr = err as MetaApiError
    return c.json(
      {
        error: `Meta API error: ${metaErr.message}`,
        code: 'META_API_ERROR',
        status: 422,
        metaCode: metaErr.code,
      },
      422
    )
  }
})

// ── POST /campaigns/:id/sync — sync status from Meta ─────────────────────────

router.post('/:id/sync', async (c) => {
  const { tenantId, tenant } = c
  const { id } = c.req.param()
  const db = createDb(c.env.DATABASE_URL)

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
    .limit(1)

  if (!campaign) {
    return c.json({ error: 'Campaign not found', code: 'NOT_FOUND', status: 404 }, 404)
  }

  if (!campaign.metaCampaignId || !tenant.metaAccessToken) {
    return c.json({ error: 'Campaign not published to Meta yet', code: 'NOT_PUBLISHED', status: 400 }, 400)
  }

  const { internalStatus } = await syncCampaignStatusFromMeta(
    campaign.metaCampaignId,
    tenant.metaAccessToken
  )

  const [updated] = await db
    .update(campaigns)
    .set({ status: internalStatus as typeof campaign.status, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning()

  return c.json({ data: updated })
})

// ── POST /campaigns/:id/pause — pause campaign ────────────────────────────────

router.post('/:id/pause', async (c) => {
  const { tenantId, tenant } = c
  const { id } = c.req.param()
  const db = createDb(c.env.DATABASE_URL)

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
    .limit(1)

  if (!campaign) {
    return c.json({ error: 'Campaign not found', code: 'NOT_FOUND', status: 404 }, 404)
  }

  if (campaign.metaCampaignId && tenant.metaAccessToken) {
    await updateMetaCampaign(campaign.metaCampaignId, tenant.metaAccessToken, {
      status: 'paused',
    })
  }

  const [updated] = await db
    .update(campaigns)
    .set({ status: 'paused', updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning()

  return c.json({ data: updated })
})

// ── GET /campaigns/:id/insights — pull analytics from Meta ───────────────────

router.get('/:id/insights', async (c) => {
  const { tenantId, tenant } = c
  const { id } = c.req.param()
  const { days = '30' } = c.req.query()
  const db = createDb(c.env.DATABASE_URL)

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
    .limit(1)

  if (!campaign) {
    return c.json({ error: 'Campaign not found', code: 'NOT_FOUND', status: 404 }, 404)
  }

  if (!campaign.metaCampaignId || !tenant.metaAccessToken) {
    return c.json({ data: [] })
  }

  const since = new Date()
  since.setDate(since.getDate() - parseInt(days, 10))
  const until = new Date()

  const insights = await getCampaignInsights(
    campaign.metaCampaignId,
    tenant.metaAccessToken,
    {
      since: since.toISOString().split('T')[0]!,
      until: until.toISOString().split('T')[0]!,
    }
  )

  // Persist insights to DB for offline access
  if (insights.length > 0) {
    const rows = insights.map((insight) => ({
      tenantId,
      campaignId: id,
      date: new Date(insight.date_start),
      impressions: parseInt(insight.impressions, 10),
      clicks: parseInt(insight.clicks, 10),
      ctr: parseFloat(insight.ctr ?? '0'),
      cpc: Math.round(parseFloat(insight.cpc ?? '0') * 100),
      spend: Math.round(parseFloat(insight.spend) * 100),
      reach: parseInt(insight.reach, 10),
      frequency: parseFloat(insight.frequency),
      cpm: Math.round(parseFloat(insight.cpm ?? '0') * 100),
      conversions: parseInt(
        insight.actions?.find((a) => a.action_type === 'purchase')?.value ?? '0',
        10
      ),
      conversionValue: Math.round(
        parseFloat(
          insight.action_values?.find((a) => a.action_type === 'purchase')?.value ?? '0'
        ) * 100
      ),
      roas: parseFloat(insight.spend) > 0
        ? (parseFloat(insight.action_values?.find((a) => a.action_type === 'purchase')?.value ?? '0') /
           parseFloat(insight.spend))
        : 0,
    }))

    try {
      await db.insert(analyticsEvents).values(rows).onConflictDoNothing()
    } catch {
      // Non-fatal: ignore duplicate key errors
    }
  }

  return c.json({ data: insights })
})

// ── DELETE /campaigns/:id ─────────────────────────────────────────────────────

router.delete('/:id', async (c) => {
  const { tenantId, tenant } = c
  const { id } = c.req.param()
  const db = createDb(c.env.DATABASE_URL)

  const [existing] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
    .limit(1)

  if (!existing) {
    return c.json({ error: 'Campaign not found', code: 'NOT_FOUND', status: 404 }, 404)
  }

  // Delete from Meta if published
  if (existing.metaCampaignId && tenant.metaAccessToken) {
    try {
      await deleteMetaCampaign(existing.metaCampaignId, tenant.metaAccessToken)
    } catch (err) {
      console.warn('Failed to delete campaign from Meta:', err)
    }
  }

  await db
    .update(campaigns)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(campaigns.id, id))

  return c.json({ data: { success: true } })
})

export default router
