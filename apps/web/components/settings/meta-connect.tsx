'use client'

import { useState } from 'react'
import { useMetaConnection } from '@/lib/hooks/use-meta-connection'
import { cn } from '@/lib/utils'

export function MetaConnect() {
  const { status, loading, getAuthUrl, selectAccount, disconnect } = useMetaConnection()
  const [connecting, setConnecting] = useState(false)
  const [selectingAccount, setSelectingAccount] = useState(false)

  const handleConnect = async () => {
    setConnecting(true)
    const url = await getAuthUrl()
    if (url) { window.location.href = url } else { setConnecting(false) }
  }

  const handleSelectAccount = async (accountId: string) => {
    setSelectingAccount(true)
    await selectAccount(accountId)
    setSelectingAccount(false)
  }

  const handleDisconnect = async () => {
    if (confirm('Disconnect Meta Ads account? Your campaigns will remain but cannot be published.')) await disconnect()
  }

  if (loading) return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="animate-pulse flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-100 rounded-lg" />
        <div className="flex-1 space-y-2"><div className="h-4 bg-slate-100 rounded w-1/3" /><div className="h-3 bg-slate-100 rounded w-1/2" /></div>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-xl">📘</div>
          <div>
            <h3 className="font-bold text-slate-900 text-[14px]">Meta Ads Account</h3>
            <p className="text-xs text-slate-500 mt-0.5">Facebook & Instagram campaign management</p>
          </div>
        </div>
        {status?.connected
          ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Connected</span>
          : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Not connected</span>}
      </div>
      <div className="p-6">
        {!status?.connected ? (
          <div>
            <p className="text-sm text-slate-600 mb-4">Connect your Facebook Business Manager to start publishing campaigns to Meta & Instagram.</p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-5">
              <p className="text-xs font-semibold text-blue-800 mb-1.5">Permissions requested:</p>
              <ul className="text-xs text-blue-700 space-y-0.5"><li>✓ Create & manage ad campaigns</li><li>✓ Read campaign performance insights</li><li>✓ Access Business Manager accounts</li><li>✓ Manage ad creatives and audiences</li></ul>
            </div>
            <button onClick={() => void handleConnect()} disabled={connecting} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1877f2] hover:bg-[#0d65d9] text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-60">
              {connecting ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Redirecting to Facebook…</>) : (<><span className="text-base">📘</span>Connect with Facebook</>)}
            </button>
          </div>
        ) : (
          <div>
            {status.tokenExpiresAt && <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-100 rounded-lg"><span className="text-green-600">🔒</span><div className="text-xs text-green-700"><span className="font-semibold">Access token valid</span> — expires {new Date(status.tokenExpiresAt).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>}
            {status.adAccounts.length > 0 && <div className="mb-5"><p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Ad Account</p><div className="space-y-2">{status.adAccounts.map((account) => { const normalised = account.id.replace('act_', ''); const isSelected = status.adAccountId === normalised; return (<button key={account.id} onClick={() => void handleSelectAccount(account.id)} disabled={selectingAccount} className={cn('w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all', isSelected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300')}><div><p className={cn('text-sm font-semibold', isSelected ? 'text-indigo-800' : 'text-slate-900')}>{account.name}</p><p className="text-xs text-slate-500 mt-0.5">{account.id} · {account.currency} · {account.timezone_name}</p></div>{isSelected && <span className="text-indigo-600 text-sm font-bold">✓ Active</span>}</button>) })}</div>{!status.adAccountId && <p className="text-xs text-amber-600 mt-2 font-medium">⚠ Select an ad account above to start publishing campaigns.</p>}</div>}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5"><p className="text-xs font-semibold text-slate-600 mb-1.5">Active Permissions</p><div className="grid grid-cols-2 gap-1">{['Campaign management','Performance insights','Ad creative upload','Audience targeting'].map((perm) => (<div key={perm} className="text-xs text-slate-600 flex items-center gap-1"><span className="text-green-500">✓</span> {perm}</div>))}</div></div>
            <div className="flex gap-2"><button onClick={() => void handleConnect()} className="flex-1 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100">🔄 Reconnect / Refresh Token</button><button onClick={() => void handleDisconnect()} className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">Disconnect</button></div>
          </div>
        )}
      </div>
    </div>
  )
}