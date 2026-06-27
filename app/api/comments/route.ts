import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get("contentId");
  if (!contentId) return NextResponse.json({ error: "Missing contentId" }, { status: 400 });

  const comments = await query(
    "SELECT * FROM comments WHERE content_id = $1 ORDER BY created_at ASC",
    [contentId]
  );
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId, text } = await request.json();
  if (!contentId || !text?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const [comment] = await query(
    "INSERT INTO comments (content_id, user_id, text) VALUES ($1, $2, $3) RETURNING *",
    [contentId, user.id, text.trim()]
  );
  return NextResponse.json({ comment });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await query("DELETE FROM comments WHERE id = $1 AND user_id = $2", [id, user.id]);
  return NextResponse.json({ ok: true });
}
