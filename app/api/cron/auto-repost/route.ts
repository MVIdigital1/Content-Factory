import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET!;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Найти посты помеченные для автоповтора (поле auto_repost_days > 0)
  // и опубликованные N+ дней назад
  const { data: postsToRepost } = await supabase
    .from("contents")
    .select("*, projects(user_id, is_active)")
    .eq("status", "published")
    .gt("auto_repost_days", 0)
    .filter(
      "updated_at",
      "lte",
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    )
    .limit(20);

  if (!postsToRepost || postsToRepost.length === 0) {
    return NextResponse.json({ ok: true, rescheduled: 0 });
  }

  let rescheduled = 0;

  for (const post of postsToRepost) {
    const project = post.projects as any;
    if (!project?.is_active) continue;

    const repostInDays = post.auto_repost_days;
    const lastPublished = new Date(post.updated_at);
    const shouldRepostAt = new Date(
      lastPublished.getTime() + repostInDays * 24 * 60 * 60 * 1000,
    );

    if (shouldRepostAt > new Date()) continue;

    // Создать новую запись в scheduled_posts
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // через час

    const { error } = await supabase.from("scheduled_posts").insert({
      content_id: post.id,
      platform: post.platform,
      scheduled_at: scheduledAt,
      status: "pending",
    });

    if (!error) {
      rescheduled++;
      // Сбросить счётчик чтобы не повторять снова сразу
      await supabase
        .from("contents")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", post.id);
    }
  }

  return NextResponse.json({ ok: true, rescheduled });
}
