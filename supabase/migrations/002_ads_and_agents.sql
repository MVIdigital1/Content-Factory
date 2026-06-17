-- 002_ads_and_agents.sql
-- Запусти в Supabase → SQL Editor → New query → Run

-- ── Шаг 1: Добавляем колонки к уже существующим таблицам ─────────────────────
-- (IF NOT EXISTS — если колонка уже есть, пропустится без ошибки)

alter table public.ad_campaigns   add column if not exists user_id    uuid;
alter table public.ad_campaigns   add column if not exists project_id uuid;
alter table public.ad_campaigns   add column if not exists goal       text;
alter table public.ad_campaigns   add column if not exists product    text;
alter table public.ad_campaigns   add column if not exists audience   text;
alter table public.ad_campaigns   add column if not exists platforms  text[] default '{}';
alter table public.ad_campaigns   add column if not exists status     text default 'draft';
alter table public.ad_campaigns   add column if not exists budget_total  numeric(12,2);
alter table public.ad_campaigns   add column if not exists budget_spent  numeric(12,2) default 0;
alter table public.ad_campaigns   add column if not exists updated_at timestamptz default now();

alter table public.ad_creatives   add column if not exists user_id     uuid;
alter table public.ad_creatives   add column if not exists campaign_id uuid;
alter table public.ad_creatives   add column if not exists project_id  uuid;
alter table public.ad_creatives   add column if not exists platform    text;
alter table public.ad_creatives   add column if not exists format      text;
alter table public.ad_creatives   add column if not exists title       text;
alter table public.ad_creatives   add column if not exists hook        text;
alter table public.ad_creatives   add column if not exists caption     text;
alter table public.ad_creatives   add column if not exists status      text default 'draft';
alter table public.ad_creatives   add column if not exists ai_generated bool default true;
alter table public.ad_creatives   add column if not exists is_winner   bool default false;
alter table public.ad_creatives   add column if not exists ctr         numeric(5,2);
alter table public.ad_creatives   add column if not exists impressions bigint default 0;
alter table public.ad_creatives   add column if not exists clicks      bigint default 0;
alter table public.ad_creatives   add column if not exists updated_at  timestamptz default now();

alter table public.ad_platforms   add column if not exists user_id      uuid;
alter table public.ad_platforms   add column if not exists platform_key text;
alter table public.ad_platforms   add column if not exists name         text;
alter table public.ad_platforms   add column if not exists abbr         text;
alter table public.ad_platforms   add column if not exists color        text;
alter table public.ad_platforms   add column if not exists account_id   text;
alter table public.ad_platforms   add column if not exists access_token text;
alter table public.ad_platforms   add column if not exists is_active    bool default true;
alter table public.ad_platforms   add column if not exists status       text default 'active';
alter table public.ad_platforms   add column if not exists updated_at   timestamptz default now();

alter table public.ai_agents      add column if not exists user_id     uuid;
alter table public.ai_agents      add column if not exists project_id  uuid;
alter table public.ai_agents      add column if not exists name        text;
alter table public.ai_agents      add column if not exists type        text;
alter table public.ai_agents      add column if not exists description text;
alter table public.ai_agents      add column if not exists commands    text[] default '{}';
alter table public.ai_agents      add column if not exists is_active   bool default true;
alter table public.ai_agents      add column if not exists updated_at  timestamptz default now();

-- ── Шаг 2: Создаём таблицы которых нет совсем ────────────────────────────────

create table if not exists public.tasks (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid,
  project_id  uuid,
  campaign_id uuid,
  title       text not null,
  description text,
  status      text default 'todo',
  priority    text default 'medium',
  due_date    date,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists public.project_files (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid,
  project_id uuid,
  name       text not null,
  url        text not null,
  size       bigint,
  mime_type  text,
  created_at timestamptz default now()
);

create table if not exists public.profiles (
  id               uuid primary key,
  telegram_chat_id bigint,
  avatar_url       text,
  timezone         text default 'UTC',
  onboarding_done  bool default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── Шаг 3: Индексы ────────────────────────────────────────────────────────────

create index if not exists idx_ad_campaigns_user     on public.ad_campaigns(user_id);
create index if not exists idx_ad_campaigns_project  on public.ad_campaigns(project_id);
create index if not exists idx_ad_creatives_user     on public.ad_creatives(user_id);
create index if not exists idx_ad_creatives_project  on public.ad_creatives(project_id);
create index if not exists idx_ad_creatives_campaign on public.ad_creatives(campaign_id);
create index if not exists idx_ad_platforms_user     on public.ad_platforms(user_id);
create index if not exists idx_ai_agents_user        on public.ai_agents(user_id);

-- ── Шаг 4: RLS ───────────────────────────────────────────────────────────────

alter table public.ad_campaigns  enable row level security;
alter table public.ad_creatives  enable row level security;
alter table public.ad_platforms  enable row level security;
alter table public.ai_agents     enable row level security;
alter table public.tasks         enable row level security;
alter table public.project_files enable row level security;
alter table public.profiles      enable row level security;

-- ── Шаг 5: Политики (drop → create, чтобы не было конфликтов) ────────────────

drop policy if exists "Own ad_campaigns"   on public.ad_campaigns;
drop policy if exists "Own ad_creatives"   on public.ad_creatives;
drop policy if exists "Own ad_platforms"   on public.ad_platforms;
drop policy if exists "Own ai_agents"      on public.ai_agents;
drop policy if exists "Own tasks"          on public.tasks;
drop policy if exists "Own project_files"  on public.project_files;
drop policy if exists "Own profile"        on public.profiles;

create policy "Own ad_campaigns"   on public.ad_campaigns   for all using (auth.uid() = user_id);
create policy "Own ad_creatives"   on public.ad_creatives   for all using (auth.uid() = user_id);
create policy "Own ad_platforms"   on public.ad_platforms   for all using (auth.uid() = user_id);
create policy "Own ai_agents"      on public.ai_agents      for all using (auth.uid() = user_id);
create policy "Own tasks"          on public.tasks          for all using (auth.uid() = user_id);
create policy "Own project_files"  on public.project_files  for all using (auth.uid() = user_id);
create policy "Own profile"        on public.profiles       for all using (auth.uid() = id);
