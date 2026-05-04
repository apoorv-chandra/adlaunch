// ─────────────────────────────────────────────────────────────────────────────
// AdLaunch — Shared TypeScript Types
// Used by both apps/web and apps/api
// ─────────────────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  clerkOrgId: string
  name: string
  slug: string
  plan: SubscriptionPlan
  stripeCustomerId: string | null
  metaAdAccountId: string | null
  metaAccessToken: string | null
  billingModel: BillingModel
  createdAt: Date
  updatedAt: Date
}

export type SubscriptionPlan = 'starter' | 'growth' | 'enterprise'
export type BillingModel = 'self_serve' | 'intermediary'

export interface User {
  id: string
  clerkUserId: string
  tenantId: string
  email: string
  firstName: string | null
  lastName: string | null
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Campaign {
  id: string
  tenantId: string
  name: string
  objective: CampaignObjective
  status: CampaignStatus
  dailyBudget: number | null
  lifetimeBudget: number | null
  currency: string
  startDate: Date | null
  endDate: Date | null
  metaCampaignId: string | null
  aiScore: number | null
  createdAt: Date
  updatedAt: Date
}

export type CampaignObjective =
  | 'BRAND_AWARENESS'
  | 'REACH'
  | 'TRAFFIC'
  | 'ENGAGEMENT'
  | 'LEAD_GENERATION'
  | 'APP_PROMOTION'
  | 'SALES'

export type CampaignStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'
  | 'rejected'

export interface AdSet {
  id: string
  campaignId: string
  tenantId: string
  name: string
  status: AdSetStatus
  dailyBudget: number | null
  targeting: AudienceTargeting
  metaAdSetId: string | null
  createdAt: Date
  updatedAt: Date
}

export type AdSetStatus = 'active' | 'paused' | 'deleted'

export interface AudienceTargeting {
  locations: string[]
  ageMin: number
  ageMax: number
  genders: Gender[]
  interests: string[]
  behaviors: string[]
  customAudiences: string[]
  lookalikeSources: string[]
}

export type Gender = 'male' | 'female' | 'all'

export interface Ad {
  id: string
  adSetId: string
  tenantId: string
  name: string
  status: AdStatus
  creativeId: string
  headline: string
  description: string
  callToAction: CallToAction
  destinationUrl: string
  metaAdId: string | null
  createdAt: Date
  updatedAt: Date
}

export type AdStatus = 'active' | 'paused' | 'deleted' | 'archived'

export type CallToAction =
  | 'SHOP_NOW'
  | 'LEARN_MORE'
  | 'SIGN_UP'
  | 'GET_QUOTE'
  | 'CONTACT_US'
  | 'DOWNLOAD'
  | 'BOOK_NOW'
  | 'SUBSCRIBE'

export interface Creative {
  id: string
  tenantId: string
  name: string
  type: CreativeType
  format: AdFormat
  r2Key: string
  r2Url: string
  width: number
  height: number
  fileSizeBytes: number
  mimeType: string
  generationMethod: CreativeGenerationMethod
  aiPrompt: string | null
  styleMatchId: string | null
  metaSpecValid: boolean
  createdAt: Date
  updatedAt: Date
}

export type CreativeType = 'image' | 'video' | 'carousel'
export type AdFormat = 'feed_1x1' | 'story_9x16' | 'reel_9x16' | 'carousel' | 'banner'
export type CreativeGenerationMethod = 'ai_generated' | 'style_matched' | 'template' | 'uploaded'

export interface StyleMatch {
  id: string
  tenantId: string
  referenceImageR2Key: string
  referenceImageUrl: string
  extractedStyle: ExtractedStyle
  confidenceScore: number
  createdAt: Date
}

export interface ExtractedStyle {
  colorPalette: string[]
  typography: TypographyStyle
  layout: LayoutPattern
  mood: string[]
  industryMatch: string
  brightness: 'light' | 'dark' | 'mixed'
  hasText: boolean
  dominantColors: string[]
}

export interface TypographyStyle {
  style: 'serif' | 'sans-serif' | 'display' | 'monospace' | 'handwritten'
  weight: 'light' | 'regular' | 'bold' | 'heavy'
  casing: 'mixed' | 'uppercase' | 'lowercase'
}

export interface LayoutPattern {
  type: 'image_top' | 'image_full' | 'split' | 'minimal' | 'text_heavy'
  ctaPosition: 'bottom' | 'center' | 'overlay'
  textPosition: 'top' | 'bottom' | 'center'
}

export interface CampaignAnalytics {
  campaignId: string
  tenantId: string
  date: Date
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  spend: number
  reach: number
  frequency: number
  conversions: number
  conversionValue: number
  roas: number
  cpm: number
}

export interface AiInsight {
  id: string
  campaignId: string
  tenantId: string
  type: InsightType
  title: string
  description: string
  estimatedImpact: string
  confidenceScore: number
  actionLabel: string
  actionPayload: Record<string, unknown>
  isApplied: boolean
  createdAt: Date
}

export type InsightType =
  | 'audience_refinement'
  | 'budget_optimization'
  | 'creative_refresh'
  | 'bid_adjustment'
  | 'schedule_optimization'
  | 'targeting_expansion'

export interface Payment {
  id: string
  tenantId: string
  stripePaymentIntentId: string
  amount: number
  currency: string
  status: PaymentStatus
  type: PaymentType
  metadata: Record<string, string>
  createdAt: Date
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'
export type PaymentType = 'subscription' | 'ad_spend' | 'one_time'

export interface Subscription {
  id: string
  tenantId: string
  stripeSubscriptionId: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'incomplete'

export interface ApiResponse<T> {
  data: T
  meta?: {
    total?: number
    page?: number
    perPage?: number
    hasMore?: boolean
  }
}

export interface ApiError {
  error: string
  code: string
  status: number
  details?: Record<string, string[]>
}

export interface PaginationParams {
  page?: number
  perPage?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface WorkerEnv {
  DATABASE_URL: string
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  META_APP_ID: string
  META_APP_SECRET: string
  META_API_VERSION: string
  OPENAI_API_KEY: string
  GOOGLE_GEMINI_API_KEY: string
  RESEND_API_KEY: string
  EMAIL_FROM: string
  APP_URL: string
  UPSTASH_REDIS_REST_URL: string
  UPSTASH_REDIS_REST_TOKEN: string
  CLOUDFLARE_R2_PUBLIC_URL: string
  // CF Bindings
  DB: D1Database
  CACHE: kVNamespace
  MEDIA_BUCKET: R2Bucket
  EMAIL_QUEUE: Queue
}
