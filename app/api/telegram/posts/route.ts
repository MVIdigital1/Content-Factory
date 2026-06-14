import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;

// GET /api/telegram/posts?limit=30
// Reads published posts from contents + publish_logs tables
// Then fetches real view stats from Telegram for each post
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "30"), 50);

  // Get connected Telegram channel
  const { data: integration } = await supabase
    .from("integrations")
    .select("channel_id, channel_name")
    .eq("user_id", user.id)
    .eq("platform", "telegram")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!integration) {
    return NextResponse.json({ messages: [] });
  }

  // Get posts we published via PostCentro (from publish_logs + contents)
  const { data: logs } = await supabase
    .from("publish_logs")
    .select(
      `
      id,
      created_at,
      telegram_message_id,
      platform,
      status,
      content_id,
      contents (
        id, title, body, caption, image_url, platform, content_type
      )
    `,
    )
    .eq("platform", "telegram")
    .eq("status", "published")
    .not("content_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!logs?.length) {
    return NextResponse.json({ messages: [], note: "no_posts_yet" });
  }

  const channelId = integration.channel_id;
  const channelName = integration.channel_name;

  // Fetch real view stats for each post that has a telegram_message_id
  const messages = await Promise.all(
    logs.map(async (log: any) => {
      let views = 0;
      let forwards = 0;
      let reactions: Record<string, number> = {};

      if (log.telegram_message_id) {
        try {
          // getMessageStatistics only works for channels via Bot API
          const statsRes = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getMessageStatistics`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: channelId,
                message_id: log.telegram_message_id,
              }),
            },
          );
          const stats = await statsRes.json();
          if (stats.ok) {
            views = stats.result?.views ?? 0;
            forwards = stats.result?.forwards ?? 0;
          }

          // Get reactions
          const reactRes = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getMessageReactionCount`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: channelId,
                message_id: log.telegram_message_id,
              }),
            },
          );
          const reactData = await reactRes.json();
          if (reactData.ok && reactData.result?.reactions) {
            for (const r of reactData.result.reactions) {
              const emoji = r.type?.emoji ?? "👍";
              reactions[emoji] = (reactions[emoji] ?? 0) + (r.count ?? 0);
            }
          }
        } catch {}
      }

      const content = log.contents as any;
      const text = content?.body ?? content?.caption ?? content?.title ?? "";
      const imageUrl = content?.image_url ?? null;

      return {
        id: log.id,
        content_id: log.content_id,
        message_id: log.telegram_message_id,
        platform: "telegram",
        text,
        image_url: imageUrl,
        date: log.created_at,
        views,
        shares: forwards,
        reactions,
        url:
          log.telegram_message_id && channelName
            ? `https://t.me/${channelName.replace("@", "")}/${log.telegram_message_id}`
            : null,
        channel_name: channelName,
        type: content?.content_type ?? "post",
      };
    }),
  );

  return NextResponse.json({ messages });
}
