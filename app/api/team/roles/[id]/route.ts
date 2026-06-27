import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ws = await queryOne<{ id: string }>("SELECT id FROM workspaces WHERE owner_id = $1", [user.id]);
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const body = await request.json();
  const allowed = ["name", "description", "color", "icon", "permissions"];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const key of allowed) {
    if (key in body) {
      vals.push(key === "permissions" ? JSON.stringify(body[key]) : body[key]);
      sets.push(`${key} = $${vals.length}`);
    }
  }
  if (!sets.length) return NextResponse.json({ error: "No fields" }, { status: 400 });

  vals.push(id, ws.id);
  const row = await queryOne(
    `UPDATE workspace_roles SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${vals.length - 1} AND workspace_id = $${vals.length} AND is_system = false RETURNING *`,
    vals
  );
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ws = await queryOne<{ id: string }>("SELECT id FROM workspaces WHERE owner_id = $1", [user.id]);
  if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  await query("DELETE FROM workspace_roles WHERE id = $1 AND workspace_id = $2 AND is_system = false", [id, ws.id]);
  return NextResponse.json({ ok: true });
}
