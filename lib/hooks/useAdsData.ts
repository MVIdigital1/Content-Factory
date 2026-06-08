'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { AdCampaign, AdPlatform, AdAutoRule, AdAudience, AdReport, AdRecommendation, AdCreative } from '@/lib/supabase/types'

const sb = () => createClient()

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await sb().auth.getUser()
  return user?.id ?? null
}

// Projects
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const uid = await getUserId()
      if (!uid) return []
      const { data } = await sb().from('projects').select('id,name,logo_url,niche').eq('user_id', uid).eq('is_active', true).order('created_at', { ascending: false })
      return data ?? []
    },
  })
}

// Campaigns
export function useAdCampaigns(projectId?: string) {
  return useQuery<AdCampaign[]>({
    queryKey: ['ad_campaigns', projectId],
    queryFn: async () => {
      const uid = await getUserId()
      if (!uid) return []
      let q = sb().from('ad_campaigns').select('*').eq('user_id', uid).order('created_at', { ascending: false })
      if (projectId) q = (q as any).eq('project_id', projectId)
      const { data } = await q
      return data ?? []
    },
  })
}

export function useCreateAdCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<AdCampaign>) => {
      const uid = await getUserId()
      if (!uid) throw new Error('Not authenticated')
      const { data, error } = await sb().from('ad_campaigns').insert({ ...payload, user_id: uid }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_campaigns'] }),
  })
}

export function useUpdateAdCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<AdCampaign> & { id: string }) => {
      const { data, error } = await sb().from('ad_campaigns').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_campaigns'] }),
  })
}

export function useDeleteAdCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('ad_campaigns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_campaigns'] }),
  })
}

// KPIs computed from campaigns
export function useAdKPIs(projectId?: string) {
  const { data: campaigns = [] } = useAdCampaigns(projectId)
  const active = campaigns.filter(c => ['active','paused','ab_test'].includes(c.status))
  const totalSpend = active.reduce((s, c) => s + (c.budget_spent ?? 0), 0)
  const totalLeads = active.reduce((s, c) => s + (c.leads ?? 0), 0)
  const totalRevenue = active.reduce((s, c) => s + (c.revenue ?? 0), 0)
  const avgCtr = active.length ? active.reduce((s, c) => s + (c.ctr ?? 0), 0) / active.length : 0
  const avgCpl = active.length ? active.reduce((s, c) => s + (c.cpl ?? 0), 0) / active.length : 0
  const avgRoas = totalSpend > 0 ? (totalRevenue / totalSpend) * 100 : 0
  return [
    { value: totalSpend > 0 ? `₽${Math.round(totalSpend/1000)}k` : '—', label: 'Расход / мес', delta: '', positive: true },
    { value: avgCtr > 0 ? `${avgCtr.toFixed(1)}%` : '—', label: 'CTR', delta: '', positive: avgCtr >= 2 },
    { value: avgCpl > 0 ? `₽${Math.round(avgCpl)}` : '—', label: 'CPL', delta: '', positive: avgCpl <= 200 },
    { value: avgRoas > 0 ? `${Math.round(avgRoas)}%` : '—', label: 'ROAS', delta: '', positive: avgRoas >= 200 },
    { value: totalLeads > 0 ? String(totalLeads) : '—', label: 'Заявок / мес', delta: '', positive: true },
  ]
}

// Budget
export function useBudgetSummary(projectId?: string) {
  const { data: campaigns = [] } = useAdCampaigns(projectId)
  const spent = campaigns.reduce((s, c) => s + (c.budget_spent ?? 0), 0)
  const total = campaigns.reduce((s, c) => s + (c.budget_total ?? 0), 0)
  const pct = total > 0 ? Math.round((spent / total) * 100) : 0
  return { spent, total, pct, spentLabel: `₽${Math.round(spent/1000)}k`, totalLabel: `₽${Math.round(total/1000)}k` }
}

// Platforms
export function useAdPlatforms(projectId?: string) {
  return useQuery<AdPlatform[]>({
    queryKey: ['ad_platforms', projectId],
    queryFn: async () => {
      const uid = await getUserId()
      if (!uid) return []
      let q = sb().from('ad_platforms').select('*').eq('user_id', uid).order('created_at')
      if (projectId) q = (q as any).eq('project_id', projectId)
      const { data } = await q
      return data ?? []
    },
  })
}

