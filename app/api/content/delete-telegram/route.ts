import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId } = await request.json();
  if (!contentId) return NextResponse.json({ error: "Missing contentId" }, { status: 400 });

  const scheduledPost = await queryOne<any>(
    `SELECT sp.* FROM scheduled_posts sp
     JOIN contents c ON sp.content_id = c.id
     WHERE sp.content_id = $1 AND c.user_id = $2 AND sp.telegram_message_id IS NOT NULL
     ORDER BY sp.created_at DESC LIMIT 1`,
    [contentId, user.id]
  );

  if (!scheduledPost?.telegram_message_id) {
    return NextResponse.json({ error: "Нет message_id — пост не был опубликован через бота" }, { status: 400 });
  }

  const integration = await queryOne<{ channel_id: string }>(
    "SELECT channel_id FROM integrations WHERE platform = 'telegram' AND is_active = true AND user_id = $1 LIMIT 1",
    [user.id]
  );

  if (!integration) return NextResponse.json({ error: "Нет активного Telegram канала" }, { status: 400 });

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: integration.channel_id, message_id: scheduledPost.telegram_message_id }),
  });

  const tgData = await res.json();

  if (!tgData.ok && tgData.description !== "Bad Request: message to delete not found") {
    return NextResponse.json({ error: tgData.description || "Ошибка удаления из Telegram" }, { status: 500 });
  }

  await Promise.all([
    query("UPDATE contents SET status = 'draft', updated_at = NOW() WHERE id = $1", [contentId]),
    query("UPDATE scheduled_posts SET telegram_message_id = NULL, status = 'failed' WHERE id = $1", [scheduledPost.id]),
  ]);

  return NextResponse.json({ ok: true });
}
