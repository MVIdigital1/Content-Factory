import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await queryOne<{ id: string }>(
    "SELECT id FROM workspaces WHERE owner_id = $1",
    [user.id]
  );
  if (!ws) return NextResponse.json([]);

  const members = await query(
    "SELECT * FROM workspace_members WHERE workspace_id = $1 ORDER BY created_at DESC",
    [ws.id]
  );
  return NextResponse.json(members);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let ws = await queryOne<{ id: string }>(
    "SELECT id FROM workspaces WHERE owner_id = $1",
    [user.id]
  );
  if (!ws) {
    ws = await queryOne<{ id: string }>(
      "INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id",
      ["Мой воркспейс", user.id]
    );
  }
  if (!ws) return NextResponse.json({ error: "Workspace error" }, { status: 500 });

  const body = await request.json();
  const { email, role, project_ids, all_projects } = body;

  const member = await queryOne(
    `INSERT INTO workspace_members (workspace_id, email, role, invited_by, status, project_ids)
     VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING *`,
    [ws.id, email, role, user.id, all_projects ? null : project_ids]
  );
  return NextResponse.json(member);
}
