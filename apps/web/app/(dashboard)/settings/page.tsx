import type { Metadata } from 'next'
import { MetaConnect } from '@/components/settings/meta-connect'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account and integrations</p>
      </div>
      <MetaConnect />
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-xl flex-shrink-0">🎨</div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 text-[14px] mb-0.5">Brand Kit</h2>
            <p className="text-sm text-slate-500">Upload your logo, set brand colors and typography for consistent AI-generated creatives.</p>
          </div>
          <button className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex-shrink-0">Set up →</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-xl flex-shrink-0">🔔</div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 text-[14px] mb-0.5">Notifications</h2>
            <p className="text-sm text-slate-500">Email alerts for campaign status changes, spend thresholds, and AI recommendations.</p>
          </div>
          <button className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0">Configure →</button>
        </div>
      </div>
    </div>
  )
}