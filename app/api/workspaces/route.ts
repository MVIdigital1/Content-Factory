import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaces = await query(
    `SELECT w.*, wm.role FROM workspaces w
     JOIN workspace_members wm ON w.id = wm.workspace_id
     WHERE wm.user_id = $1 AND wm.status = 'accepted'
     UNION
     SELECT w.*, 'owner' as role FROM workspaces w WHERE w.owner_id = $1
     ORDER BY created_at DESC`,
    [user.id]
  );
  return NextResponse.json(workspaces);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  const ws = await queryOne(
    "UPDATE workspaces SET name = $1, updated_at = NOW() WHERE owner_id = $2 RETURNING *",
    [name, user.id]
  );
  return NextResponse.json(ws);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  const ws = await queryOne<{ id: string }>(
    "INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING *",
    [name || "Мой воркспейс", user.id]
  );
  return NextResponse.json(ws);
}
