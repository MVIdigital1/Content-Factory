import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await queryOne<{ id: string }>("SELECT id FROM workspaces WHERE owner_id = $1", [user.id]);
  if (!ws) return NextResponse.json([]);

  const roles = await query(
    "SELECT * FROM workspace_roles WHERE workspace_id = $1 AND is_system = false",
    [ws.id]
  );
  return NextResponse.json(roles);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let ws = await queryOne<{ id: string }>("SELECT id FROM workspaces WHERE owner_id = $1", [user.id]);
  if (!ws) {
    ws = await queryOne<{ id: string }>(
      "INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id",
      ["Мой воркспейс", user.id]
    );
  }
  if (!ws) return NextResponse.json({ error: "Workspace error" }, { status: 500 });

  const { name, description, color, icon, permissions } = await request.json();
  const role = await queryOne(
    `INSERT INTO workspace_roles (workspace_id, name, description, color, icon, permissions, is_system, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, false, $7) RETURNING *`,
    [ws.id, name, description, color, icon, JSON.stringify(permissions), user.id]
  );
  return NextResponse.json(role);
}
