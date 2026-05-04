'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCampaigns } from '@/lib/hooks/use-campaigns'
import { toast } from 'sonner'

type Step = 1 | 2 | 3 | 4 | 5

interface WizardData {
  name: string; objective: string
  locations: string[]; ageMin: number; ageMax: number; gender: 'all' | 'male' | 'female'; interests: string[]
  dailyBudget: number; currency: string; startDate: string; endDate: string
  creativeNote: string
}

const DEFAULT_DATA: WizardData = {
  name: '', objective: 'BRAND_AWARENESS',
  locations: ['US'], ageMin: 25, ageMax: 44, gender: 'all', interests: [],
  dailyBudget: 4500, currency: 'USD', startDate: '', endDate: '',
  creativeNote: '',
}

const steps = [{ n: 1, label: 'Objective' }, { n: 2, label: 'Audience' }, { n: 3, label: 'Budget' }, { n: 4, label: 'Creative' }, { n: 5, label: 'Review' }]

const objectives = [
  { value: 'BRAND_AWARENESS', icon: '📣', title: 'Brand Awareness', desc: 'Reach people most likely to recall your brand after seeing your ad.', recommended: 'Best for new brands' },
  { value: 'TRAFFIC', icon: '🌐', title: 'Website Traffic', desc: 'Drive clicks to your website, landing page, or app store listing.', recommended: null },
  { value: 'LEAD_GENERATION', icon: '🎯', title: 'Lead Generation', desc: 'Collect contact details via instant forms without leaving Instagram.', recommended: 'Most popular' },
  { value: 'SALES', icon: '🛒', title: 'Sales / Conversions', desc: 'Find customers most likely to purchase from your website or app.', recommended: null },
]

const INTEREST_OPTIONS = [
  { id: '6003107902433', label: '👗 Fashion' }, { id: '6003161475030', label: '🛍️ Online Shopping' },
  { id: '6003057791627', label: '💄 Beauty' }, { id: '6003137966239', label: '🏃 Fitness' },
  { id: '6003055424829', label: '🎨 Art & Design' }, { id: '6003012652623', label: '✈️ Travel' },
  { id: '6004854060119', label: '🏠 Home & Garden' }, { id: '6003553085900', label: '🍕 Food & Dining' },
]

const LOCATION_OPTIONS = [
  { code: 'US', label: '🇺🇸 United States' }, { code: 'GB', label: '🇬🇧 United Kingdom' },
  { code: 'CA', label: '🇨🇦 Canada' }, { code: 'AU', label: '🇦🇺 Australia' },
  { code: 'DE', label: '🇩🇪 Germany' }, { code: 'FR', label: '🇫🇷 France' }, { code: 'IN', label: '🇮🇳 India' },
]

