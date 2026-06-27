import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const SYSTEM_ROLE_META: Record<string, { label: string; color: string; icon: string }> = {
  owner:         { label: "Владелец",       color: "#FF5A36", icon: "👑" },
  admin:         { label: "Администратор",  color: "#B5740F", icon: "🛡️" },
  manager:       { label: "Менеджер",       color: "#1B5FA8", icon: "💼" },
  content_maker: { label: "Контент-мейкер", color: "#0E6E56", icon: "✍️" },
  analyst:       { label: "Аналитик",       color: "#5A4FBE", icon: "📊" },
  client:        { label: "Клиент",         color: "#6E6557", icon: "👤" },
};

function getRoleMeta(role: string) {
  return SYSTEM_ROLE_META[role] || { label: role, color: "#888888", icon: "🔑" };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownedWs = await query<{ id: string; name: string }>(
    "SELECT id, name FROM workspaces WHERE owner_id = $1",
    [user.id]
  );
  const isOwner = ownedWs.length > 0;

  const memberships = await query<{ workspace_id: string; role: string; project_ids: string[] | null }>(
    "SELECT workspace_id, role, project_ids FROM workspace_members WHERE user_id = $1 AND status = 'active'",
    [user.id]
  );

  const projectCountRow = await queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM projects WHERE user_id = $1 AND is_active = true",
    [user.id]
  );
  const ownerProjectCount = Number(projectCountRow?.count ?? 0);

  const contexts: any[] = [];

  for (const ws of ownedWs) {
    const meta = getRoleMeta("owner");
    contexts.push({
      workspaceId: ws.id,
      workspaceName: ws.name,
      role: "owner",
      roleLabel: meta.label,
      roleColor: meta.color,
      roleIcon: meta.icon,
      projectCount: ownerProjectCount,
    });
  }

  for (const m of memberships) {
    if (contexts.some((c) => c.workspaceId === m.workspace_id)) continue;
    const ws = await queryOne<{ name: string }>(
      "SELECT name FROM workspaces WHERE id = $1",
      [m.workspace_id]
    );
    if (!ws) continue;
    const meta = getRoleMeta(m.role);
    contexts.push({
      workspaceId: m.workspace_id,
      workspaceName: ws.name,
      role: m.role,
      roleLabel: meta.label,
      roleColor: meta.color,
      roleIcon: meta.icon,
      projectCount: m.project_ids ? m.project_ids.length : 0,
    });
  }

  return NextResponse.json({ contexts, isOwner });
}