export function useConnectPlatform() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<AdPlatform>) => {
      const uid = await getUserId()
      if (!uid) throw new Error('Not authenticated')
      const { data, error } = await sb().from('ad_platforms').upsert({ ...payload, user_id: uid, is_active: true, updated_at: new Date().toISOString() }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_platforms'] }),
  })
}

export function useDisconnectPlatform() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('ad_platforms').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_platforms'] }),
  })
}

// Auto rules
export function useAdAutoRules(projectId?: string) {
  return useQuery<AdAutoRule[]>({
    queryKey: ['ad_auto_rules', projectId],
    queryFn: async () => {
      const uid = await getUserId()
      if (!uid) return []
      let q = sb().from('ad_auto_rules').select('*').eq('user_id', uid).order('created_at')
      if (projectId) q = (q as any).eq('project_id', projectId)
      const { data } = await q
      return data ?? []
    },
  })
}

export function useCreateAutoRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<AdAutoRule>) => {
      const uid = await getUserId()
      if (!uid) throw new Error('Not authenticated')
      const { data, error } = await sb().from('ad_auto_rules').insert({ ...payload, user_id: uid }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_auto_rules'] }),
  })
}

export function useToggleAutoRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await sb().from('ad_auto_rules').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_auto_rules'] }),
  })
}

export function useDeleteAutoRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb().from('ad_auto_rules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_auto_rules'] }),
  })
}

// Audiences
export function useAdAudiences(projectId?: string) {
  return useQuery<AdAudience[]>({
    queryKey: ['ad_audiences', projectId],
    queryFn: async () => {
      const uid = await getUserId()
      if (!uid) return []
      let q = sb().from('ad_audiences').select('*').eq('user_id', uid).order('created_at')
      if (projectId) q = (q as any).eq('project_id', projectId)
      const { data } = await q
      return data ?? []
    },
  })
}

// Reports
export function useAdReports(projectId?: string) {
  return useQuery<AdReport[]>({
    queryKey: ['ad_reports', projectId],
    queryFn: async () => {
      const uid = await getUserId()
      if (!uid) return []
      let q = sb().from('ad_reports').select('*').eq('user_id', uid).order('created_at', { ascending: false })
      if (projectId) q = (q as any).eq('project_id', projectId)
      const { data } = await q
      return data ?? []
    },
  })
}

export function useCreateAdReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<AdReport>) => {
      const uid = await getUserId()
      if (!uid) throw new Error('Not authenticated')
      const { data, error } = await sb().from('ad_reports').insert({ ...payload, user_id: uid }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_reports'] }),
  })
}

// Recommendations
export function useAdRecommendations() {
  return useQuery<AdRecommendation[]>({
    queryKey: ['ad_recommendations'],
    queryFn: async () => {
      const uid = await getUserId()
      if (!uid) return []
      const { data } = await sb().from('ad_recommendations').select('*').eq('user_id', uid).eq('status', 'pending').order('created_at', { ascending: false })
      return data ?? []
    },
  })
}

export function useUpdateRecommendation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'applied' | 'dismissed' }) => {
      const { error } = await sb().from('ad_recommendations').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_recommendations'] }),
  })
}

// Creatives
export function useAdCreatives(projectId?: string, campaignId?: string) {
  return useQuery<AdCreative[]>({
    queryKey: ['ad_creatives', projectId, campaignId],
    queryFn: async () => {
      const uid = await getUserId()
      if (!uid) return []
      let q = sb().from('ad_creatives').select('*').eq('user_id', uid).order('created_at', { ascending: false })
      if (projectId) q = (q as any).eq('project_id', projectId)
      if (campaignId) q = (q as any).eq('campaign_id', campaignId)
      const { data } = await q
      return data ?? []
    },
  })
}

export function useCreateAdCreative() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<AdCreative>) => {
      const uid = await getUserId()
      if (!uid) throw new Error('Not authenticated')
      const { data, error } = await sb().from('ad_creatives').insert({ ...payload, user_id: uid }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_creatives'] }),
  })
}
