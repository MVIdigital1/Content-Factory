import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { full_name, avatar_url } = await request.json();
  const updates: string[] = [];
  const params: any[] = [];
  let i = 1;

  if (full_name !== undefined) { updates.push(`full_name = $${i++}`); params.push(full_name); }
  if (avatar_url !== undefined) { updates.push(`avatar_url = $${i++}`); params.push(avatar_url); }

  if (updates.length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  params.push(user.id);
  await query(`UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${i}`, params);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await query("UPDATE projects SET is_active = false WHERE user_id = $1", [user.id]);
  await query("DELETE FROM contents WHERE user_id = $1", [user.id]);
  await query("DELETE FROM integrations WHERE user_id = $1", [user.id]);
  await query("DELETE FROM users WHERE id = $1", [user.id]);

  const response = NextResponse.json({ ok: true });
  response.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
  return response;
}
