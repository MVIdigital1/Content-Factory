import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const webhooks = await query("SELECT * FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC", [user.id]);
  return NextResponse.json({ webhooks });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url, name, events, secret } = await request.json();
  if (!url || !name || !events?.length) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const webhooks = await query(
    "INSERT INTO webhooks (user_id, url, name, events, secret, is_active) VALUES ($1, $2, $3, $4, $5, true) RETURNING *",
    [user.id, url, name, events, secret || null]
  );

  return NextResponse.json({ webhook: webhooks[0] });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await query("DELETE FROM webhooks WHERE id = $1 AND user_id = $2", [id, user.id]);
  return NextResponse.json({ ok: true });
}
