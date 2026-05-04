import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { createDb, ads, adSets, creatives } from '../db'
import { authMiddleware } from '../middleware/auth'
import { tenantMiddleware } from '../middleware/tenant'
import { createMetaAdCreative, createMetaAd, updateMetaAdStatus } from '../services/meta-api'
import type { WorkerEnv } from '@adlaunch/types'

type Variables = {
  userId: string; orgId: string; sessionId: string
  tenantId: string
  tenant: import('../db/schema').DbTenant
  dbUser: import('../db/schema').DbUser
}

const router = new Hono<{ Bindings: WorkerEnv; Variables: Variables }>()
router.use('*', authMiddleware, tenantMiddleware)

const createAdSchema = z.object({
  adSetId: z.string().uuid(),
  creativeId: z.string().uuid(),
  name: z.string().min(1).max(200),
  headline: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  callToAction: z.enum(['SHOP_NOW','LEARN_MORE','SIGN_UP','GET_QUOTE','CONTACT_US','DOWNLOAD','BOOK_NOW','SUBSCRIBE']).default('LEARN_MORE'),
  destinationUrl: z.string().url(),
})

router.get('/', async (c) => {
  const { tenantId } = c
  const { adSetId } = c.req.query()
  const db = createDb(c.env.DATABASE_URL)
  if (!adSetId) return c.json({ error: 'adSetId required', code: 'BAD_REQUEST', status: 400 }, 400)
  const data = await db.select().from(ads).where(and(eq(ads.tenantId, tenantId), eq(ads.adSetId, adSetId)))
  return c.json({ data })
})

router.post('/', zValidator('json', createAdSchema), async (c) => {
  const { tenantId } = c
  const body = c.req.valid('json')
  const db = createDb(c.env.DATABASE_URL)
  const [adSet] = await db.select().from(adSets).where(and(eq(adSets.id, body.adSetId), eq(adSets.tenantId, tenantId))).limit(1)
  if (!adSet) return c.json({ error: 'Ad set not found', code: 'NOT_FOUND', status: 404 }, 404)
  const [creative] = await db.select().from(creatives).where(and(eq(creatives.id, body.creativeId), eq(creatives.tenantId, tenantId))).limit(1)
  if (!creative) return c.json({ error: 'Creative not found', code: 'NOT_FOUND', status: 404 }, 404)
  const [ad] = await db.insert(ads).values({ tenantId, adSetId: body.adSetId, creativeId: body.creativeId, name: body.name, headline: body.headline, description: body.description, callToAction: body.callToAction, destinationUrl: body.destinationUrl, status: 'active' }).returning()
  return c.json({ data: ad }, 201)
})

router.post('/:id/publish', async (c) => {
  const { tenantId, tenant } = c
  const { id } = c.req.param()
  const db = createDb(c.env.DATABASE_URL)
  if (!tenant.metaAccessToken || !tenant.metaAdAccountId) return c.json({ error: 'Meta not connected', code: 'META_NOT_CONNECTED', status: 400 }, 400)
  const [ad] = await db.select().from(ads).where(and(eq(ads.id, id), eq(ads.tenantId, tenantId))).limit(1)
  if (!ad) return c.json({ error: 'Ad not found', code: 'NOT_FOUND', status: 404 }, 404)
  const [adSet] = await db.select().from(adSets).where(eq(adSets.id, ad.adSetId)).limit(1)
  if (!adSet?.metaAdSetId) return c.json({ error: 'Ad set not published', code: 'ADSET_NOT_PUBLISHED', status: 400 }, 400)
  const [creative] = await db.select().from(creatives).where(eq(creatives.id, ad.creativeId)).limit(1)
  if (!creative) return c.json({ error: 'Creative not found', code: 'NOT_FOUND', status: 404 }, 404)
  const { id: metaCreativeId } = await createMetaAdCreative(tenant.metaAdAccountId, tenant.metaAccessToken, { name: `${ad.name} — Creative`, pageId: tenant.metaBusinessId ?? '', imageUrl: creative.r2Url, headline: ad.headline, description: ad.description ?? undefined, callToAction: ad.callToAction, destinationUrl: ad.destinationUrl })
  const { id: metaAdId } = await createMetaAd(tenant.metaAdAccountId, tenant.metaAccessToken, { name: ad.name, adSetId: adSet.metaAdSetId, creativeId: metaCreativeId })
  const [updated] = await db.update(ads).set({ metaAdId, updatedAt: new Date() }).where(eq(ads.id, id)).returning()
  return c.json({ data: updated })
})

router.patch('/:id/status', zValidator('json', z.object({ status: z.enum(['active', 'paused']) })), async (c) => {
  const { tenantId, tenant } = c
  const { id } = c.req.param()
  const { status } = c.req.valid('json')
  const db = createDb(c.env.DATABASE_URL)
  const [ad] = await db.select().from(ads).where(and(eq(ads.id, id), eq(ads.tenantId, tenantId))).limit(1)
  if (!ad) return c.json({ error: 'Ad not found', code: 'NOT_FOUND', status: 404 }, 404)
  if (ad.metaAdId && tenant.metaAccessToken) await updateMetaAdStatus(ad.metaAdId, tenant.metaAccessToken, status === 'active' ? 'ACTIVE' : 'PAUSED')
  const [updated] = await db.update(ads).set({ status, updatedAt: new Date() }).where(eq(ads.id, id)).returning()
  return c.json({ data: updated })
})

export default router