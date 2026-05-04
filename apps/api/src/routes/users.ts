import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db/index'
import { users, orgs } from '../db/schema'
import type { Org } from '../db/schema'

export const usersRouter = new Hono()

// GET /api/v1/users/me
usersRouter.get('/me', async (c) => {
  const clerkUserId = c.get('userId') as string
  const org = c.get('org') as Org

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1)

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json({ user, org })
})

// POST /api/v1/users/sync -- called by Clerk webhook on user.created
usersRouter.post('/sync', async (c) => {
  const body = await c.req.json()
  const { clerkUserId, clerkOrgId, email, name, avatarUrl } = body

  // Upsert org
  let [org] = await db.select().from(orgs).where(eq(orgs.clerkOrgId, clerkOrgId)).limit(1)
  if (!org) {
    const [slug] = await db
      .insert(orgs)
      .values({ clerkOrgId, name: name ?? clerkOrgId, slug: clerkOrgId })
      .onConflictDoNothing()
      .returning()
    org = slug
  }

  if (!org) return c.json({ error: 'Failed to resolve org' }, 500)

  // Upsert user
  await db
    .insert(users)
    .values({ clerkUserId, orgId: org.id, email, name, avatarUrl })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { email, name, avatarUrl },
    })

  return c.json({ ok: true })
})
