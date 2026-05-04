// ─────────────────────────────────────────────────────────────────────────────
// Meta OAuth Service
// Handles: auth URL generation, code exchange, long-lived token, ad accounts
// ─────────────────────────────────────────────────────────────────────────────

import {
  META_GRAPH_BASE,
  META_OAUTH_BASE,
  META_API_VERSION,
  META_SCOPES,
} from '../lib/meta-constants'

export interface MetaOAuthConfig {
  appId: string
  appSecret: string
  redirectUri: string
}

export interface MetaTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
}

export interface MetaAdAccount {
  id: string             // act_XXXXX
  name: string
  account_status: number // 1 = active
  currency: string
  timezone_name: string
  business?: {
    id: string
    name: string
  }
}

export interface MetaUserProfile {
  id: string
  name: string
  email?: string
}

// ── Generate OAuth Authorization URL ─────────────────────────────────────────

export function generateMetaAuthUrl(
  config: MetaOAuthConfig,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    scope: META_SCOPES,
    response_type: 'code',
    state,
  })
  return `${META_OAUTH_BASE}/${META_API_VERSION}/dialog/oauth?${params.toString()}`
}

// ── Exchange Authorization Code for Short-Lived Token ────────────────────────

export async function exchangeCodeForToken(
  config: MetaOAuthConfig,
  code: string
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  })

  const res = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${params.toString()}`
  )

  if (!res.ok) {
    const err = await res.json() as { error?: { message: string; code: number } }
    throw new Error(
      `Meta OAuth exchange failed: ${err.error?.message ?? 'Unknown error'} (code: ${err.error?.code ?? 0})`
    )
  }

  return res.json() as Promise<MetaTokenResponse>
}

// ── Exchange Short-Lived Token for Long-Lived Token (60 days) ─────────────────

export async function getLongLivedToken(
  config: MetaOAuthConfig,
  shortLivedToken: string
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  })

  const res = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${params.toString()}`
  )

  if (!res.ok) {
    const err = await res.json() as { error?: { message: string } }
    throw new Error(
      `Long-lived token exchange failed: ${err.error?.message ?? 'Unknown error'}`
    )
  }

  return res.json() as Promise<MetaTokenResponse>
}

// ── Get User Profile ─────────────────────────────────────────────────────────

export async function getMetaUserProfile(
  accessToken: string
): Promise<MetaUserProfile> {
  const params = new URLSearchParams({
    fields: 'id,name,email',
    access_token: accessToken,
  })

  const res = await fetch(`${META_GRAPH_BASE}/me?${params.toString()}`)

  if (!res.ok) {
    throw new Error('Failed to fetch Meta user profile')
  }

  return res.json() as Promise<MetaUserProfile>
}

// ── List Ad Accounts ──────────────────────────────────────────────────────────

export async function getMetaAdAccounts(
  accessToken: string
): Promise<MetaAdAccount[]> {
  const params = new URLSearchParams({
    fields: 'id,name,account_status,currency,timezone_name,business',
    access_token: accessToken,
    limit: '25',
  })

  const res = await fetch(
    `${META_GRAPH_BASE}/me/adaccounts?${params.toString()}`
  )

  if (!res.ok) {
    const err = await res.json() as { error?: { message: string } }
    throw new Error(
      `Failed to fetch ad accounts: ${err.error?.message ?? 'Unknown error'}`
    )
  }

  const data = await res.json() as { data: MetaAdAccount[] }
  // Filter to only active accounts (account_status === 1)
  return data.data.filter((a) => a.account_status === 1)
}

// ── Verify Token Validity ─────────────────────────────────────────────────────

export async function verifyMetaToken(
  config: MetaOAuthConfig,
  accessToken: string
): Promise<{ valid: boolean; expiresAt?: Date; userId?: string }> {
  const params = new URLSearchParams({
    input_token: accessToken,
    access_token: `${config.appId}|${config.appSecret}`,
  })

  const res = await fetch(
    `${META_GRAPH_BASE}/debug_token?${params.toString()}`
  )

  if (!res.ok) {
    return { valid: false }
  }

  const data = await res.json() as {
    data: {
      is_valid: boolean
      expires_at?: number
      user_id?: string
    }
  }

  return {
    valid: data.data.is_valid,
    expiresAt: data.data.expires_at
      ? new Date(data.data.expires_at * 1000)
      : undefined,
    userId: data.data.user_id,
  }
}
