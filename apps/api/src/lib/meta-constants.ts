// ─────────────────────────────────────────────────────────────────────────────
// Meta Marketing API — Constants, enums, and mappers
// Meta Graph API v18+ uses OUTCOME_ prefix for objectives
// ─────────────────────────────────────────────────────────────────────────────

export const META_API_VERSION = 'v18.0'
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`
export const META_OAUTH_BASE = 'https://www.facebook.com'

// ── Required OAuth Scopes ────────────────────────────────────────────────────
export const META_SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_read_engagement',
  'pages_show_list',
  'public_profile',
  'email',
].join(',')

// ── Objective Mapping ─────────────────────────────────────────────────────────
// Our internal objectives → Meta v18+ OUTCOME_ objectives
export const OBJECTIVE_TO_META: Record<string, string> = {
  BRAND_AWARENESS: 'OUTCOME_AWARENESS',
  REACH: 'OUTCOME_AWARENESS',
  TRAFFIC: 'OUTCOME_TRAFFIC',
  ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
  LEAD_GENERATION: 'OUTCOME_LEADS',
  APP_PROMOTION: 'OUTCOME_APP_PROMOTION',
  SALES: 'OUTCOME_SALES',
}

export const META_TO_OBJECTIVE: Record<string, string> = {
  OUTCOME_AWARENESS: 'BRAND_AWARENESS',
  OUTCOME_TRAFFIC: 'TRAFFIC',
  OUTCOME_ENGAGEMENT: 'ENGAGEMENT',
  OUTCOME_LEADS: 'LEAD_GENERATION',
  OUTCOME_APP_PROMOTION: 'APP_PROMOTION',
  OUTCOME_SALES: 'SALES',
}

// ── Optimization Goals per Objective ────────────────────────────────────────
export const OBJECTIVE_OPTIMIZATION_GOALS: Record<string, string> = {
  OUTCOME_AWARENESS: 'REACH',
  OUTCOME_TRAFFIC: 'LINK_CLICKS',
  OUTCOME_ENGAGEMENT: 'POST_ENGAGEMENT',
  OUTCOME_LEADS: 'LEAD_GENERATION',
  OUTCOME_APP_PROMOTION: 'APP_INSTALLS',
  OUTCOME_SALES: 'OFFSITE_CONVERSIONS',
}

// ── Billing Events per Optimization Goal ────────────────────────────────────
export const OPTIMIZATION_BILLING_EVENTS: Record<string, string> = {
  REACH: 'IMPRESSIONS',
  LINK_CLICKS: 'LINK_CLICKS',
  POST_ENGAGEMENT: 'IMPRESSIONS',
  LEAD_GENERATION: 'IMPRESSIONS',
  APP_INSTALLS: 'IMPRESSIONS',
  OFFSITE_CONVERSIONS: 'IMPRESSIONS',
}

// ── CTA Mapping ──────────────────────────────────────────────────────────────
export const CTA_TO_META: Record<string, string> = {
  SHOP_NOW: 'SHOP_NOW',
  LEARN_MORE: 'LEARN_MORE',
  SIGN_UP: 'SIGN_UP',
  GET_QUOTE: 'GET_QUOTE',
  CONTACT_US: 'CONTACT_US',
  DOWNLOAD: 'DOWNLOAD',
  BOOK_NOW: 'BOOK_TRAVEL',
  SUBSCRIBE: 'SUBSCRIBE',
}

// ── Campaign Status Mapping ──────────────────────────────────────────────────
export const STATUS_TO_META: Record<string, string> = {
  draft: 'PAUSED',
  active: 'ACTIVE',
  paused: 'PAUSED',
  completed: 'PAUSED',
  archived: 'DELETED',
}

export const META_STATUS_TO_INTERNAL: Record<string, string> = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DELETED: 'archived',
  ARCHIVED: 'archived',
  IN_PROCESS: 'pending_review',
  WITH_ISSUES: 'rejected',
}

// ── Gender Mapping ───────────────────────────────────────────────────────────
// Meta: 1 = male, 2 = female — [] or [1,2] = all
export const GENDER_TO_META: Record<string, number[]> = {
  all: [],
  male: [1],
  female: [2],
}

// ── Minimum Daily Budget (cents) ─────────────────────────────────────────────
export const META_MIN_DAILY_BUDGET_CENTS = 100  // $1.00 minimum

// ── Ad Format → Meta placement ───────────────────────────────────────────────
export const FORMAT_PLACEMENTS: Record<string, object> = {
  feed_1x1: {
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed'],
    instagram_positions: ['stream'],
  },
  story_9x16: {
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['story'],
    instagram_positions: ['story'],
  },
  reel_9x16: {
    publisher_platforms: ['instagram'],
    instagram_positions: ['reels'],
  },
  carousel: {
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed'],
    instagram_positions: ['stream'],
  },
}

// ── Meta Error Codes ─────────────────────────────────────────────────────────
export const META_ERROR_CODES = {
  RATE_LIMIT: 17,
  PERMISSION_DENIED: 200,
  INVALID_ACCESS_TOKEN: 190,
  TOKEN_EXPIRED: 463,
  DUPLICATE_CAMPAIGN: 1487926,
} as const
