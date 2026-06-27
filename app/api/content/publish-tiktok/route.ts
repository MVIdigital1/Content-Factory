import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const TIKTOK_API = "https://open.tiktokapis.com/v2";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId } = await request.json();

  const content = await queryOne<{ id: string; caption: string; hashtags: string[]; source_image_url: string | null }>(
    "SELECT c.id, c.caption, c.hashtags, c.source_image_url FROM contents c JOIN projects p ON c.project_id = p.id WHERE c.id = $1 AND p.user_id = $2",
    [contentId, user.id]
  );
  if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const integration = await queryOne<{ token: string }>(
    "SELECT token FROM integrations WHERE user_id = $1 AND platform = 'tiktok' AND is_active = true LIMIT 1",
    [user.id]
  );
  if (!integration) return NextResponse.json({ error: "TikTok не подключён. Требуется Business аккаунт TikTok." }, { status: 400 });

  if (!content.source_image_url) return NextResponse.json({ error: "TikTok требует видео или фото для публикации" }, { status: 400 });

  const caption = [content.caption || "", (content.hashtags || []).map((h: string) => `#${h}`).join(" ")].filter(Boolean).join(" ");

  const initRes = await fetch(`${TIKTOK_API}/post/publish/content/init/`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8", Authorization: `Bearer ${integration.token}` },
    body: JSON.stringify({
      post_info: { title: caption.slice(0, 150), privacy_level: "PUBLIC_TO_EVERYONE", disable_duet: false, disable_comment: false, disable_stitch: false },
      source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: [content.source_image_url] },
    }),
  });
  const initData = await initRes.json();

  if (initData.error?.code !== "ok") {
    await query("INSERT INTO publish_logs (content_id, platform, status, error_message) VALUES ($1, 'tiktok', 'failed', $2)", [contentId, initData.error?.message]);
    return NextResponse.json({ error: initData.error?.message || "TikTok error" }, { status: 500 });
  }

  await Promise.all([
    query("UPDATE contents SET status = 'published' WHERE id = $1", [contentId]),
    query("INSERT INTO publish_logs (content_id, platform, status) VALUES ($1, 'tiktok', 'published')", [contentId]),
  ]);

  return NextResponse.json({ ok: true, publish_id: initData.data?.publish_id });
}
