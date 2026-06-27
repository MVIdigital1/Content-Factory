import { query } from "@/lib/db";
import { NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

  const postsToRepost = await query<{ id: string; platform: string; auto_repost_days: number; updated_at: string }>(
    `SELECT c.id, c.platform, c.auto_repost_days, c.updated_at
     FROM contents c
     JOIN projects p ON c.project_id = p.id
     WHERE c.status = 'published' AND c.auto_repost_days > 0 AND c.updated_at <= $1 AND p.is_active = true
     LIMIT 20`,
    [cutoff]
  );

  if (!postsToRepost.length) return NextResponse.json({ ok: true, rescheduled: 0 });

  let rescheduled = 0;
  for (const post of postsToRepost) {
    const lastPublished = new Date(post.updated_at);
    const shouldRepostAt = new Date(lastPublished.getTime() + post.auto_repost_days * 24 * 60 * 60 * 1000);
    if (shouldRepostAt > new Date()) continue;

    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    try {
      await query(
        "INSERT INTO scheduled_posts (content_id, platform, scheduled_at, status) VALUES ($1, $2, $3, 'pending')",
        [post.id, post.platform, scheduledAt]
      );
      await query("UPDATE contents SET updated_at = NOW() WHERE id = $1", [post.id]);
      rescheduled++;
    } catch {}
  }

  return NextResponse.json({ ok: true, rescheduled });
}
