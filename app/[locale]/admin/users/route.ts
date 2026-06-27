import { query } from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function checkAdmin() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token");
  return adminToken?.value === process.env.ADMIN_SECRET;
}

export async function PATCH(request: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, is_blocked } = await request.json();
  await query("UPDATE users SET is_blocked = $1 WHERE id = $2", [is_blocked, userId]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await request.json();
  await query("UPDATE projects SET is_active = false WHERE user_id = $1", [userId]);
  await query("DELETE FROM contents WHERE user_id = $1", [userId]);
  await query("DELETE FROM integrations WHERE user_id = $1", [userId]);
  await query("DELETE FROM users WHERE id = $1", [userId]);
  return NextResponse.json({ ok: true });
}
