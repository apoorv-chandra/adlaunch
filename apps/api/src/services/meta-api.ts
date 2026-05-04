import {
  META_GRAPH_BASE,
  OBJECTIVE_TO_META,
  META_TO_OBJECTIVE,
  META_STATUS_TO_INTERNAL,
  STATUS_TO_META,
  GENDER_TO_META,
  OBJECTIVE_OPTIMIZATION_GOALS,
  OPTIMIZATION_BILLING_EVENTS,
  CTA_TO_META,
  META_ERROR_CODES,
} from '../lib/meta-constants'

export class MetaApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly type?: string,
    public readonly fbtraceId?: string
  ) {
    super(message)
    this.name = 'MetaApiError'
  }
  get isRateLimit(): boolean { return this.code === META_ERROR_CODES.RATE_LIMIT }
  get isTokenExpired(): boolean { return this.code === META_ERROR_CODES.INVALID_ACCESS_TOKEN || this.code === META_ERROR_CODES.TOKEN_EXPIRED }
}

async function metaFetch<T>(path: string, options: { method?: 'GET' | 'POST' | 'DELETE'; params?: Record<string, string>; body?: Record<string, unknown>; accessToken: string }): Promise<T> {
  const { method = 'GET', params = {}, body, accessToken } = options
  const searchParams = new URLSearchParams({ access_token: accessToken, ...params })
  const url = method === 'GET' ? `${META_GRAPH_BASE}${path}?${searchParams.toString()}` : `${META_GRAPH_BASE}${path}`
  const fetchOptions: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (method !== 'GET' && body) {
    const formData = new URLSearchParams()
    formData.set('access_token', accessToken)
    Object.entries(body).forEach(([k, v]) => { formData.set(k, typeof v === 'string' ? v : JSON.stringify(v)) })
    fetchOptions.body = formData.toString()
    fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
  }
  const res = await fetch(url, fetchOptions)
  const data = await res.json() as T & { error?: { message: string; code: number; type: string; fbtrace_id: string } }
  if ('error' in data && data.error) { throw new MetaApiError(data.error.code, data.error.message, data.error.type, data.error.fbtrace_id) }
  return data
}

export interface MetaCampaign { id: string; name: string; objective: string; status: string; effective_status: string; daily_budget?: string; lifetime_budget?: string; start_time?: string; stop_time?: string; created_time: string; updated_time: string }
export interface MetaAdSet { id: string; name: string; campaign_id: string; status: string; effective_status: string; daily_budget?: string; targeting: object; optimization_goal: string; billing_event: string; created_time: string; updated_time: string }
export interface MetaAd { id: string; name: string; adset_id: string; status: string; effective_status: string; creative: { id: string }; created_time: string; updated_time: string }
export interface MetaAdCreative { id: string; name: string }
export interface MetaInsights { impressions: string; clicks: string; spend: string; reach: string; frequency: string; cpc?: string; cpm?: string; ctr?: string; actions?: Array<{ action_type: string; value: string }>; action_values?: Array<{ action_type: string; value: string }>; date_start: string; date_stop: string }

export async function createMetaCampaign(adAccountId: string, accessToken: string, data: { name: string; objective: string; dailyBudgetCents?: number; lifetimeBudgetCents?: number; startTime?: Date; endTime?: Date }): Promise<{ id: string }> {
  const metaObjective = OBJECTIVE_TO_META[data.objective] ?? 'OUTCOME_AWARENESS'
  const body: Record<string, unknown> = { name: data.name, objective: metaObjective, status: 'PAUSED', special_ad_categories: '[]' }
  if (data.dailyBudgetCents) body['daily_budget'] = String(data.dailyBudgetCents)
  if (data.lifetimeBudgetCents) body['lifetime_budget'] = String(data.lifetimeBudgetCents)
  if (data.startTime) body['start_time'] = data.startTime.toISOString()
  if (data.endTime) body['stop_time'] = data.endTime.toISOString()
  return metaFetch<{ id: string }>(`/act_${adAccountId}/campaigns`, { method: 'POST', body, accessToken })
}

export async function updateMetaCampaign(campaignId: string, accessToken: string, data: { name?: string; status?: string; dailyBudgetCents?: number }): Promise<{ success: boolean }> {
  const body: Record<string, unknown> = {}
  if (data.name) body['name'] = data.name
  if (data.status) body['status'] = STATUS_TO_META[data.status] ?? 'PAUSED'
  if (data.dailyBudgetCents) body['daily_budget'] = String(data.dailyBudgetCents)
  return metaFetch<{ success: boolean }>(`/${campaignId}`, { method: 'POST', body, accessToken })
}

