import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.BOT_TOKEN!;
const IG_API = "https://graph.instagram.com/v22.0";

// GET /api/telegram/posts?limit=20
// Returns posts from all connected Telegram channels
// Uses publish_logs + contents from DB (posts WE published)
// Plus fetches real view counts from Telegram Bot API
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);

  // Get connected Telegram channels
  const { data: channels } = await supabase
    .from("integrations")
    .select("channel_id, channel_name")
    .eq("user_id", user.id)
    .eq("platform", "telegram")
    .eq("is_active", true);

  if (!channels?.length) {
    return NextResponse.json({ messages: [] });
  }

  // Get published posts from our DB
  const { data: logs } = await supabase
    .from("publish_logs")
    .select(
      `
      id, created_at, telegram_message_id, platform, status,
      contents (
        id, title, body, image_url, platform
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("platform", "telegram")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!logs?.length) {
    return NextResponse.json({ messages: [] });
  }

  const channelId = channels[0].channel_id;
  const channelName = channels[0].channel_name;

  // Fetch real stats for each post from Telegram
  const messages = await Promise.all(
    logs.map(async (log: any) => {
      let views = 0;
      let forwards = 0;
      let reactions: Record<string, number> = {};

      if (log.telegram_message_id) {
        try {
          // Get message views via forwardMessage trick or getMessageStatistics
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
          const statsData = await statsRes.json();
          if (statsData.ok) {
            views = statsData.result?.views ?? 0;
            forwards = statsData.result?.forwards ?? 0;
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
            reactData.result.reactions.forEach((r: any) => {
              const emoji = r.type?.emoji ?? r.type?.custom_emoji_id ?? "👍";
              reactions[emoji] = (reactions[emoji] ?? 0) + (r.count ?? 0);
            });
          }
        } catch {}
      }

      const content = log.contents as any;
      return {
        id: log.id,
        platform: "telegram",
        text: content?.body ?? content?.title ?? "",
        image_url: content?.image_url ?? null,
        date: log.created_at,
        views,
        shares: forwards,
        reactions,
        url: log.telegram_message_id
          ? `https://t.me/${channelName?.replace("@", "")}/${log.telegram_message_id}`
          : null,
        channel_name: channelName,
        message_id: log.telegram_message_id,
      };
    }),
  );

  return NextResponse.json({ messages });
}
