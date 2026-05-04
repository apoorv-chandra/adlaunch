import { Hono } from 'hono'
import { eq, and, gte, lte, desc, sum, avg } from 'drizzle-orm'
import { db } from '../db/index'
import { analyticsSnapshots, campaigns } from '../db/schema'
import type { Org } from '../db/schema'

export const analyticsRouter = new Hono()

// GET /api/v1/analytics/summary
analyticsRouter.get('/summary', async (c) => {
  const org = c.get('org') as Org
  const { from, to } = c.req.query()

  const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400 * 1000)
  const end = to ? new Date(to) : new Date()

  const rows = await db
    .select({
      totalImpressions: sum(analyticsSnapshots.impressions),
      totalClicks: sum(analyticsSnapshots.clicks),
      totalSpend: sum(analyticsSnapshots.spend),
      totalRevenue: sum(analyticsSnapshots.revenue),
      totalConversions: sum(analyticsSnapshots.conversions),
      avgRoas: avg(analyticsSnapshots.roas),
    })
    .from(analyticsSnapshots)
    .where(
      and(
        eq(analyticsSnapshots.orgId, org.id),
        gte(analyticsSnapshots.date, start),
        lte(analyticsSnapshots.date, end)
      )
    )

  return c.json(rows[0] ?? {})
})

// GET /api/v1/analytics/timeseries
analyticsRouter.get('/timeseries', async (c) => {
  const org = c.get('org') as Org
  const { from, to, campaignId } = c.req.query()

  const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400 * 1000)
  const end = to ? new Date(to) : new Date()

  const conditions = [
    eq(analyticsSnapshots.orgId, org.id),
    gte(analyticsSnapshots.date, start),
    lte(analyticsSnapshots.date, end),
  ]
  if (campaignId) conditions.push(eq(analyticsSnapshots.campaignId, campaignId))

  const rows = await db
    .select()
    .from(analyticsSnapshots)
    .where(and(...conditions))
    .orderBy(desc(analyticsSnapshots.date))
    .limit(90)

  return c.json(rows)
})
