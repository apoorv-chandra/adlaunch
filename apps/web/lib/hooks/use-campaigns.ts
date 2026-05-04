'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'

export interface Campaign {
  id: string
  tenantId: string
  name: string
  objective: string
  status: string
  dailyBudget: number | null
  lifetimeBudget: number | null
  currency: string
  startDate: string | null
  endDate: string | null
  metaCampaignId: string | null
  aiScore: number | null
  createdAt: string
  updatedAt: string
}

export interface CreateCampaignInput {
  name: string
  objective: string
  dailyBudget?: number
  lifetimeBudget?: number
  currency?: string
  startDate?: string
  endDate?: string
  notes?: string
  tags?: string[]
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8787'

export function useCampaigns() {
  const { getToken } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const authFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    const token = await getToken()
    const res = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}`, ...((options.headers as Record<string, string>) ?? {}) } })
    const data = await res.json()
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed: ${res.status}`)
    return data
  }, [getToken])

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetch('/api/v1/campaigns') as { data: Campaign[] }
      setCampaigns(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns')
    } finally { setLoading(false) }
  }, [authFetch])

  useEffect(() => { void fetchCampaigns() }, [fetchCampaigns])

  const createCampaign = useCallback(async (input: CreateCampaignInput): Promise<Campaign> => {
    const data = await authFetch('/api/v1/campaigns', { method: 'POST', body: JSON.stringify(input) }) as { data: Campaign }
    await fetchCampaigns()
    return data.data
  }, [authFetch, fetchCampaigns])

  const publishCampaign = useCallback(async (id: string): Promise<Campaign> => {
    const data = await authFetch(`/api/v1/campaigns/${id}/publish`, { method: 'POST' }) as { data: Campaign }
    await fetchCampaigns()
    return data.data
  }, [authFetch, fetchCampaigns])

  const pauseCampaign = useCallback(async (id: string): Promise<Campaign> => {
    const data = await authFetch(`/api/v1/campaigns/${id}/pause`, { method: 'POST' }) as { data: Campaign }
    await fetchCampaigns()
    return data.data
  }, [authFetch, fetchCampaigns])

  const syncCampaign = useCallback(async (id: string): Promise<Campaign> => {
    const data = await authFetch(`/api/v1/campaigns/${id}/sync`, { method: 'POST' }) as { data: Campaign }
    await fetchCampaigns()
    return data.data
  }, [authFetch, fetchCampaigns])

  const deleteCampaign = useCallback(async (id: string): Promise<void> => {
    await authFetch(`/api/v1/campaigns/${id}`, { method: 'DELETE' })
    await fetchCampaigns()
  }, [authFetch, fetchCampaigns])

  return { campaigns, loading, error, fetchCampaigns, createCampaign, publishCampaign, pauseCampaign, syncCampaign, deleteCampaign }
}