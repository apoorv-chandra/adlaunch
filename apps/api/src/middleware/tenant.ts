import { createMiddleware } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { orgs } from '../db/schema'

export const tenantMiddleware = createMiddleware(async (c, next) => {
  // Clerk sets the active org on the session
  const clerkOrgId = c.get('orgId') as string | null
  if (!clerkOrgId) {
    return c.json({ error: 'No active organisation' }, 403)
  }

  const [org] = await db
    .select()
    .from(orgs)
    .where(eq(orgs.clerkOrgId, clerkOrgId))
    .limit(1)

  if (!org) {
    return c.json({ error: 'Organisation not found' }, 404)
  }

  c.set('org', org)
  await next()
})
