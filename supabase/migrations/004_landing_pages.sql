-- ── landing_pages ────────────────────────────────────────────────────────────
create table if not exists public.landing_pages (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.users(id) on delete cascade not null,
  project_id    uuid references public.projects(id) on delete set null,
  slug          text not null unique,
  title         text not null,
  slogan        text,
  description   text,
  services      text,
  logo_url      text,
  contact_email text,
  contact_phone text,
  contact_link  text,
  template      text not null default '1',
  color         text not null default '#6366f1',
  is_published  bool not null default true,
  views         integer not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── landing_leads — заявки с лендингов ───────────────────────────────────────
create table if not exists public.landing_leads (
  id              uuid default gen_random_uuid() primary key,
  landing_page_id uuid references public.landing_pages(id) on delete cascade not null,
  user_id         uuid references public.users(id) on delete cascade not null,
  name            text,
  phone           text,
  email           text,
  message         text,
  created_at      timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_landing_pages_user    on public.landing_pages(user_id);
create index if not exists idx_landing_pages_slug    on public.landing_pages(slug);
create index if not exists idx_landing_leads_page    on public.landing_leads(landing_page_id);
create index if not exists idx_landing_leads_user    on public.landing_leads(user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.landing_pages enable row level security;
alter table public.landing_leads enable row level security;

drop policy if exists "Own landing_pages" on public.landing_pages;
drop policy if exists "Public read landing_pages" on public.landing_pages;
drop policy if exists "Own landing_leads" on public.landing_leads;
drop policy if exists "Public insert landing_leads" on public.landing_leads;

-- Owner can do anything with their pages
create policy "Own landing_pages"
  on public.landing_pages for all using (auth.uid() = user_id);

-- Anyone can view published landing pages (for public /l/[slug] route)
create policy "Public read landing_pages"
  on public.landing_pages for select using (is_published = true);

-- Owner sees their leads
create policy "Own landing_leads"
  on public.landing_leads for all using (auth.uid() = user_id);

-- Anyone can submit a lead (no auth required)
create policy "Public insert landing_leads"
  on public.landing_leads for insert with check (true);
