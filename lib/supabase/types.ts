// ─── Existing types ────────────────────────────────────────────────────────

export type Plan = 'free' | 'pro' | 'business'
export type ContentType = 'video' | 'post' | 'stories' | 'ad'
export type Platform = 'telegram' | 'instagram' | 'tiktok' | 'vk' | 'yandex' | 'google' | 'meta' | 'mytarget'
export type ContentStatus = 'draft' | 'generated' | 'approved' | 'scheduled' | 'published' | 'failed'
export type ScheduleStatus = 'pending' | 'processing' | 'published' | 'failed'
export type Tone = 'friendly' | 'expert' | 'viral' | 'premium'
export type Language = 'ru' | 'uz' | 'en'

export interface User {
  id: string
  full_name: string
  plan: Plan
  ai_tokens_used: number
  created_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  niche: string
  description: string
  audience: string
  tone: Tone
  language: Language
  products: string[]
  logo_url?: string
  is_active: boolean
  created_at: string
}

export interface Content {
  id: string
  project_id: string
  type: ContentType
  platform: Platform
  platforms?: Platform[]
  goal: string
  title: string
  idea: string
  hook: string
  script: { scene: number; text: string; duration: string }[]
  voiceover: string
  screen_text: string
  caption: string
  hashtags: string[]
  cta: string
  video_prompt: string
  source_image_url?: string
  status: ContentStatus
  ai_model: string
  ai_tokens: number
  ai_score?: number
  created_at: string
  updated_at: string
}

export interface ScheduledPost {
  id: string
  content_id: string
  platform: Platform
  scheduled_at: string
  published_at?: string
  status: ScheduleStatus
  error_message?: string
  retry_count: number
  telegram_message_id?: number
}

export interface Integration {
  id: string
  user_id: string
  project_id?: string
  platform: Platform
  channel_id: string
  channel_name: string
  is_active: boolean
  last_used_at?: string
  created_at: string
}

// ─── New Ad types ──────────────────────────────────────────────────────────

export type AdPlatformStatus = 'active' | 'inactive' | 'warning' | 'expired'
export type AdCampaignStatus = 'draft' | 'active' | 'paused' | 'ab_test' | 'completed' | 'warning'
export type AdCreativeStatus = 'draft' | 'active' | 'paused' | 'winner' | 'failed'
export type AdReportType = 'weekly' | 'monthly' | 'custom'
export type AdReportStatus = 'draft' | 'sent' | 'live' | 'scheduled'
export type AdRecommendationType = 'urgent' | 'opportunity' | 'idea' | 'antifraud'
export type AdRecommendationStatus = 'pending' | 'applied' | 'dismissed'
export type AdRuleConditionOp = 'lt' | 'gt' | 'lte' | 'gte' | 'eq'
export type AdRuleActionType = 'pause' | 'stop' | 'increase_budget' | 'decrease_budget' | 'notify'

export interface AdPlatform {
  id: string
  user_id: string
  project_id?: string
  name: string
  platform_key: string
  region: 'cis' | 'global'
  color: string
  abbr: string
  status: AdPlatformStatus
  access_token?: string
  account_id?: string
  account_name?: string
  token_expires_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AdCampaign {
  id: string
  user_id: string
  project_id?: string
  landing_id?: string
  name: string
  description?: string
  goal?: string
  status: AdCampaignStatus
  platforms: string[]
  budget_total?: number
  budget_spent: number
  impressions: number
  clicks: number
  leads: number
  sales: number
  revenue: number
  ctr: number
  cpl: number
  roas: number
  starts_at?: string
  ends_at?: string
  created_at: string
  updated_at: string
}

export interface AdCreative {
  id: string
  user_id: string
  campaign_id?: string
  project_id?: string
  platform: string
  format: string
  title?: string
  caption?: string
  image_url?: string
  video_url?: string
  status: AdCreativeStatus
  ctr: number
  impressions: number
  clicks: number
  is_winner: boolean
  ai_generated: boolean
  scheduled_at?: string
  published_at?: string
  created_at: string
  updated_at: string
}

export interface AdAutoRule {
  id: string
  user_id: string
  project_id?: string
  campaign_id?: string
  name: string
  condition_field: string
  condition_op: AdRuleConditionOp
  condition_value: number
  action_type: AdRuleActionType
  action_value?: number
  is_active: boolean
  triggered_count: number
  last_triggered_at?: string
  created_at: string
}

export interface AdAudience {
  id: string
  user_id: string
  project_id?: string
  name: string
  type: 'custom' | 'lookalike' | 'retargeting' | 'geo'
  size: number
  description?: string
  platforms: string[]
  created_at: string
}

export interface AdReport {
  id: string
  user_id: string
  project_id?: string
  title: string
  period_start: string
  period_end: string
  type: AdReportType
  status: AdReportStatus
  total_spend: number
  total_revenue: number
  total_roas: number
  total_leads: number
  total_sales: number
  white_label_name?: string
  white_label_email?: string
  logo_url?: string
  sent_at?: string
  created_at: string
}

export interface AdRecommendation {
  id: string
  user_id: string
  campaign_id?: string
  type: AdRecommendationType
  title: string
  description?: string
  action_type?: string
  action_value?: Record<string, unknown>
  status: AdRecommendationStatus
  created_at: string
}
