import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;

async function logPublish(
  contentId: string,
  platform: string,
  status: "published" | "failed",
  error?: string,
  messageId?: number,
) {
  await query(
    "INSERT INTO publish_logs (content_id, platform, status, error_message, telegram_message_id) VALUES ($1, $2, $3, $4, $5)",
    [contentId, platform, status, error || null, messageId || null]
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId, platform } = await request.json();
  if (!contentId) return NextResponse.json({ error: "Missing contentId" }, { status: 400 });

  const content = await queryOne<any>(
    `SELECT c.*, p.user_id as project_user_id FROM contents c
     LEFT JOIN projects p ON c.project_id = p.id
     WHERE c.id = $1 AND (c.user_id = $2 OR p.user_id = $2)`,
    [contentId, user.id]
  );

  if (!content) return NextResponse.json({ error: "Content not found or access denied" }, { status: 404 });

  if (platform === "telegram") {
    const integration = await queryOne<{ channel_id: string }>(
      "SELECT channel_id FROM integrations WHERE platform = 'telegram' AND is_active = true AND user_id = $1 LIMIT 1",
      [user.id]
    );

    if (!integration) {
      return NextResponse.json({ error: "No active Telegram channel. Connect one first." }, { status: 400 });
    }

    const text = `${content.caption || ""}\n\n${(content.hashtags || []).map((h: string) => `#${h}`).join(" ")}`.trim();
    const imageUrl = content.source_image_url;

    const endpoint = imageUrl ? "sendPhoto" : "sendMessage";
    const body = imageUrl
      ? { chat_id: integration.channel_id, photo: imageUrl, caption: text, parse_mode: "HTML" }
      : { chat_id: integration.channel_id, text, parse_mode: "HTML" };

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const tgData = await res.json();

    if (!tgData.ok) {
      await logPublish(contentId, "telegram", "failed", tgData.description);
      await query("UPDATE contents SET status = 'failed', updated_at = NOW() WHERE id = $1", [contentId]);
      return NextResponse.json({ error: tgData.description || "Telegram error" }, { status: 500 });
    }

    const messageId: number = tgData.result.message_id;

    await Promise.all([
      query("UPDATE contents SET status = 'published', telegram_message_id = $1, updated_at = NOW() WHERE id = $2", [String(messageId), contentId]),
      query("UPDATE scheduled_posts SET telegram_message_id = $1, status = 'published', published_at = NOW() WHERE content_id = $2", [messageId, contentId]),
      logPublish(contentId, "telegram", "published", undefined, messageId),
    ]);

    return NextResponse.json({ ok: true, message_id: messageId });
  }

  const makeUrl = process.env.MAKE_WEBHOOK_URL;
  if (makeUrl) {
    try {
      await fetch(makeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          platform,
          caption: content.caption || "",
          hashtags: content.hashtags || [],
          image_url: content.source_image_url || null,
        }),
      });
    } catch {
      // Make.com недоступен — не блокируем
    }
  }

  await query("UPDATE contents SET status = 'published', updated_at = NOW() WHERE id = $1", [contentId]);
  await logPublish(contentId, platform, "published");

  return NextResponse.json({ ok: true, via: "make" });
}
