-- Fix workspace_members table — add missing columns if they don't exist
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS project_ids UUID[] DEFAULT '{}';

-- Add unique constraint if not exists (ignore error if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workspace_members_workspace_id_user_id_key'
  ) THEN
    ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id);
  END IF;
END $$;
