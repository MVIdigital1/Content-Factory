import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const content = await queryOne(
    `SELECT c.*, p.name as project_name FROM contents c
     LEFT JOIN projects p ON c.project_id = p.id
     WHERE c.id = $1 AND c.user_id = $2`,
    [id, user.id]
  );
  if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(content);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await request.json();
  const allowed = ["caption", "title", "hook", "hashtags", "cta", "status", "scheduled_at", "platform"];
  const updates: string[] = [];
  const vals: any[] = [];

  for (const key of allowed) {
    if (key in body) {
      vals.push(body[key]);
      updates.push(`${key} = $${vals.length}`);
    }
  }

  if (!updates.length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  vals.push(id, user.id);
  const content = await queryOne(
    `UPDATE contents SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${vals.length - 1} AND user_id = $${vals.length} RETURNING *`,
    vals
  );
  if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(content);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await query("DELETE FROM contents WHERE id = $1 AND user_id = $2", [id, user.id]);
  return NextResponse.json({ ok: true });
}
