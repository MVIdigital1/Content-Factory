-- ─────────────────────────────────────────────────────────────────────────────
-- Team RBAC Migration
-- Creates workspace_invitations, workspace_roles, team_audit_log tables
-- and extends workspace_members with new columns.
-- ─────────────────────────────────────────────────────────────────────────────

-- workspace_invitations: tracks email invitations sent to join workspaces
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL,
  project_ids   JSONB DEFAULT '[]'::jsonb,
  message       TEXT,
  invited_by    UUID,
  token         TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  status        TEXT DEFAULT 'pending',
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- workspace_roles: stores custom roles defined per workspace
CREATE TABLE IF NOT EXISTS workspace_roles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID,
  name          TEXT NOT NULL,
  description   TEXT,
  color         TEXT DEFAULT '#888888',
  icon          TEXT DEFAULT '🔑',
  is_system     BOOLEAN DEFAULT false,
  permissions   JSONB DEFAULT '[]'::jsonb,
  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- team_audit_log: immutable log of team management actions
CREATE TABLE IF NOT EXISTS team_audit_log (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id  UUID,
  actor_id      UUID,
  actor_email   TEXT,
  action        TEXT NOT NULL,
  target_id     TEXT,
  target_email  TEXT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Extend workspace_members with new columns (safe: IF NOT EXISTS)
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS display_name        TEXT;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS project_ids         JSONB DEFAULT '[]'::jsonb;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS last_active_at      TIMESTAMPTZ;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS joined_at           TIMESTAMPTZ;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS blocked_at          TIMESTAMPTZ;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS role_assigned_by    UUID;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS role_assigned_at    TIMESTAMPTZ DEFAULT NOW();

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON workspace_invitations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email     ON workspace_invitations (email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status    ON workspace_invitations (status);
CREATE INDEX IF NOT EXISTS idx_workspace_roles_workspace       ON workspace_roles (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_roles_is_system       ON workspace_roles (is_system);
CREATE INDEX IF NOT EXISTS idx_team_audit_log_workspace        ON team_audit_log (workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_audit_log_actor            ON team_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_team_audit_log_created_at       ON team_audit_log (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_audit_log        ENABLE ROW LEVEL SECURITY;

-- workspace_invitations: workspace members can read; only owners can insert/update
CREATE POLICY IF NOT EXISTS "workspace_invitations_select"
  ON workspace_invitations FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "workspace_invitations_insert"
  ON workspace_invitations FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "workspace_invitations_update"
  ON workspace_invitations FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "workspace_invitations_delete"
  ON workspace_invitations FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- workspace_roles: workspace members can read; only owners can write
CREATE POLICY IF NOT EXISTS "workspace_roles_select"
  ON workspace_roles FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "workspace_roles_insert"
  ON workspace_roles FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "workspace_roles_update"
  ON workspace_roles FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "workspace_roles_delete"
  ON workspace_roles FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- team_audit_log: read-only for workspace members; insert only (no update/delete)
CREATE POLICY IF NOT EXISTS "team_audit_log_select"
  ON team_audit_log FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "team_audit_log_insert"
  ON team_audit_log FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
    OR actor_id = auth.uid()
  );