export async function deleteMetaCampaign(campaignId: string, accessToken: string): Promise<{ success: boolean }> {
  return metaFetch<{ success: boolean }>(`/${campaignId}`, { method: 'DELETE', accessToken })
}

export async function getMetaCampaign(campaignId: string, accessToken: string): Promise<MetaCampaign> {
  return metaFetch<MetaCampaign>(`/${campaignId}`, { accessToken, params: { fields: 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time' } })
}

export async function listMetaCampaigns(adAccountId: string, accessToken: string, status?: string): Promise<{ data: MetaCampaign[] }> {
  const params: Record<string, string> = { fields: 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time,updated_time', limit: '50' }
  if (status) params['effective_status'] = `["${status}"]`
  return metaFetch<{ data: MetaCampaign[] }>(`/act_${adAccountId}/campaigns`, { accessToken, params })
}

export interface CreateMetaAdSetData {
  name: string; campaignId: string; objective: string; dailyBudgetCents?: number
  targeting: { locations: string[]; ageMin: number; ageMax: number; genders: string[]; interests: string[]; behaviors: string[]; customAudiences?: string[] }
  startTime?: Date; endTime?: Date; placements?: object
}

export async function createMetaAdSet(adAccountId: string, accessToken: string, data: CreateMetaAdSetData): Promise<{ id: string }> {
  const metaObjective = OBJECTIVE_TO_META[data.objective] ?? 'OUTCOME_AWARENESS'
  const optimizationGoal = OBJECTIVE_OPTIMIZATION_GOALS[metaObjective] ?? 'REACH'
  const billingEvent = OPTIMIZATION_BILLING_EVENTS[optimizationGoal] ?? 'IMPRESSIONS'
  const targeting: Record<string, unknown> = { geo_locations: { countries: data.targeting.locations.length > 0 ? data.targeting.locations : ['US'] }, age_min: data.targeting.ageMin, age_max: data.targeting.ageMax }
  const genders = GENDER_TO_META[data.targeting.genders[0] ?? 'all']
  if (genders && genders.length > 0) targeting['genders'] = genders
  if (data.targeting.interests.length > 0) targeting['flexible_spec'] = [{ interests: data.targeting.interests.map((id) => ({ id })) }]
  if (data.targeting.behaviors.length > 0) targeting['behaviors'] = data.targeting.behaviors.map((id) => ({ id }))
  if (data.targeting.customAudiences && data.targeting.customAudiences.length > 0) targeting['custom_audiences'] = data.targeting.customAudiences.map((id) => ({ id }))
  const body: Record<string, unknown> = { name: data.name, campaign_id: data.campaignId, optimization_goal: optimizationGoal, billing_event: billingEvent, targeting: JSON.stringify(targeting), status: 'PAUSED' }
  if (data.dailyBudgetCents) body['daily_budget'] = String(data.dailyBudgetCents)
  if (data.startTime) body['start_time'] = data.startTime.toISOString()
  if (data.endTime) body['end_time'] = data.endTime.toISOString()
  return metaFetch<{ id: string }>(`/act_${adAccountId}/adsets`, { method: 'POST', body, accessToken })
}

export async function updateMetaAdSet(adSetId: string, accessToken: string, data: { name?: string; status?: string; dailyBudgetCents?: number }): Promise<{ success: boolean }> {
  const body: Record<string, unknown> = {}
  if (data.name) body['name'] = data.name
  if (data.status) body['status'] = STATUS_TO_META[data.status] ?? 'PAUSED'
  if (data.dailyBudgetCents) body['daily_budget'] = String(data.dailyBudgetCents)
  return metaFetch<{ success: boolean }>(`/${adSetId}`, { method: 'POST', body, accessToken })
}

export async function listMetaAdSets(campaignId: string, accessToken: string): Promise<{ data: MetaAdSet[] }> {
  return metaFetch<{ data: MetaAdSet[] }>(`/${campaignId}/adsets`, { accessToken, params: { fields: 'id,name,campaign_id,status,effective_status,daily_budget,targeting,optimization_goal,billing_event,created_time,updated_time' } })
}

export interface CreateMetaAdCreativeData { name: string; pageId: string; imageUrl: string; headline: string; description?: string; callToAction: string; destinationUrl: string; adFormat?: string }

export async function createMetaAdCreative(adAccountId: string, accessToken: string, data: CreateMetaAdCreativeData): Promise<MetaAdCreative> {
  const metaCta = CTA_TO_META[data.callToAction] ?? 'LEARN_MORE'
  const objectStorySpec = { page_id: data.pageId, link_data: { image_url: data.imageUrl, link: data.destinationUrl, name: data.headline, description: data.description ?? '', call_to_action: { type: metaCta, value: { link: data.destinationUrl } } } }
  const body: Record<string, unknown> = { name: data.name, object_story_spec: JSON.stringify(objectStorySpec) }
  return metaFetch<MetaAdCreative>(`/act_${adAccountId}/adcreatives`, { method: 'POST', body, accessToken })
}

export async function createMetaAd(adAccountId: string, accessToken: string, data: { name: string; adSetId: string; creativeId: string }): Promise<MetaAd> {
  const body = { name: data.name, adset_id: data.adSetId, creative: JSON.stringify({ creative_id: data.creativeId }), status: 'PAUSED' }
  return metaFetch<MetaAd>(`/act_${adAccountId}/ads`, { method: 'POST', body, accessToken })
}

export async function updateMetaAdStatus(adId: string, accessToken: string, status: 'ACTIVE' | 'PAUSED' | 'DELETED'): Promise<{ success: boolean }> {
  return metaFetch<{ success: boolean }>(`/${adId}`, { method: 'POST', body: { status }, accessToken })
}

export interface PublishCampaignResult { metaCampaignId: string; metaAdSetId: string; metaAdCreativeId: string; metaAdId: string }

export async function publishFullCampaignToMeta(adAccountId: string, accessToken: string, payload: { campaign: { name: string; objective: string; dailyBudgetCents?: number; startTime?: Date; endTime?: Date }; adSet: { name: string; dailyBudgetCents?: number; targeting: CreateMetaAdSetData['targeting']; startTime?: Date; endTime?: Date }; creative: CreateMetaAdCreativeData; ad: { name: string } }): Promise<PublishCampaignResult> {
  const { id: metaCampaignId } = await createMetaCampaign(adAccountId, accessToken, payload.campaign)
  const { id: metaAdSetId } = await createMetaAdSet(adAccountId, accessToken, { ...payload.adSet, campaignId: metaCampaignId, objective: payload.campaign.objective })
  const { id: metaAdCreativeId } = await createMetaAdCreative(adAccountId, accessToken, payload.creative)
  const { id: metaAdId } = await createMetaAd(adAccountId, accessToken, { name: payload.ad.name, adSetId: metaAdSetId, creativeId: metaAdCreativeId })
  return { metaCampaignId, metaAdSetId, metaAdCreativeId, metaAdId }
}

export async function getCampaignInsights(campaignId: string, accessToken: string, dateRange: { since: string; until: string }): Promise<MetaInsights[]> {
  const result = await metaFetch<{ data: MetaInsights[] }>(`/${campaignId}/insights`, { accessToken, params: { fields: 'impressions,clicks,spend,reach,frequency,cpc,cpm,ctr,actions,action_values,date_start,date_stop', time_range: JSON.stringify(dateRange), time_increment: '1', level: 'campaign' } })
  return result.data
}

export async function getAdAccountInsights(adAccountId: string, accessToken: string, dateRange: { since: string; until: string }): Promise<MetaInsights[]> {
  const result = await metaFetch<{ data: MetaInsights[] }>(`/act_${adAccountId}/insights`, { accessToken, params: { fields: 'impressions,clicks,spend,reach,frequency,cpc,cpm,ctr,actions,action_values,date_start,date_stop', time_range: JSON.stringify(dateRange), time_increment: '1', level: 'campaign', breakdowns: 'campaign_id,campaign_name' } })
  return result.data
}

export async function syncCampaignStatusFromMeta(campaignId: string, accessToken: string): Promise<{ internalStatus: string; metaStatus: string; effectiveStatus: string }> {
  const campaign = await getMetaCampaign(campaignId, accessToken)
  return { internalStatus: META_STATUS_TO_INTERNAL[campaign.effective_status] ?? 'paused', metaStatus: campaign.status, effectiveStatus: campaign.effective_status }
}

// Re-export unused imports to satisfy TypeScript
export { META_TO_OBJECTIVE }