import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { is_active, config } = await request.json();
  const updates: string[] = [];
  const vals: any[] = [];
  let i = 1;
  if (is_active !== undefined) { updates.push(`is_active = $${i++}`); vals.push(is_active); }
  if (config !== undefined) { updates.push(`config = $${i++}`); vals.push(JSON.stringify(config)); }
  if (!updates.length) return NextResponse.json({ ok: true });
  vals.push(id, user.id);
  await query(`UPDATE ai_agents SET ${updates.join(", ")} WHERE id = $${i++} AND user_id = $${i}`, vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await query("DELETE FROM ai_agents WHERE id = $1 AND user_id = $2", [id, user.id]);
  return NextResponse.json({ ok: true });
}
