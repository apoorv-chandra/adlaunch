// ─────────────────────
// Drizzle ORM Schema -- AdLaunch
// Single-file, tenant-aware schema
// ─────────────────────

import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// ------------------------------------------------------------------
// Enums
// ------------------------------------------------------------------
export const planEnum = pgEnum('plan', ['free', 'pro', 'enterprise'])
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'pending_review',
  'active',
  'paused',
  'completed',
  'archived',
])
export const adPlatformEnum = pgEnum('ad_platform', [
  'facebook',
  'instagram',
  'messenger',
  'audience_network',
])
export const creativeTypeEnum = pgEnum('creative_type', [
  'image',
  'video',
  'carousel',
  'collection',
])
export const integrationStatusEnum = pgEnum('integration_status', [
  'connected',
  'expired',
  'revoked',
])

// ------------------------------------------------------------------
// Organisations (tenants)
// ------------------------------------------------------------------
export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkOrgId: text('clerk_org_id').notNull().unique(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: planEnum('plan').notNull().default('free'),
  metaAccountId: text('meta_account_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Org = typeof orgs.$inferSelect
export type NewOrg = typeof orgs.$inferInsert

// ------------------------------------------------------------------
// Users
// ------------------------------------------------------------------
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  email: text('email').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('users_org_idx').on(t.orgId)])

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

// ------------------------------------------------------------------
// Meta Ad Account Integrations
// ------------------------------------------------------------------
export const metaIntegrations = pgTable('meta_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  metaUserId: text('meta_user_id').notNull(),
  metaAccountId: text('meta_account_id').notNull(),
  accessToken: text('access_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at'),
  status: integrationStatusEnum('status').notNull().default('connected'),
  scopes: text('scopes').array().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [index('meta_integrations_org_idx').on(t.orgId)])

export type MetaIntegration = typeof metaIntegrations.$inferSelect
export type NewMetaIntegration = typeof metaIntegrations.$inferInsert

// ------------------------------------------------------------------
// Campaigns
// ------------------------------------------------------------------
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  status: campaignStatusEnum('status').notNull().default('draft'),
  objective: text('objective'),
  budgetDaily: decimal('budget_daily', { precision: 10, scale: 2 }),
  budgetTotal: decimal('budget_total', { precision: 10, scale: 2 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  platforms: adPlatformEnum('platforms').array().notNull().default([]),
  targetAudience: jsonb('target_audience'),
  metaCampaignId: text('meta_campaign_id'),
  aiSuggestions: boolean('ai_suggestions').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('campaigns_org_idx').on(t.orgId),
  index('campaigns_status_idx').on(t.status),
])

export type Campaign = typeof campaigns.$inferSelect
export type NewCampaign = typeof campaigns.$inferInsert

// ------------------------------------------------------------------
// Ad Sets
// ------------------------------------------------------------------
export const adSets = pgTable('ad_sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }).notNull(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  dailyBudget: decimal('daily_budget', { precision: 10, scale: 2 }),
  targeting: jsonb('targeting'),
  placements: text('placements').array().default([]),
  status: text('status').notNull().default('draft'),
  metaAdSetId: text('meta_ad_set_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('ad_sets_campaign_idx').on(t.campaignId),
  index('ad_sets_org_idx').on(t.orgId),
])

export type AdSet = typeof adSets.$inferSelect
export type NewAdSet = typeof adSets.$inferInsert

// ------------------------------------------------------------------
// Creatives
// ------------------------------------------------------------------
export const creatives = pgTable('creatives', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  type: creativeTypeEnum('type').notNull(),
  headline: text('headline'),
  body: text('body'),
  cta: text('cta'),
  mediaUrls: text('media_urls').array().default([]),
  thumbnailUrl: text('thumbnail_url'),
  aiGenerated: boolean('ai_generated').default(false),
  metaCreativeId: text('meta_creative_id'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [index('creatives_org_idx').on(t.orgId)])

export type Creative = typeof creatives.$inferSelect
export type NewCreative = typeof creatives.$inferInsert

// ------------------------------------------------------------------
// Ads
// ------------------------------------------------------------------
export const ads = pgTable('ads', {
  id: uuid('id').primaryKey().defaultRandom(),
  adSetId: uuid('ad_set_id').references(() => adSets.id, { onDelete: 'cascade' }).notNull(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  creativeId: uuid('creative_id').references(() => creatives.id).notNull(),
  name: text('name').notNull(),
  status: text('status').notNull().default('draft'),
  metaAdId: text('meta_ad_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('ads_ad_set_idx').on(t.adSetId),
  index('ads_org_idx').on(t.orgId),
])

export type Ad = typeof ads.$inferSelect
export type NewAd = typeof ads.$inferInsert

// ------------------------------------------------------------------
// Analytics Snapshots (daily roll-up)
// ------------------------------------------------------------------
export const analyticsSnapshots = pgTable('analytics_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
  adId: uuid('ad_id').references(() => ads.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),
  spend: decimal('spend', { precision: 12, scale: 2 }).default('0'),
  revenue: decimal('revenue', { precision: 12, scale: 2 }).default('0'),
  conversions: integer('conversions').default(0),
  reach: integer('reach').default(0),
  frequency: decimal('frequency', { precision: 8, scale: 2 }).default('0'),
  cpc: decimal('cpc', { precision: 10, scale: 2 }).default('0'),
  cpm: decimal('cpm', { precision: 10, scale: 2 }).default('0'),
  ctr: decimal('ctr', { precision: 8, scale: 4 }).default('0'),
  roas: decimal('roas', { precision: 8, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('analytics_org_date_idx').on(t.orgId, t.date),
  index('analytics_campaign_date_idx').on(t.campaignId, t.date),
])

export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect
export type NewAnalyticsSnapshot = typeof analyticsSnapshots.$inferInsert

// ------------------------------------------------------------------
// AI Recommendations
// ------------------------------------------------------------------
export const aiRecommendations = pgTable('ai_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  impact: text('impact').notNull(),
  actionable: boolean('actionable').default(true),
  acknowledged: boolean('acknowledged').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('ai_rec_org_idx').on(t.orgId),
  index('ai_rec_acked_idx').on(t.acknowledged),
])

export type AiRecommendation = typeof aiRecommendations.$inferSelect
export type NewAiRecommendation = typeof aiRecommendations.$inferInsert
