import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { NextResponse } from "next/server";

const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.199";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contentId } = await request.json();

  const content = await queryOne<{ id: string; caption: string; hashtags: string[]; source_image_url: string | null }>(
    "SELECT c.id, c.caption, c.hashtags, c.source_image_url FROM contents c JOIN projects p ON c.project_id = p.id WHERE c.id = $1 AND p.user_id = $2",
    [contentId, user.id]
  );
  if (!content) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const integration = await queryOne<{ token: string; channel_id: string }>(
    "SELECT token, channel_id FROM integrations WHERE user_id = $1 AND platform = 'vk' AND is_active = true LIMIT 1",
    [user.id]
  );
  if (!integration) return NextResponse.json({ error: "ВКонтакте не подключён" }, { status: 400 });

  const message = [content.caption || "", (content.hashtags || []).map((h: string) => `#${h}`).join(" ")].filter(Boolean).join("\n\n");

  const params = new URLSearchParams({ owner_id: `-${integration.channel_id}`, message, access_token: integration.token, v: VK_VERSION });
  if (content.source_image_url) params.append("attachments", content.source_image_url);

  const res = await fetch(`${VK_API}/wall.post?${params}`);
  const data = await res.json();

  if (data.error) {
    await query("INSERT INTO publish_logs (content_id, platform, status, error_message) VALUES ($1, 'vk', 'failed', $2)", [contentId, data.error.error_msg]);
    return NextResponse.json({ error: data.error.error_msg }, { status: 500 });
  }

  await Promise.all([
    query("UPDATE contents SET status = 'published' WHERE id = $1", [contentId]),
    query("INSERT INTO publish_logs (content_id, platform, status) VALUES ($1, 'vk', 'published')", [contentId]),
  ]);

  return NextResponse.json({ ok: true, post_id: data.response?.post_id });
}
