-- Users (расширение Supabase Auth)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  plan text default 'free' check (plan in ('free', 'pro', 'business')),
  ai_tokens_used int default 0,
  created_at timestamptz default now()
);

-- Projects
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  niche text,
  description text,
  audience text,
  tone text default 'friendly' check (tone in ('friendly', 'expert', 'viral', 'premium')),
  language text default 'ru' check (language in ('ru', 'uz', 'en')),
  products text[] default '{}',
  logo_url text,
  is_active bool default true,
  created_at timestamptz default now()
);

-- Contents
create table public.contents (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  type text check (type in ('video', 'post', 'stories', 'ad')),
  platform text check (platform in ('telegram', 'instagram', 'tiktok')),
  goal text,
  title text,
  idea text,
  hook text,
  script jsonb default '[]',
  voiceover text,
  screen_text text,
  caption text,
  hashtags text[] default '{}',
  cta text,
  video_prompt text,
  source_image_url text,
  status text default 'draft' check (status in ('draft','generated','approved','scheduled','published','failed')),
  ai_model text,
  ai_tokens int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Scheduled posts
create table public.scheduled_posts (
  id uuid default gen_random_uuid() primary key,
  content_id uuid references public.contents(id) on delete cascade not null,
  platform text not null,
  scheduled_at timestamptz not null,
  published_at timestamptz,
  status text default 'pending' check (status in ('pending','processing','published','failed')),
  error_message text,
  retry_count int default 0,
  telegram_message_id bigint,
  created_at timestamptz default now()
);

-- Integrations
create table public.integrations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  platform text check (platform in ('telegram', 'instagram', 'tiktok')),
  token text,
  channel_id text,
  channel_name text,
  is_active bool default true,
  last_used_at timestamptz,
  created_at timestamptz default now()
);

-- Campaigns
create table public.campaigns (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text,
  source_image_url text,
  total_posts int default 30,
  status text default 'generating' check (status in ('generating','ready','running','completed')),
  starts_at date,
  created_at timestamptz default now()
);

-- Indexes
create index on public.contents(project_id);
create index on public.contents(status);
create index on public.scheduled_posts(scheduled_at);
create index on public.scheduled_posts(status);

-- RLS
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.contents enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.integrations enable row level security;
alter table public.campaigns enable row level security;

create policy "Users see own profile" on public.users for all using (auth.uid() = id);
create policy "Users see own projects" on public.projects for all using (auth.uid() = user_id);
create policy "Users see own contents" on public.contents for all
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users see own scheduled" on public.scheduled_posts for all
  using (content_id in (select c.id from public.contents c join public.projects p on p.id = c.project_id where p.user_id = auth.uid()));
create policy "Users see own integrations" on public.integrations for all using (auth.uid() = user_id);
create policy "Users see own campaigns" on public.campaigns for all
  using (project_id in (select id from public.projects where user_id = auth.uid()));

-- Trigger: auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