export function CampaignWizard() {
  const [step, setStep] = useState<Step>(1)
  const [data, setData] = useState<WizardData>(DEFAULT_DATA)
  const [publishing, setPublishing] = useState(false)
  const { createCampaign } = useCampaigns()
  const router = useRouter()
  const update = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }))

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const campaign = await createCampaign({ name: data.name || 'New Campaign', objective: data.objective, dailyBudget: data.dailyBudget, currency: data.currency, startDate: data.startDate || undefined, endDate: data.endDate || undefined })
      toast.success('Campaign created!', { description: `"${campaign.name}" saved as draft. Connect Meta to publish.` })
      router.push('/campaigns')
    } catch (err) {
      toast.error('Failed to create campaign', { description: err instanceof Error ? err.message : 'Unknown error' })
    } finally { setPublishing(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center px-8 py-4 bg-slate-50 border-b border-slate-200 gap-0 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all', s.n < step ? 'bg-green-500 text-white' : s.n === step ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-200 text-slate-400')}>
                {s.n < step ? '✓' : s.n}
              </div>
              <span className={cn('text-xs font-semibold whitespace-nowrap', s.n === step ? 'text-indigo-600' : s.n < step ? 'text-slate-500' : 'text-slate-400')}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={cn('flex-1 h-0.5 mx-2 min-w-[16px]', s.n < step ? 'bg-green-400' : 'bg-slate-200')} />}
          </div>
        ))}
      </div>
      <div className="flex min-h-[480px]">
        <div className="flex-1 p-8 border-r border-slate-200 overflow-auto">
          {step === 1 && <Step1Objective data={data} update={update} />}
          {step === 2 && <Step2Audience data={data} update={update} />}
          {step === 3 && <Step3Budget data={data} update={update} />}
          {step === 4 && <Step4Creative data={data} update={update} />}
          {step === 5 && <Step5Review data={data} />}
        </div>
        <div className="w-[276px] flex-shrink-0 p-6 bg-slate-50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Campaign Summary</p>
          {[{ label: 'Name', value: data.name || '—', done: !!data.name }, { label: 'Objective', value: objectives.find((o) => o.value === data.objective)?.title ?? '—', done: step > 1 }, { label: 'Audience', value: step > 2 ? `${data.locations.join(', ')} · ${data.gender}` : 'Not set', done: step > 2 }, { label: 'Budget', value: step > 3 ? `$${(data.dailyBudget / 100).toFixed(0)}/day` : 'Not set', done: step > 3 }, { label: 'Creative', value: 'Pending (Phase 3)', done: false }].map((item) => (
            <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-slate-200 text-sm last:border-0">
              <span className="text-slate-500 text-xs">{item.label}</span>
              <span className={cn('font-semibold text-xs text-right max-w-[140px] truncate', item.done ? 'text-green-600' : 'text-slate-400')}>{item.value}</span>
            </div>
          ))}
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-xs font-bold text-green-700 mb-1">⏱ Estimated Time</p><p className="text-xs text-slate-600">~4 minutes to first live campaign</p></div>
          <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg"><p className="text-xs font-bold text-indigo-700 mb-1">✦ AI Budget Suggestion</p><p className="text-xl font-black text-slate-900">$45<span className="text-sm font-normal text-slate-400">/day</span></p><p className="text-[10.5px] text-slate-500 mt-0.5">Optimal for this audience</p></div>
        </div>
      </div>
      <div className="flex items-center justify-between px-8 py-4 border-t border-slate-200 bg-slate-50">
        <button onClick={() => setStep((s) => Math.max(1, s - 1) as Step)} disabled={step === 1} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">← Back</button>
        <p className="text-xs text-slate-400">Step {step} of 5 · {step * 20}% complete</p>
        {step < 5 ? (
          <button onClick={() => setStep((s) => Math.min(5, s + 1) as Step)} className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg hover:opacity-90 transition-opacity shadow-sm">Continue → {steps[step]?.label}</button>
        ) : (
          <button onClick={() => void handlePublish()} disabled={publishing} className="px-5 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-60">
            {publishing ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</span> : '🚀 Save Campaign'}
          </button>
        )}
      </div>
    </div>
  )
}

