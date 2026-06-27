import { getCurrentUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId } = await request.json();

  const scheduledPost = await queryOne<{ telegram_message_id: number }>(
    `SELECT sp.telegram_message_id FROM scheduled_posts sp
     JOIN contents c ON sp.content_id = c.id
     WHERE sp.content_id = $1 AND c.user_id = $2 AND sp.telegram_message_id IS NOT NULL LIMIT 1`,
    [contentId, user.id]
  );

  if (!scheduledPost?.telegram_message_id) {
    return NextResponse.json({ error: "Нет message_id для этого поста" }, { status: 400 });
  }

  const integration = await queryOne<{ channel_id: string }>(
    "SELECT channel_id FROM integrations WHERE platform = 'telegram' AND is_active = true AND user_id = $1 LIMIT 1",
    [user.id]
  );

  if (!integration) return NextResponse.json({ error: "Нет канала" }, { status: 400 });

  const [res, reactRes] = await Promise.all([
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMessageStatistics`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: integration.channel_id, message_id: scheduledPost.telegram_message_id }),
    }),
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMessageReactionCount`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: integration.channel_id, message_id: scheduledPost.telegram_message_id }),
    }),
  ]);

  const data = await res.json();
  const reactData = await reactRes.json();

  const views = data.result?.views || 0;
  const forwards = data.result?.forwards || 0;
  const reactions = reactData.result?.reactions?.reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;

  return NextResponse.json({ views, forwards, reactions, message_id: scheduledPost.telegram_message_id });
}
