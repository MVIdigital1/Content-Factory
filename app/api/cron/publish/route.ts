import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Cron secret protection
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: posts, error } = await supabase
    .from("scheduled_posts")
    .select(
      "*, contents(id, title, caption, hashtags, platform, project_id, user_id)",
    )
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .limit(10);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!posts || posts.length === 0) return NextResponse.json({ published: 0 });

  let published = 0;
  let failed = 0;

  for (const post of posts) {
    try {
      const content = post.contents as any;

      if (post.platform === "telegram") {
        // Get integration for the specific user who owns this content
        const { data: integration } = await supabase
          .from("integrations")
          .select("token, channel_id")
          .eq("platform", "telegram")
          .eq("is_active", true)
          .eq("user_id", content?.user_id) // ← только канал владельца контента
          .single();

        if (!integration) throw new Error("No active Telegram channel");

        const text =
          `${content?.caption || ""}\n\n${(content?.hashtags || []).join(" ")}`.trim();

        const res = await fetch(
          `https://api.telegram.org/bot${integration.token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: integration.channel_id,
              text,
              parse_mode: "HTML",
            }),
          },
        );

        const tgData = await res.json();
        if (!tgData.ok) throw new Error(tgData.description || "Telegram error");

        await supabase
          .from("scheduled_posts")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
            telegram_message_id: tgData.result.message_id,
          })
          .eq("id", post.id);

        await supabase
          .from("contents")
          .update({ status: "published" })
          .eq("id", post.content_id);

        published++;
      }
    } catch (err: any) {
      console.error(`Failed to publish post ${post.id}:`, err.message);
      await supabase
        .from("scheduled_posts")
        .update({
          status: "failed",
          error_message: err.message,
          retry_count: (post.retry_count || 0) + 1,
        })
        .eq("id", post.id);
      failed++;
    }
  }

  return NextResponse.json({ published, failed, total: posts.length });
}
