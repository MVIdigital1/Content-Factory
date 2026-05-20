export type Plan = "free" | "pro" | "business";
export type ContentType = "video" | "post" | "stories" | "ad";
export type Platform = "telegram" | "instagram" | "tiktok";
export type ContentStatus = "draft" | "generated" | "approved" | "scheduled" | "published" | "failed";
export type ScheduleStatus = "pending" | "processing" | "published" | "failed";
export type CampaignStatus = "generating" | "ready" | "running" | "completed";
export type Tone = "friendly" | "expert" | "viral" | "premium";
export type Language = "ru" | "uz" | "en";

export interface User {
  id: string;
  full_name: string;
  plan: Plan;
  ai_tokens_used: number;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  niche: string;
  description: string;
  audience: string;
  tone: Tone;
  language: Language;
  products: string[];
  logo_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Content {
  id: string;
  project_id: string;
  type: ContentType;
  platform: Platform;
  goal: string;
  title: string;
  idea: string;
  hook: string;
  script: { scene: number; text: string; duration: string }[];
  voiceover: string;
  screen_text: string;
  caption: string;
  hashtags: string[];
  cta: string;
  video_prompt: string;
  source_image_url?: string;
  status: ContentStatus;
  ai_model: string;
  ai_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledPost {
  id: string;
  content_id: string;
  platform: Platform;
  scheduled_at: string;
  published_at?: string;
  status: ScheduleStatus;
  error_message?: string;
  retry_count: number;
  telegram_message_id?: number;
}

export interface Integration {
  id: string;
  user_id: string;
  project_id?: string;
  platform: Platform;
  channel_id: string;
  channel_name: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  project_id: string;
  name: string;
  source_image_url?: string;
  total_posts: number;
  status: CampaignStatus;
  starts_at: string;
  created_at: string;
}
