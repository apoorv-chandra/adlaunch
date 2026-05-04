import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { createDb, adSets, campaigns } from '../db'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenant'
import { createMetaAdSet, updateMetaAdSet } from '../services/meta-api'
import type { WorkerEnv } from '@adlaunch/types'

type Variables = {
  userId: string; orgId: string; sessionId: string
  tenantId: string
  tenant: import('../db/schema').DbTenant
  dbUser: import('../db/schema').DbUser
}

const router = new Hono<{ Bindings: WorkerEnv; Variables: Variables }>()
router.use('*', authMiddleware, tenantMiddleware)

const targetingSchema = z.object({
  locations: z.array(z.string()).default(['US']),
  ageMin: z.number().int().min(18).max(65).default(25),
  ageMax: z.number().int().min(18).max(65).default(55),
  genders: z.array(z.enum(['all', 'male', 'female'])).default(['all']),
  interests: z.array(z.string()).default([]),
  behaviors: z.array(z.string()).default([]),
  customAudiences: z.array(z.string()).optional(),
})

const createAdSetSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().min(1).max(200),
  dailyBudget: z.number().int().min(100).optional(),
  targeting: targetingSchema,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

router.get('/', async (c) => {
  const { tenantId } = c
  const { campaignId } = c.req.query()
  const db = createDb(c.env.DATABASE_URL)
  if (!campaignId) return c.json({ error: 'campaignId required', code: 'BAD_REQUEST', status: 400 }, 400)
  const data = await db.select().from(adSets).where(and(eq(adSets.tenantId, tenantId), eq(adSets.campaignId, campaignId)))
  return c.json({ data })
})

router.post('/', zValidator('json', createAdSetSchema), async (c) => {
  const { tenantId } = c
  const body = c.req.valid('json')
  const db = createDb(c.env.DATABASE_URL)
  const [campaign] = await db.select().from(campaigns).where(and(eq(campaigns.id, body.campaignId), eq(campaigns.tenantId, tenantId))).limit(1)
  if (!campaign) return c.json({ error: 'Campaign not found', code: 'NOT_FOUND', status: 404 }, 404)
  const [adSet] = await db.insert(adSets).values({ tenantId, campaignId: body.campaignId, name: body.name, dailyBudget: body.dailyBudget, targeting: body.targeting, status: 'active' } as typeof adSets.$inferInsert).returning()
  return c.json({ data: adSet }, 201)
})

router.patch('/:id', zValidator('json', createAdSetSchema.partial()), async (c) => {
  const { tenantId } = c
  const { id } = c.req.param()
  const body = c.req.valid('json')
  const db = createDb(c.env.DATABASE_URL)
  const [existing] = await db.select().from(adSets).where(and(eq(adSets.id, id), eq(adSets.tenantId, tenantId))).limit(1)
  if (!existing) return c.json({ error: 'Ad set not found', code: 'NOT_FOUND', status: 404 }, 404)
  const [updated] = await db.update(adSets).set({ ...body, updatedAt: new Date() } as Partial<typeof adSets.$inferInsert>).where(eq(adSets.id, id)).returning()
  const { tenant } = c
  if (existing.metaAdSetId && tenant.metaAccessToken) {
    try { await updateMetaAdSet(existing.metaAdSetId, tenant.metaAccessToken, { name: body.name, dailyBudgetCents: body.dailyBudget }) } catch (err) { console.warn('Meta sync failed:', err) }
  }
  return c.json({ data: updated })
})

router.post('/:id/publish', async (c) => {
  const { tenantId, tenant } = c
  const { id } = c.req.param()
  const db = createDb(c.env.DATABASE_URL)
  if (!tenant.metaAccessToken || !tenant.metaAdAccountId) return c.json({ error: 'Meta not connected', code: 'META_NOT_CONNECTED', status: 400 }, 400)
  const [adSet] = await db.select().from(adSets).where(and(eq(adSets.id, id), eq(adSets.tenantId, tenantId))).limit(1)
  if (!adSet) return c.json({ error: 'Ad set not found', code: 'NOT_FOUND', status: 404 }, 404)
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, adSet.campaignId)).limit(1)
  if (!campaign?.metaCampaignId) return c.json({ error: 'Campaign not published to Meta yet', code: 'CAMPAIGN_NOT_PUBLISHED', status: 400 }, 400)
  const targeting = adSet.targeting as { locations: string[]; ageMin: number; ageMax: number; genders: string[]; interests: string[]; behaviors: string[]; customAudiences?: string[] }
  const { id: metaAdSetId } = await createMetaAdSet(tenant.metaAdAccountId, tenant.metaAccessToken, { name: adSet.name, campaignId: campaign.metaCampaignId, objective: campaign.objective, dailyBudgetCents: adSet.dailyBudget ?? undefined, targeting })
  const [updated] = await db.update(adSets).set({ metaAdSetId, updatedAt: new Date() } as Partial<typeof adSets.$inferInsert>).where(eq(adSets.id, id)).returning()
  return c.json({ data: updated })
})

router.delete('/:id', async (c) => {
  const { tenantId } = c
  const { id } = c.req.param()
  const db = createDb(c.env.DATABASE_URL)
  const [existing] = await db.select().from(adSets).where(and(eq(adSets.id, id), eq(adSets.tenantId, tenantId))).limit(1)
  if (!existing) return c.json({ error: 'Not found', code: 'NOT_FOUND', status: 404 }, 404)
  await db.update(adSets).set({ status: 'deleted', updatedAt: new Date() } as Partial<typeof adSets.$inferInsert>).where(eq(adSets.id, id))
  return c.json({ data: { success: true } })
})

export default router