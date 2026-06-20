-- Add ai_agent_id to projects so agent is assigned once per project
alter table public.projects
  add column if not exists ai_agent_id uuid references public.ai_agents(id) on delete set null;

create index if not exists idx_projects_ai_agent on public.projects(ai_agent_id);
