'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AdCampaign, AdPlatform, AdAutoRule, AdAudience, AdReport, AdRecommendation, AdCreative } from '@/lib/supabase/types'

// Projects
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects')
      return res.ok ? res.json() : []
    },
  })
}

// Campaigns
export function useAdCampaigns(projectId?: string) {
  return useQuery<AdCampaign[]>({
    queryKey: ['ad_campaigns', projectId],
    queryFn: async () => {
      const url = projectId ? `/api/campaigns?project_id=${projectId}` : '/api/campaigns'
      const res = await fetch(url)
      return res.ok ? res.json() : []
    },
  })
}

export function useCreateAdCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<AdCampaign>) => {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Ошибка создания кампании')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_campaigns'] }),
  })
}

export function useUpdateAdCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<AdCampaign> & { id: string }) => {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Ошибка обновления')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_campaigns'] }),
  })
}

export function useDeleteAdCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Ошибка удаления')
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
      const url = projectId ? `/api/ad-platforms?project_id=${projectId}` : '/api/ad-platforms'
      const res = await fetch(url)
      return res.ok ? res.json() : []
    },
  })
}

export function useConnectPlatform() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<AdPlatform>) => {
      const res = await fetch('/api/ad-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, is_active: true }),
      })
      if (!res.ok) throw new Error('Ошибка подключения')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_platforms'] }),
  })
}

export function useDisconnectPlatform() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ad-platforms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })
      if (!res.ok) throw new Error('Ошибка отключения')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_platforms'] }),
  })
}

// Auto rules
export function useAdAutoRules(projectId?: string) {
  return useQuery<AdAutoRule[]>({
    queryKey: ['ad_auto_rules', projectId],
    queryFn: async () => {
      const url = projectId ? `/api/ad-auto-rules?project_id=${projectId}` : '/api/ad-auto-rules'
      const res = await fetch(url)
      return res.ok ? res.json() : []
    },
  })
}

export function useCreateAutoRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<AdAutoRule>) => {
      const res = await fetch('/api/ad-auto-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Ошибка')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_auto_rules'] }),
  })
}

export function useToggleAutoRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await fetch(`/api/ad-auto-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active }),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_auto_rules'] }),
  })
}

export function useDeleteAutoRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/ad-auto-rules/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_auto_rules'] }),
  })
}

// Audiences
export function useAdAudiences(projectId?: string) {
  return useQuery<AdAudience[]>({
    queryKey: ['ad_audiences', projectId],
    queryFn: async () => {
      const url = projectId ? `/api/ad-audiences?project_id=${projectId}` : '/api/ad-audiences'
      const res = await fetch(url)
      return res.ok ? res.json() : []
    },
  })
}

// Reports
export function useAdReports(projectId?: string) {
  return useQuery<AdReport[]>({
    queryKey: ['ad_reports', projectId],
    queryFn: async () => {
      const url = projectId ? `/api/ad-reports?project_id=${projectId}` : '/api/ad-reports'
      const res = await fetch(url)
      return res.ok ? res.json() : []
    },
  })
}

export function useCreateAdReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<AdReport>) => {
      const res = await fetch('/api/ad-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Ошибка')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_reports'] }),
  })
}

// Recommendations
export function useAdRecommendations() {
  return useQuery<AdRecommendation[]>({
    queryKey: ['ad_recommendations'],
    queryFn: async () => {
      const res = await fetch('/api/ad-recommendations')
      return res.ok ? res.json() : []
    },
  })
}

export function useUpdateRecommendation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'applied' | 'dismissed' }) => {
      await fetch(`/api/ad-recommendations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_recommendations'] }),
  })
}

// Creatives
export function useAdCreatives(projectId?: string, campaignId?: string) {
  return useQuery<AdCreative[]>({
    queryKey: ['ad_creatives', projectId, campaignId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (projectId) params.set('project_id', projectId)
      if (campaignId) params.set('campaign_id', campaignId)
      const res = await fetch(`/api/ad-creatives?${params}`)
      return res.ok ? res.json() : []
    },
  })
}

export function useCreateAdCreative() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<AdCreative>) => {
      const res = await fetch('/api/ad-creatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Ошибка')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad_creatives'] }),
  })
}
