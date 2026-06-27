import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message_id, emoji, action } = await request.json();
  if (!message_id || !emoji) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  if (action === "remove") {
    await query(
      "DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
      [message_id, user.id, emoji]
    );
  } else {
    await query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
      [message_id, user.id, emoji]
    );
  }
  return NextResponse.json({ ok: true });
}
