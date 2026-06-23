-- Landing pages
create table if not exists landing_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  slug text unique not null,
  custom_domain text unique,
  published boolean default false,
  blocks jsonb default '[]',
  settings jsonb default '{}',
  template_id text,
  bg_image text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table landing_pages enable row level security;

create policy "users manage own landings" on landing_pages
  for all using (auth.uid() = user_id);

-- Public read for published landings (needed for /l/[slug] page)
create policy "public read published landings" on landing_pages
  for select using (published = true);

-- Leads from landing pages
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  landing_id uuid references landing_pages(id) on delete cascade,
  name text,
  phone text,
  email text,
  created_at timestamptz default now()
);

alter table leads enable row level security;

-- Landing owner can read their leads
create policy "landing owners read leads" on leads
  for select using (
    exists (
      select 1 from landing_pages
      where landing_pages.id = leads.landing_id
        and landing_pages.user_id = auth.uid()
    )
  );

-- Anyone can insert a lead (public form submission)
create policy "public insert leads" on leads
  for insert with check (true);

-- Updated_at trigger
create or replace function update_landing_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger landing_pages_updated_at
  before update on landing_pages
  for each row execute function update_landing_updated_at();
