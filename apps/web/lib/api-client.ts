import type { ApiResponse, ApiError } from '@adlaunch/types'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787'

export class AdLaunchApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message)
    this.name = 'AdLaunchApiError'
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}, token?: string): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) } })
  const json = await res.json() as ApiResponse<T> | ApiError
  if (!res.ok) { const err = json as ApiError; throw new AdLaunchApiError(err.code ?? 'UNKNOWN', err.error ?? 'Request failed', res.status) }
  return json as ApiResponse<T>
}

export const apiClient = {
  campaigns: {
    list: (token: string, params?: { status?: string; page?: number }) => apiFetch(`/api/v1/campaigns?${new URLSearchParams(params as Record<string, string>).toString()}`, {}, token),
    get: (token: string, id: string) => apiFetch(`/api/v1/campaigns/${id}`, {}, token),
    create: (token: string, body: Record<string, unknown>) => apiFetch('/api/v1/campaigns', { method: 'POST', body: JSON.stringify(body) }, token),
    update: (token: string, id: string, body: Record<string, unknown>) => apiFetch(`/api/v1/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),
    publish: (token: string, id: string) => apiFetch(`/api/v1/campaigns/${id}/publish`, { method: 'POST' }, token),
    pause: (token: string, id: string) => apiFetch(`/api/v1/campaigns/${id}/pause`, { method: 'POST' }, token),
    sync: (token: string, id: string) => apiFetch(`/api/v1/campaigns/${id}/sync`, { method: 'POST' }, token),
    insights: (token: string, id: string, days?: number) => apiFetch(`/api/v1/campaigns/${id}/insights?days=${days ?? 30}`, {}, token),
    delete: (token: string, id: string) => apiFetch(`/api/v1/campaigns/${id}`, { method: 'DELETE' }, token),
  },
  meta: {
    getAuthUrl: (token: string) => apiFetch('/api/v1/meta/auth-url', {}, token),
    getStatus: (token: string) => apiFetch('/api/v1/meta/status', {}, token),
    getAccounts: (token: string) => apiFetch('/api/v1/meta/accounts', {}, token),
    selectAccount: (token: string, adAccountId: string) => apiFetch('/api/v1/meta/select-account', { method: 'POST', body: JSON.stringify({ adAccountId }) }, token),
    disconnect: (token: string) => apiFetch('/api/v1/meta/disconnect', { method: 'DELETE' }, token),
  },
  adSets: {
    list: (token: string, campaignId: string) => apiFetch(`/api/v1/ad-sets?campaignId=${campaignId}`, {}, token),
    create: (token: string, body: Record<string, unknown>) => apiFetch('/api/v1/ad-sets', { method: 'POST', body: JSON.stringify(body) }, token),
    update: (token: string, id: string, body: Record<string, unknown>) => apiFetch(`/api/v1/ad-sets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token),
    publish: (token: string, id: string) => apiFetch(`/api/v1/ad-sets/${id}/publish`, { method: 'POST' }, token),
    delete: (token: string, id: string) => apiFetch(`/api/v1/ad-sets/${id}`, { method: 'DELETE' }, token),
  },
  ads: {
    list: (token: string, adSetId: string) => apiFetch(`/api/v1/ads?adSetId=${adSetId}`, {}, token),
    create: (token: string, body: Record<string, unknown>) => apiFetch('/api/v1/ads', { method: 'POST', body: JSON.stringify(body) }, token),
    publish: (token: string, id: string) => apiFetch(`/api/v1/ads/${id}/publish`, { method: 'POST' }, token),
    setStatus: (token: string, id: string, status: 'active' | 'paused') => apiFetch(`/api/v1/ads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  },
  users: {
    sync: (token: string, body: Record<string, unknown>) => apiFetch('/api/v1/users/sync', { method: 'POST', body: JSON.stringify(body) }, token),
    me: (token: string) => apiFetch('/api/v1/users/me', {}, token),
  },
  analytics: {
    overview: (token: string, days = 30) => apiFetch(`/api/v1/analytics/overview?days=${days}`, {}, token),
    timeseries: (token: string, params?: { campaignId?: string; days?: number }) => apiFetch(`/api/v1/analytics/timeseries?${new URLSearchParams(params as Record<string, string>).toString()}`, {}, token),
  },
}