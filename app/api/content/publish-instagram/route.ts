import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const IG_API = "https://graph.instagram.com/v22.0";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId } = await request.json();
  if (!contentId) return NextResponse.json({ error: "Missing contentId" }, { status: 400 });

  const content = await queryOne<{ id: string; caption: string; hashtags: string[]; source_image_url: string | null }>(
    "SELECT c.id, c.caption, c.hashtags, c.source_image_url FROM contents c JOIN projects p ON c.project_id = p.id WHERE c.id = $1 AND p.user_id = $2",
    [contentId, user.id]
  );
  if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 });

  const integration = await queryOne<{ token: string; channel_id: string }>(
    "SELECT token, channel_id FROM integrations WHERE user_id = $1 AND platform = 'instagram' AND is_active = true LIMIT 1",
    [user.id]
  );
  if (!integration) return NextResponse.json({ error: "Instagram не подключён. Подключи аккаунт в Интеграциях." }, { status: 400 });

  if (!content.source_image_url) {
    return NextResponse.json({ error: "Instagram требует изображение или видео для публикации. Добавь картинку к посту." }, { status: 400 });
  }

  const caption = [content.caption || "", (content.hashtags || []).map((h: string) => `#${h}`).join(" ")].filter(Boolean).join("\n\n");

  try {
    const containerRes = await fetch(`${IG_API}/${integration.channel_id}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: content.source_image_url, caption, access_token: integration.token }),
    });
    const containerData = await containerRes.json();
    if (containerData.error) throw new Error(containerData.error.message);

    const publishRes = await fetch(`${IG_API}/${integration.channel_id}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerData.id, access_token: integration.token }),
    });
    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(publishData.error.message);

    await Promise.all([
      query("UPDATE contents SET status = 'published' WHERE id = $1", [contentId]),
      query("INSERT INTO publish_logs (content_id, platform, status) VALUES ($1, 'instagram', 'published')", [contentId]),
    ]);

    return NextResponse.json({ ok: true, ig_media_id: publishData.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Instagram publish error";
    await Promise.all([
      query("INSERT INTO publish_logs (content_id, platform, status, error_message) VALUES ($1, 'instagram', 'failed', $2)", [contentId, msg]),
      query("UPDATE contents SET status = 'failed' WHERE id = $1", [contentId]),
    ]);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
