-- ──────────────────────────────────────────────────────────────────────────────
-- 002_ads_and_agents.sql  (safe — IF NOT EXISTS everywhere)
-- ──────────────────────────────────────────────────────────────────────────────

-- ── 1. Create tables (skipped if they already exist) ─────────────────────────

create table if not exists public.ad_campaigns (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.users(id) on delete cascade not null,
  project_id    uuid references public.projects(id) on delete set null,
  name          text not null,
  goal          text,
  product       text,
  audience      text,
  platforms     text[] default '{}',
  status        text default 'draft',
  budget_total  numeric(12,2),
  budget_spent  numeric(12,2) default 0,
  starts_at     date,
  ends_at       date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.ad_creatives (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.users(id) on delete cascade not null,
  campaign_id   uuid references public.ad_campaigns(id) on delete set null,
  project_id    uuid references public.projects(id) on delete set null,
  platform      text not null,
  format        text not null,
  title         text,
  hook          text,
  caption       text,
  status        text default 'draft',
  ai_generated  bool default true,
  is_winner     bool default false,
  ctr           numeric(5,2),
  impressions   bigint default 0,
  clicks        bigint default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.ad_platforms (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.users(id) on delete cascade not null,
  platform_key  text not null,
  name          text,
  abbr          text,
  color         text,
  account_id    text,
  access_token  text,
  refresh_token text,
  token_expires_at timestamptz,
  is_active     bool default true,
  status        text default 'active',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.ai_agents (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.users(id) on delete cascade not null,
  project_id    uuid references public.projects(id) on delete set null,
  name          text not null,
  type          text,
  description   text,
  commands      text[] default '{}',
  is_active     bool default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.tasks (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.users(id) on delete cascade not null,
  project_id    uuid references public.projects(id) on delete set null,
  campaign_id   uuid references public.ad_campaigns(id) on delete set null,
  title         text not null,
  description   text,
  status        text default 'todo',
  priority      text default 'medium',
  due_date      date,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.project_files (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.users(id) on delete cascade not null,
  project_id    uuid references public.projects(id) on delete cascade not null,
  name          text not null,
  url           text not null,
  size          bigint,
  mime_type     text,
  created_at    timestamptz default now()
);

create table if not exists public.profiles (
  id                uuid references public.users(id) on delete cascade primary key,
  telegram_chat_id  bigint,
  avatar_url        text,
  timezone          text default 'UTC',
  onboarding_done   bool default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ── 2. Add missing columns to existing tables (safe with IF NOT EXISTS) ───────

-- ad_campaigns: ensure user_id exists (may have been created without it)
alter table public.ad_campaigns add column if not exists user_id uuid references public.users(id) on delete cascade;
alter table public.ad_campaigns add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.ad_campaigns add column if not exists goal text;
alter table public.ad_campaigns add column if not exists product text;
alter table public.ad_campaigns add column if not exists audience text;
alter table public.ad_campaigns add column if not exists platforms text[] default '{}';
alter table public.ad_campaigns add column if not exists status text default 'draft';
alter table public.ad_campaigns add column if not exists budget_total numeric(12,2);
alter table public.ad_campaigns add column if not exists budget_spent numeric(12,2) default 0;
alter table public.ad_campaigns add column if not exists updated_at timestamptz default now();

-- ad_creatives: ensure all columns exist
alter table public.ad_creatives add column if not exists user_id uuid references public.users(id) on delete cascade;
alter table public.ad_creatives add column if not exists campaign_id uuid references public.ad_campaigns(id) on delete set null;
alter table public.ad_creatives add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.ad_creatives add column if not exists platform text;
alter table public.ad_creatives add column if not exists format text;
alter table public.ad_creatives add column if not exists title text;
alter table public.ad_creatives add column if not exists hook text;
alter table public.ad_creatives add column if not exists caption text;
alter table public.ad_creatives add column if not exists status text default 'draft';
alter table public.ad_creatives add column if not exists ai_generated bool default true;
alter table public.ad_creatives add column if not exists is_winner bool default false;
alter table public.ad_creatives add column if not exists ctr numeric(5,2);
alter table public.ad_creatives add column if not exists impressions bigint default 0;
alter table public.ad_creatives add column if not exists clicks bigint default 0;
alter table public.ad_creatives add column if not exists updated_at timestamptz default now();

-- ad_platforms
alter table public.ad_platforms add column if not exists user_id uuid references public.users(id) on delete cascade;
alter table public.ad_platforms add column if not exists platform_key text;
alter table public.ad_platforms add column if not exists name text;
alter table public.ad_platforms add column if not exists abbr text;
alter table public.ad_platforms add column if not exists color text;
alter table public.ad_platforms add column if not exists account_id text;
alter table public.ad_platforms add column if not exists access_token text;
alter table public.ad_platforms add column if not exists refresh_token text;
alter table public.ad_platforms add column if not exists is_active bool default true;
alter table public.ad_platforms add column if not exists status text default 'active';
alter table public.ad_platforms add column if not exists updated_at timestamptz default now();

-- ai_agents
alter table public.ai_agents add column if not exists user_id uuid references public.users(id) on delete cascade;
alter table public.ai_agents add column if not exists project_id uuid references public.projects(id) on delete set null;
alter table public.ai_agents add column if not exists name text;
alter table public.ai_agents add column if not exists type text;
alter table public.ai_agents add column if not exists description text;
alter table public.ai_agents add column if not exists commands text[] default '{}';
alter table public.ai_agents add column if not exists is_active bool default true;
alter table public.ai_agents add column if not exists updated_at timestamptz default now();

-- ── 3. Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_ad_campaigns_user     on public.ad_campaigns(user_id);
create index if not exists idx_ad_campaigns_project  on public.ad_campaigns(project_id);
create index if not exists idx_ad_creatives_user     on public.ad_creatives(user_id);
create index if not exists idx_ad_creatives_project  on public.ad_creatives(project_id);
create index if not exists idx_ad_creatives_campaign on public.ad_creatives(campaign_id);
create index if not exists idx_ad_platforms_user     on public.ad_platforms(user_id);
create index if not exists idx_ai_agents_user        on public.ai_agents(user_id);
create index if not exists idx_ai_agents_project     on public.ai_agents(project_id);
create index if not exists idx_tasks_user            on public.tasks(user_id);
create index if not exists idx_project_files_project on public.project_files(project_id);

-- ── 4. Enable RLS (safe to run multiple times) ────────────────────────────────
alter table public.ad_campaigns  enable row level security;
alter table public.ad_creatives  enable row level security;
alter table public.ad_platforms  enable row level security;
alter table public.ai_agents     enable row level security;
alter table public.tasks         enable row level security;
alter table public.project_files enable row level security;
alter table public.profiles      enable row level security;

-- ── 5. RLS policies (drop first so re-running is safe) ────────────────────────
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
