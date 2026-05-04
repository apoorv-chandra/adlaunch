'use client'

import { useState, useEffect, useCallback } from 'react'

export interface MetaAdAccount {
  id: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
}

export interface MetaConnectionStatus {
  connected: boolean
  adAccountId: string | null
  adAccounts: MetaAdAccount[]
  tokenExpiresAt: string | null
  tokenValid?: boolean
  reason?: string
}

export function useMetaConnection() {
  const [status, setStatus] = useState<MetaConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/meta/status')
      if (!res.ok) throw new Error('Failed to fetch Meta status')
      const data = await res.json() as { data: MetaConnectionStatus }
      setStatus(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchStatus() }, [fetchStatus])

  const getAuthUrl = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/meta/auth-url')
      if (!res.ok) throw new Error('Failed to get auth URL')
      const data = await res.json() as { data: { authUrl: string } }
      return data.data.authUrl
    } catch { return null }
  }, [])

  const selectAccount = useCallback(async (adAccountId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/meta/select-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adAccountId }) })
      if (!res.ok) return false
      await fetchStatus()
      return true
    } catch { return false }
  }, [fetchStatus])

  const disconnect = useCallback(async (): Promise<void> => {
    await fetch('/api/meta/disconnect', { method: 'DELETE' })
    await fetchStatus()
  }, [fetchStatus])

  return { status, loading, error, fetchStatus, getAuthUrl, selectAccount, disconnect }
}