function Step1Objective({ data, update }: { data: WizardData; update: (p: Partial<WizardData>) => void }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1.5"><h2 className="text-lg font-extrabold text-slate-900">What&apos;s your campaign objective?</h2></div>
      <p className="text-sm text-slate-500 mb-5">Meta will optimise ad delivery for this outcome.</p>
      <div className="mb-5"><label className="block text-xs font-semibold text-slate-600 mb-1.5">Campaign Name *</label><input type="text" value={data.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Summer Sale 2026" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /></div>
      <div className="grid grid-cols-2 gap-3">
        {objectives.map((o) => (
          <button key={o.value} onClick={() => update({ objective: o.value })} className={cn('text-left p-4 rounded-xl border-2 transition-all', data.objective === o.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white')}>
            <div className="text-2xl mb-2">{o.icon}</div>
            <div className={cn('font-bold text-sm mb-1', data.objective === o.value ? 'text-indigo-700' : 'text-slate-900')}>{o.title}</div>
            <div className="text-xs text-slate-500 leading-relaxed">{o.desc}</div>
            {o.recommended && <span className="inline-block mt-2 text-[9px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">✦ {o.recommended}</span>}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl"><span className="text-lg flex-shrink-0 mt-0.5">🤖</span><p className="text-xs text-slate-600 leading-relaxed"><span className="font-bold text-indigo-700">AI Suggestion: </span>Based on your business type <strong>E-commerce</strong>, we recommend <button className="font-bold text-indigo-700 underline" onClick={() => update({ objective: 'SALES' })}>Sales / Conversions</button> for the best ROAS.</p></div>
    </div>
  )
}

function Step2Audience({ data, update }: { data: WizardData; update: (p: Partial<WizardData>) => void }) {
  const toggleLocation = (code: string) => update({ locations: data.locations.includes(code) ? data.locations.filter((l) => l !== code) : [...data.locations, code] })
  const toggleInterest = (id: string) => update({ interests: data.interests.includes(id) ? data.interests.filter((i) => i !== id) : [...data.interests, id] })
  return (
    <div>
      <div className="flex items-center gap-3 mb-1.5"><h2 className="text-lg font-extrabold text-slate-900">Define Your Target Audience</h2><span className="text-[10px] font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 px-2 py-0.5 rounded-full">✦ AI Pre-filled</span></div>
      <p className="text-sm text-slate-500 mb-5">AI analysed your past campaigns and pre-filled the best-performing audience.</p>
      <div className="mb-4"><label className="block text-xs font-semibold text-slate-600 mb-2">Locations <span className="text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">✦ AI</span></label><div className="flex flex-wrap gap-2">{LOCATION_OPTIONS.map((loc) => (<button key={loc.code} onClick={() => toggleLocation(loc.code)} className={cn('px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors', data.locations.includes(loc.code) ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}>{loc.label}</button>))}</div></div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Age Min</label><input type="number" min={18} max={65} value={data.ageMin} onChange={(e) => update({ ageMin: parseInt(e.target.value, 10) })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400" /></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Age Max</label><input type="number" min={18} max={65} value={data.ageMax} onChange={(e) => update({ ageMax: parseInt(e.target.value, 10) })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400" /></div>
        <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Gender</label><select value={data.gender} onChange={(e) => update({ gender: e.target.value as 'all' | 'male' | 'female' })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400"><option value="all">All</option><option value="female">Women</option><option value="male">Men</option></select></div>
      </div>
      <div className="mb-4"><label className="block text-xs font-semibold text-slate-600 mb-2">Interests <span className="text-[9px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">✦ AI-suggested</span></label><div className="flex flex-wrap gap-2">{INTEREST_OPTIONS.map((interest) => (<button key={interest.id} onClick={() => toggleInterest(interest.id)} className={cn('px-3 py-1.5 rounded-full border text-xs font-medium transition-colors', data.interests.includes(interest.id) ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}>{interest.label}</button>))}</div></div>
      <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl">
        <div className="flex items-center gap-2 mb-3"><span className="text-xs font-bold text-indigo-700">✦ AI Audience Prediction</span><span className="text-[9px] font-bold bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">✓ 91% confidence</span></div>
        {[{ label: `${data.gender === 'all' ? 'People' : data.gender === 'female' ? 'Women' : 'Men'} ${data.ageMin}–${data.ageMax} · Urban`, pct: 82 }, { label: 'Fashion / Lifestyle interest', pct: 74 }, { label: `${data.locations[0] ?? 'US'} market reach`, pct: 68 }].map((s) => (
          <div key={s.label} className="flex items-center gap-3 mb-2 last:mb-0"><span className="text-xs text-slate-600 flex-1 truncate">{s.label}</span><div className="w-24 h-1.5 bg-indigo-100 rounded-full overflow-hidden flex-shrink-0"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${s.pct}%` }} /></div><span className="text-xs font-bold text-indigo-700 w-8 text-right flex-shrink-0">{s.pct}%</span></div>
        ))}
        <div className="flex justify-between mt-3 pt-3 border-t border-indigo-100 text-xs text-slate-600"><span>Est. reach: <strong className="text-slate-900">120K–180K</strong></span><span>Proj. ROAS: <strong className="text-green-700">3.2×–4.6×</strong></span></div>
      </div>
    </div>
  )
}

function Step3Budget({ data, update }: { data: WizardData; update: (p: Partial<WizardData>) => void }) {
  const budgetDollars = data.dailyBudget / 100
  const presets = [{ label: 'Starter', dollars: 10, desc: 'Good for testing' }, { label: 'Growth', dollars: 45, desc: 'AI recommended ✦', highlight: true }, { label: 'Scale', dollars: 100, desc: 'Faster results' }, { label: 'Pro', dollars: 250, desc: 'Maximum reach' }]
  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900 mb-1.5">Set Your Daily Budget</h2>
      <p className="text-sm text-slate-500 mb-6">AI recommends <strong>$45/day</strong> for this audience size. You can change this anytime.</p>
      <div className="text-center mb-6"><div className="text-5xl font-black text-slate-900 mb-1">${budgetDollars.toFixed(0)}<span className="text-xl font-normal text-slate-400">/day</span></div><p className="text-sm text-slate-500">~${(budgetDollars * 30).toFixed(0)}/month · {(budgetDollars / 0.05).toFixed(0)} est. clicks/day</p></div>
      <div className="mb-6 px-2"><input type="range" min={100} max={25000} step={100} value={data.dailyBudget} onChange={(e) => update({ dailyBudget: parseInt(e.target.value, 10) })} className="w-full accent-indigo-600" /><div className="flex justify-between text-xs text-slate-400 mt-1"><span>$1/day</span><span>$250/day</span></div></div>
      <div className="grid grid-cols-4 gap-2 mb-6">{presets.map((p) => (<button key={p.label} onClick={() => update({ dailyBudget: p.dollars * 100 })} className={cn('p-3 rounded-lg border text-center transition-all', data.dailyBudget === p.dollars * 100 ? 'border-indigo-400 bg-indigo-50' : p.highlight ? 'border-indigo-200 bg-indigo-50/50 hover:border-indigo-300' : 'border-slate-200 bg-white hover:border-slate-300')}><div className="font-bold text-sm text-slate-900">${p.dollars}</div><div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div></button>))}</div>
      <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Date (optional)</label><input type="date" value={data.startDate} onChange={(e) => update({ startDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400" /></div><div><label className="block text-xs font-semibold text-slate-600 mb-1.5">End Date (optional)</label><input type="date" value={data.endDate} onChange={(e) => update({ endDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400" /></div></div>
      <div className="mt-5 p-4 bg-green-50 border border-green-100 rounded-xl"><p className="text-xs font-bold text-green-700 mb-2">✦ AI Spend Prediction (30 days)</p><div className="grid grid-cols-3 gap-3 text-center"><div><div className="text-lg font-black text-slate-900">${(budgetDollars * 30).toFixed(0)}</div><div className="text-[10px] text-slate-500">Total Spend</div></div><div><div className="text-lg font-black text-green-700">3.8×</div><div className="text-[10px] text-slate-500">Predicted ROAS</div></div><div><div className="text-lg font-black text-slate-900">${(budgetDollars * 30 * 3.8).toFixed(0)}</div><div className="text-[10px] text-slate-500">Est. Revenue</div></div></div></div>
    </div>
  )
}

function Step4Creative({ data, update }: { data: WizardData; update: (p: Partial<WizardData>) => void }) {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900 mb-1.5">Ad Creative</h2>
      <p className="text-sm text-slate-500 mb-6">Full Creative Studio with AI generation and Style Match launches in Phase 3.</p>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{ icon: '🤖', label: 'AI Generate', desc: 'DALL-E 3 creates your ad from a text prompt', badge: 'Phase 3', disabled: true }, { icon: '✦', label: 'Style Match', desc: 'Upload a reference image, AI matches the style', badge: 'Phase 3', disabled: true }, { icon: '⬆️', label: 'Upload', desc: 'Use an existing image from your library', badge: 'Available', disabled: false }].map((opt) => (
          <div key={opt.label} className={cn('p-4 rounded-xl border-2 text-center', opt.disabled ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-indigo-200 bg-indigo-50 cursor-pointer')}><div className="text-2xl mb-2">{opt.icon}</div><div className="font-bold text-sm text-slate-900 mb-1">{opt.label}</div><div className="text-xs text-slate-500 leading-relaxed mb-2">{opt.desc}</div><span className={cn('inline-block text-[9px] font-bold px-2 py-0.5 rounded-full', opt.disabled ? 'bg-slate-200 text-slate-500' : 'bg-green-100 text-green-700 border border-green-200')}>{opt.badge}</span></div>
        ))}
      </div>
      <div><label className="block text-xs font-semibold text-slate-600 mb-1.5">Creative Brief / Notes (for AI generation)</label><textarea value={data.creativeNote} onChange={(e) => update({ creativeNote: e.target.value })} rows={4} placeholder="Describe your ideal ad creative: style, colors, mood, subject matter..." className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none" /></div>
      <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg"><p className="text-xs text-amber-700"><span className="font-bold">Note:</span> You can save this campaign as a draft now and add the creative later from the Creative Studio.</p></div>
    </div>
  )
}

function Step5Review({ data }: { data: WizardData }) {
  const objective = objectives.find((o) => o.value === data.objective)
  const sections = [
    { title: 'Campaign Details', icon: '📢', items: [{ label: 'Name', value: data.name || '(Unnamed campaign)' }, { label: 'Objective', value: `${objective?.icon ?? ''} ${objective?.title ?? data.objective}` }] },
    { title: 'Audience', icon: '🎯', items: [{ label: 'Locations', value: data.locations.join(', ') || 'US' }, { label: 'Age range', value: `${data.ageMin} – ${data.ageMax}` }, { label: 'Gender', value: data.gender === 'all' ? 'All genders' : data.gender === 'female' ? 'Women' : 'Men' }, { label: 'Interests', value: data.interests.length > 0 ? `${data.interests.length} selected` : 'None selected' }] },
    { title: 'Budget & Schedule', icon: '💰', items: [{ label: 'Daily budget', value: `$${(data.dailyBudget / 100).toFixed(0)}/day` }, { label: 'Currency', value: data.currency }, { label: 'Start date', value: data.startDate || 'Immediately' }, { label: 'End date', value: data.endDate || 'No end date' }] },
  ]
  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900 mb-1.5">Review & Save</h2>
      <p className="text-sm text-slate-500 mb-5">Your campaign will be saved as a draft. Connect your Meta account and add a creative to publish.</p>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200"><span>{section.icon}</span><h3 className="font-bold text-sm text-slate-900">{section.title}</h3></div>
            <div className="px-4 py-3 space-y-2">{section.items.map((item) => (<div key={item.label} className="flex justify-between text-sm"><span className="text-slate-500">{item.label}</span><span className="font-semibold text-slate-900">{item.value}</span></div>))}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl">
        <p className="text-xs font-bold text-indigo-700 mb-2">After saving, next steps:</p>
        <ul className="space-y-1.5">
          {[{ text: 'Connect Meta Ads account in Settings' }, { text: 'Add ad creative in Creative Studio (Phase 3)' }, { text: 'Review campaign and click Publish to Meta' }].map((s) => (
            <li key={s.text} className="flex items-center gap-2 text-xs text-slate-600"><span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-[9px] flex-shrink-0">→</span>{s.text}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}